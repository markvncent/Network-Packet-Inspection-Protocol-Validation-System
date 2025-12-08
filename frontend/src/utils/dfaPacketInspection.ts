/**
 * DFA Packet Inspection Engine
 * Automatically detects and processes packet payloads to determine if they are benign or malicious
 * No manual DFA selection - auto-detection based on pattern matching
 */

import { DFAEngine } from './dfaEngine';
import { maliciousPatternDFA, benignTrafficDFA } from './dfa';

export interface PacketInspectionResult {
  isValid: boolean; // true = benign, false = malicious
  classification: 'benign' | 'malicious' | 'unknown';
  matchedPatterns: string[];
  dfaExecutionPath: {
    states: string[];
    transitions: Array<{ from: string; symbol: string; to: string }>;
  };
  confidence: number; // 0.0 - 1.0
  details: {
    payloadSize: number;
    suspiciousIndicators: string[];
    detectedSignatures: string[];
  };
}

/**
 * Extract text payload from packet file or hex string
 */
export const extractPayloadFromPacket = (fileContent: string): string => {
  // Handle hex format (pairs of hex digits)
  if (/^[0-9a-fA-F\s]+$/.test(fileContent.trim())) {
    try {
      const hex = fileContent.replace(/\s/g, '');
      return hex
        .match(/.{1,2}/g)
        ?.map(byte => String.fromCharCode(parseInt(byte, 16)))
        .join('') || '';
    } catch {
      return fileContent;
    }
  }

  // Otherwise treat as text payload
  return fileContent.trim();
};

/**
 * Malicious pattern signatures that definitely indicate attack
 */
const DEFINITE_MALICIOUS_SIGNATURES = [
  'virus',
  'malware',
  'exploit',
  'ransom',
  'eval(',
  'exec(',
  'base64',
  '<script',
  '</script',
  '<iframe',
  'UNION SELECT',
  'union select',
  '; DROP TABLE',
  "'; DROP",
  "' OR '1'='1",
  "' OR 1=1",
  'xp_cmdshell',
  '../../../',
  '..%2f..%2f',
  '${jndi:',
  '%00',
];

/**
 * Benign HTTP method signatures
 */
const BENIGN_SIGNATURES = [
  'GET ',
  'POST ',
  'HEAD ',
  'PUT ',
  'DELETE ',
  'PATCH ',
  'HTTP/1.1',
  'HTTP/2',
  'User-Agent:',
  'Content-Type:',
  'Accept:',
  'Authorization:',
];

/**
 * Analyze payload for malicious indicators without running DFA
 */
const analyzeMaliciousIndicators = (payload: string): {
  indicators: string[];
  score: number;
} => {
  const indicators: string[] = [];
  let score = 0;

  const upperPayload = payload.toUpperCase();
  const lowerPayload = payload.toLowerCase();

  // Check for definite malicious signatures
  DEFINITE_MALICIOUS_SIGNATURES.forEach(sig => {
    if (lowerPayload.includes(sig.toLowerCase())) {
      indicators.push(`Signature detected: ${sig}`);
      score += 25; // High weight for signature detection
    }
  });

  // Check for SQL injection patterns
  if (
    /['"`];|--|\*\/|\/\*|xp_|sp_/i.test(payload) &&
    /(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)/i.test(payload)
  ) {
    indicators.push('SQL injection pattern detected');
    score += 20;
  }

  // Check for command injection patterns
  if (/[;|&$`(){}[\]><].*(?:bash|sh|cmd|powershell|exec|system)/i.test(payload)) {
    indicators.push('Command injection pattern detected');
    score += 20;
  }

  // Check for XSS patterns
  if (/<script[^>]*>|javascript:|onerror=|onload=|onclick=/i.test(payload)) {
    indicators.push('XSS injection pattern detected');
    score += 20;
  }

  // Check for abnormal header sizes
  const headerLines = payload.split('\r\n').filter(l => l.includes(':'));
  headerLines.forEach(line => {
    if (line.length > 1000) {
      indicators.push(`Abnormally long header: ${line.substring(0, 40)}...`);
      score += 10;
    }
  });

  return { indicators, score: Math.min(score, 100) };
};

/**
 * Analyze payload for benign indicators
 */
const analyzeBenignIndicators = (payload: string): {
  indicators: string[];
  score: number;
} => {
  const indicators: string[] = [];
  let score = 0;

  // Check for valid HTTP methods
  BENIGN_SIGNATURES.forEach(sig => {
    if (payload.includes(sig)) {
      indicators.push(`Valid HTTP signature: ${sig.trim()}`);
      score += 15;
    }
  });

  // Check HTTP version
  if (/HTTP\/\d\.\d/.test(payload)) {
    indicators.push('Valid HTTP version detected');
    score += 10;
  }

  // Check for common benign headers
  if (/(?:User-Agent|Content-Type|Accept|Host):/i.test(payload)) {
    indicators.push('Standard HTTP headers present');
    score += 10;
  }

  // Check for absence of malicious indicators
  const upperPayload = payload.toUpperCase();
  const suspiciousCounts = (upperPayload.match(/[;|&$`()]/g) || []).length;
  if (suspiciousCounts < 3) {
    indicators.push('Low suspicious character count');
    score += 10;
  }

  return { indicators, score: Math.min(score, 100) };
};

/**
 * Main packet inspection function
 * Auto-detects whether packet is benign or malicious without user selection
 */
export const inspectPacket = (fileContent: string): PacketInspectionResult => {
  const payload = extractPayloadFromPacket(fileContent);

  if (!payload || payload.length === 0) {
    return {
      isValid: true,
      classification: 'unknown',
      matchedPatterns: [],
      dfaExecutionPath: { states: [], transitions: [] },
      confidence: 0,
      details: {
        payloadSize: 0,
        suspiciousIndicators: ['Empty payload'],
        detectedSignatures: [],
      },
    };
  }

  // Analyze for malicious indicators
  const maliciousAnalysis = analyzeMaliciousIndicators(payload);
  const benignAnalysis = analyzeBenignIndicators(payload);

  // Determine classification based on scores
  let classification: 'benign' | 'malicious' | 'unknown' = 'unknown';
  let isValid = true;
  let confidence = 0;

  if (maliciousAnalysis.score > benignAnalysis.score) {
    classification = 'malicious';
    isValid = false;
    confidence = maliciousAnalysis.score / 100;
  } else if (benignAnalysis.score > maliciousAnalysis.score) {
    classification = 'benign';
    isValid = true;
    confidence = benignAnalysis.score / 100;
  } else if (
    payload.toUpperCase().includes('HTTP/') ||
    /^[A-Z]+\s+\//.test(payload)
  ) {
    // Likely HTTP traffic
    classification = 'benign';
    isValid = true;
    confidence = 0.8;
  } else {
    // Default to benign if unsure
    classification = 'benign';
    isValid = true;
    confidence = 0.5;
  }

  // Now run DFA for detailed state tracking
  const dfaToUse = classification === 'malicious' ? maliciousPatternDFA : benignTrafficDFA;
  const dfaEngine = new DFAEngine(dfaToUse);
  const executionState = dfaEngine.run(payload);

  return {
    isValid,
    classification,
    matchedPatterns: executionState.isAccepting
      ? [
          `Pattern matched: ${
            classification === 'malicious' ? 'Malicious signature' : 'Benign HTTP'
          }`,
        ]
      : [],
    dfaExecutionPath: {
      states: executionState.visited,
      transitions: executionState.transitionsTaken,
    },
    confidence,
    details: {
      payloadSize: payload.length,
      suspiciousIndicators:
        classification === 'malicious'
          ? maliciousAnalysis.indicators
          : [],
      detectedSignatures:
        classification === 'benign'
          ? benignAnalysis.indicators
          : maliciousAnalysis.indicators,
    },
  };
};

/**
 * Read file and return its contents
 */
export const readPacketFile = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const content = e.target?.result;
      if (typeof content === 'string') {
        resolve(content);
      } else if (content instanceof ArrayBuffer) {
        // Handle binary file (PCAP, etc.)
        const decoder = new TextDecoder('utf-8', { fatal: false });
        resolve(decoder.decode(content));
      } else {
        reject(new Error('Unable to read file'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
};
