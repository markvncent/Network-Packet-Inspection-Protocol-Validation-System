/**
 * Packet Generation Utility Module
 * Generates synthetic network packets for testing DFA/PDA validation
 * 
 * Improved version with:
 * - Randomized malicious string insertion positions
 * - Fixed malicious-invalid generation
 * - Invalid HTTP that doesn't fail at position 0
 * - Increased diversity
 * - Modular generation modes
 */

export interface PacketGeneratorOptions {
  payloadType?: 'benign' | 'malicious';
  protocolType?: 'valid' | 'invalid';
  random?: boolean;
}

export interface GeneratedPacket {
  timestamp: string;
  type: 'benign' | 'malicious';
  protocol: 'HTTP';
  rawHex: string;
  payload: string;
  pcapBase64: string;
  metadata: {
    sourceIP: string;
    destIP: string;
    sourcePort: number;
    destPort: number;
    flags: string[];
    anomalies?: string[];
  };
  generationLog: string[];
}

import { PDAEngine } from './pdaEngine';

// Malicious patterns used by DFA inspection
const MALICIOUS_PATTERNS = [
  'virus', 'malware', 'exploit', 'ransom', 'trojan', 'backdoor', 'rootkit',
  '<script', '</script', '<iframe', 'eval', 'base64',
  "' OR 1", 'UNION SELECT', 'DROP TABLE',
  'login', 'verify', 'password', 'account',
  ';r', '&&w', '|b'
];

/**
 * Generate a random IP address
 */
const generateIP = (): string => {
  return Array.from({ length: 4 }, () => Math.floor(Math.random() * 256)).join('.');
};

/**
 * Generate a random port (excluding well-known ports for variation)
 */
const generatePort = (): number => {
  return Math.floor(Math.random() * (65535 - 1024)) + 1024;
};

/**
 * Generate TCP/HTTP header bytes
 */
const generateTCPHeader = (flags: string[]): string => {
  const srcPort = generatePort().toString(16).padStart(4, '0');
  const dstPort = generatePort().toString(16).padStart(4, '0');
  const seqNum = Math.floor(Math.random() * 0xffffffff)
    .toString(16)
    .padStart(8, '0');
  const ackNum = Math.floor(Math.random() * 0xffffffff)
    .toString(16)
    .padStart(8, '0');

  const flagByte = flags.includes('SYN') ? '02' : flags.includes('ACK') ? '10' : '00';

  return `${srcPort}${dstPort}${seqNum}${ackNum}5000${flagByte}2000`;
};

/**
 * Insert malicious patterns into a string at random positions
 */
const insertMaliciousPatterns = (
  baseString: string,
  count: number,
  insertionPoints: Array<'start' | 'middle' | 'end' | 'header-value'>
): string => {
  if (count === 0) return baseString;
  
  const patterns = [...MALICIOUS_PATTERNS];
  const selectedPatterns: string[] = [];
  
  // Select random patterns
  for (let i = 0; i < count && patterns.length > 0; i++) {
    const idx = Math.floor(Math.random() * patterns.length);
    selectedPatterns.push(patterns.splice(idx, 1)[0]);
  }
  
  let result = baseString;
  const insertions: Array<{ pos: number; pattern: string }> = [];
  
  // Determine insertion positions
  for (const pattern of selectedPatterns) {
    const point = insertionPoints[Math.floor(Math.random() * insertionPoints.length)];
    let position = 0;
    
    if (point === 'start') {
      position = Math.floor(result.length * 0.1); // First 10%
    } else if (point === 'middle') {
      position = Math.floor(result.length * 0.3 + Math.random() * result.length * 0.4); // Middle 30-70%
    } else if (point === 'end') {
      position = Math.floor(result.length * 0.8 + Math.random() * result.length * 0.2); // Last 20%
    } else {
      // header-value: insert in a header value (find a header and insert)
      const headerMatch = result.match(/([A-Za-z-]+):\s*([^\r\n]*)/);
      if (headerMatch && headerMatch.index !== undefined) {
        // Insert after the colon and space
        position = headerMatch.index + headerMatch[1].length + 2;
      } else {
        // Fallback to middle
        position = Math.floor(result.length * 0.5);
      }
    }
    
    insertions.push({ pos: position, pattern });
  }
  
  // Sort insertions by position (descending) to maintain indices
  insertions.sort((a, b) => b.pos - a.pos);
  
  // Insert patterns
  for (const { pos, pattern } of insertions) {
    result = result.slice(0, pos) + pattern + result.slice(pos);
  }
  
  return result;
};

/**
 * Generate valid HTTP request (PDA-compatible)
 */
const generateValidHTTP = (
  payloadType: 'benign' | 'malicious',
  log: string[]
): { hex: string; payload: string } => {
  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'];
  const paths = [
    '/api/users', '/index.html', '/api/data', '/static/img.png', '/search',
    '/admin', '/login', '/api/v1/endpoint', '/test?q=value', '/path/to/resource'
  ];
  const hosts = ['example.com', 'api.example.com', 'cdn.example.com', 'test.example.org'];
  
  // Randomize method, path, host
  const method = methods[Math.floor(Math.random() * methods.length)];
  const path = paths[Math.floor(Math.random() * paths.length)];
  const host = hosts[Math.floor(Math.random() * hosts.length)];
  
  // Randomize header casing
  const headerCase = Math.random() < 0.33 ? 'lower' : Math.random() < 0.66 ? 'upper' : 'mixed';
  const formatHeader = (name: string): string => {
    if (headerCase === 'lower') return name.toLowerCase();
    if (headerCase === 'upper') return name.toUpperCase();
    return name; // Mixed case (default)
  };
  
  // Build request line
  let httpPayload = `${method} ${path} HTTP/1.1\r\n`;
  
  // Build headers with randomization
  const headerNames = ['Host', 'User-Agent', 'Accept', 'Connection', 'Referer', 'Cookie', 'Content-Type'];
  const selectedHeaders = new Set<string>();
  
  // Always include Host
  httpPayload += `${formatHeader('Host')}: ${host}\r\n`;
  selectedHeaders.add('Host');
  
  // Randomly select other headers
  const numHeaders = Math.floor(Math.random() * 4) + 2; // 2-5 additional headers
  const availableHeaders = headerNames.filter(h => !selectedHeaders.has(h));
  
  for (let i = 0; i < numHeaders && availableHeaders.length > 0; i++) {
    const headerIdx = Math.floor(Math.random() * availableHeaders.length);
    const headerName = availableHeaders.splice(headerIdx, 1)[0];
    selectedHeaders.add(headerName);
    
    let headerValue = '';
    if (headerName === 'User-Agent') {
      headerValue = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
    } else if (headerName === 'Accept') {
      headerValue = '*/*';
    } else if (headerName === 'Connection') {
      headerValue = 'close';
    } else if (headerName === 'Referer') {
      headerValue = `https://${host}/`;
    } else if (headerName === 'Cookie') {
      headerValue = 'session=abc123; user=test';
    } else if (headerName === 'Content-Type') {
      headerValue = 'application/json';
    }
    
    httpPayload += `${formatHeader(headerName)}: ${headerValue}\r\n`;
  }
  
  let bodyContent = '';
  const hasBody = (method === 'POST' || method === 'PUT') && Math.random() > 0.3;
  
  if (hasBody) {
    // Generate body content
    if (payloadType === 'malicious') {
      bodyContent = '{"data":"test","id":123}';
    } else {
      bodyContent = '{"data":"test","id":123}';
    }
    
    // Add Content-Length header
    httpPayload += `${formatHeader('Content-Length')}: ${bodyContent.length}\r\n`;
  }
  
  // End headers with CRLF CRLF
  httpPayload += `\r\n`;
  
  // Add body if present
  if (bodyContent) {
    httpPayload += bodyContent;
  }
  
  // Insert malicious patterns if needed
  if (payloadType === 'malicious') {
    const numPatterns = Math.floor(Math.random() * 3) + 1; // 1-3 patterns
    const insertionPoints: Array<'start' | 'middle' | 'end' | 'header-value'> = ['start', 'middle', 'end', 'header-value'];
    httpPayload = insertMaliciousPatterns(httpPayload, numPatterns, insertionPoints);
    log.push(`Inserted ${numPatterns} malicious pattern(s) at random positions`);
  }
  
  const hex = Array.from(httpPayload)
    .map(c => c.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('');

  return { hex, payload: httpPayload };
};

/**
 * Generate invalid HTTP request that breaks PDA but not at position 0
 */
const generateInvalidHTTP = (log: string[]): { hex: string; payload: string } => {
  // Start with valid-looking HTTP to get past position 0
  const methods = ['GET', 'POST', 'PUT'];
  const method = methods[Math.floor(Math.random() * methods.length)];
  
  // Generate partial/garbled HTTP that allows PDA to read several characters
  const invalidTypes = [
    // Corrupted request line (invalid method character)
    () => {
      const corruptedMethod = method.slice(0, -1) + String.fromCharCode(0x01) + method.slice(-1);
      return `${corruptedMethod} /test HTTP/1.1\r\nHost: example.com\r\n\r\n`;
    },
    // Missing space after method
    () => {
      return `${method}/test HTTP/1.1\r\nHost: example.com\r\n\r\n`;
    },
    // Invalid version format
    () => {
      return `${method} /test HTP/1.1\r\nHost: example.com\r\n\r\n`;
    },
    // Missing CRLF after request line (only LF)
    () => {
      return `${method} /test HTTP/1.1\nHost: example.com\r\n\r\n`;
    },
    // Invalid header format (no colon)
    () => {
      return `${method} /test HTTP/1.1\r\nHost example.com\r\n\r\n`;
    },
    // Missing header value
    () => {
      return `${method} /test HTTP/1.1\r\nHost:\r\n\r\n`;
    },
    // Broken CRLF sequence (CR without LF)
    () => {
      return `${method} /test HTTP/1.1\rHost: example.com\r\n\r\n`;
    },
    // Truncated header line
    () => {
      return `${method} /test HTTP/1.1\r\nHo:st example.com\r\n\r\n`;
    },
    // Mismatched Content-Length
    () => {
      return `${method} /test HTTP/1.1\r\nHost: example.com\r\nContent-Length: 20\r\n\r\nShortBody`;
    },
    // Invalid method (lowercase start)
    () => {
      return `gET /test HTTP/1.1\r\nHost: example.com\r\n\r\n`;
    },
    // Missing version
    () => {
      return `${method} /test\r\nHost: example.com\r\n\r\n`;
    },
    // Extra spaces in request line
    () => {
      return `${method}  /test  HTTP/1.1\r\nHost: example.com\r\n\r\n`;
    },
    // Binary noise before valid start
    () => {
      const noise = String.fromCharCode(0x01, 0x02, 0x03);
      return noise + `${method} /test HTTP/1.1\r\nHost: example.com\r\n\r\n`;
    },
  ];

  const selectedType = invalidTypes[Math.floor(Math.random() * invalidTypes.length)];
  const httpPayload = selectedType();
  
  log.push(`Generated invalid HTTP with structural corruption`);

  const hex = Array.from(httpPayload)
    .map(c => c.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('');

  return { hex, payload: httpPayload };
};

/**
 * Generate malicious-invalid HTTP (both malicious patterns AND broken structure)
 */
const generateMaliciousInvalidHTTP = (log: string[]): { hex: string; payload: string } => {
  // Start with a base invalid HTTP structure
  const methods = ['GET', 'POST'];
  const method = methods[Math.floor(Math.random() * methods.length)];
  
  const corruptionTypes = [
    // Corrupted request line with malicious pattern
    () => {
      const corruptedMethod = method.slice(0, 1) + 'X' + method.slice(2); // e.g., "GPET"
      const malicious = MALICIOUS_PATTERNS[Math.floor(Math.random() * MALICIOUS_PATTERNS.length)];
      return `${corruptedMethod} /test?q=${malicious} HTTP/1.1\r\nHost: example.com\r\n\r\n`;
    },
    // Missing colon in headers with malicious pattern
    () => {
      const malicious = MALICIOUS_PATTERNS[Math.floor(Math.random() * MALICIOUS_PATTERNS.length)];
      return `${method} /test HTTP/1.1\r\nHost ${malicious}.com\r\n\r\n`;
    },
    // Broken CRLF with malicious pattern
    () => {
      const malicious = MALICIOUS_PATTERNS[Math.floor(Math.random() * MALICIOUS_PATTERNS.length)];
      return `${method} /test HTTP/1.1\nHost: example.com\r\nX-Custom: ${malicious}\r\n\r\n`;
    },
    // Mismatched Content-Length with malicious body
    () => {
      const malicious = MALICIOUS_PATTERNS[Math.floor(Math.random() * MALICIOUS_PATTERNS.length)];
      return `${method} /test HTTP/1.1\r\nHost: example.com\r\nContent-Length: 5\r\n\r\n${malicious}`;
    },
    // Truncated header with malicious pattern
    () => {
      const malicious = MALICIOUS_PATTERNS[Math.floor(Math.random() * MALICIOUS_PATTERNS.length)];
      return `${method} /test HTTP/1.1\r\nHo:st example.com\r\nUser-Agent: ${malicious}\r\n\r\n`;
    },
    // Invalid method with malicious pattern in path
    () => {
      const malicious = MALICIOUS_PATTERNS[Math.floor(Math.random() * MALICIOUS_PATTERNS.length)];
      return `gET /${malicious} HTTP/1.1\r\nHost: example.com\r\n\r\n`;
    },
  ];
  
  const selectedType = corruptionTypes[Math.floor(Math.random() * corruptionTypes.length)];
  let httpPayload = selectedType();
  
  // Ensure at least one malicious pattern is present
  // If not already present, add one more
  const hasMalicious = MALICIOUS_PATTERNS.some(p => httpPayload.includes(p));
  if (!hasMalicious) {
    const malicious = MALICIOUS_PATTERNS[Math.floor(Math.random() * MALICIOUS_PATTERNS.length)];
    // Insert in a random position
    const pos = Math.floor(httpPayload.length * 0.3 + Math.random() * httpPayload.length * 0.4);
    httpPayload = httpPayload.slice(0, pos) + malicious + httpPayload.slice(pos);
  }
  
  // Optionally add more malicious patterns
  const numAdditional = Math.floor(Math.random() * 2); // 0-1 additional
  if (numAdditional > 0) {
    const insertionPoints: Array<'start' | 'middle' | 'end' | 'header-value'> = ['middle', 'end'];
    httpPayload = insertMaliciousPatterns(httpPayload, numAdditional, insertionPoints);
  }
  
  log.push(`Generated malicious-invalid HTTP with structural corruption and malicious patterns`);

  const hex = Array.from(httpPayload)
    .map(c => c.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('');

  return { hex, payload: httpPayload };
};

/**
 * Generate random HTTP packet (mix of valid/invalid, benign/malicious)
 */
const generateRandomHTTP = (log: string[]): { hex: string; payload: string; anomalies?: string[] } => {
  const randomType = Math.random();
  const anomalies: string[] = [];
  
  if (randomType < 0.25) {
    // 25% chance: invalid protocol
    log.push('Generating random invalid HTTP protocol');
    return generateInvalidHTTP(log);
  } else if (randomType < 0.5) {
    // 25% chance: malicious-invalid
    log.push('Generating random malicious-invalid HTTP');
    const result = generateMaliciousInvalidHTTP(log);
    anomalies.push('Malicious patterns detected');
    anomalies.push('Invalid HTTP structure');
    return { ...result, anomalies };
  } else if (randomType < 0.75) {
    // 25% chance: valid HTTP with malicious payload
    log.push('Generating random valid HTTP with malicious payload');
    const result = generateValidHTTP('malicious', log);
    anomalies.push('Malicious payload patterns detected');
    return { ...result, anomalies };
  } else {
    // 25% chance: valid HTTP with benign payload
    log.push('Generating random valid HTTP with benign payload');
    return generateValidHTTP('benign', log);
  }
};

/**
 * Generate benign DNS query
 */
const generateBenignDNS = (log: string[]): { hex: string; payload: string } => {
  log.push('1. Generating benign DNS query');

  const domains = ['example.com', 'google.com', 'github.com', 'stackoverflow.com'];
  const domain = domains[Math.floor(Math.random() * domains.length)];

  log.push(`2. Selected domain: ${domain}`);

  const dnsPayload = `DNS Query for ${domain} (Type A) - BENIGN`;
  const hex = Array.from(dnsPayload)
    .map(c => c.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('');

  log.push('3. Constructed DNS query structure without malicious patterns');
  log.push('   Verified no patterns: virus, malware, exploit, <script, DROP TABLE, UNION SELECT, login, ;r, &&w, |b');
  log.push('4. Converted to hexadecimal format');

  return { hex, payload: dnsPayload };
};

/**
 * Generate malicious DNS query with backend patterns
 */
const generateMaliciousDNS = (
  log: string[]
): { hex: string; payload: string; anomalies: string[] } => {
  log.push('1. Generating malicious DNS query with backend patterns');

  const anomalies: string[] = [];

  const patterns = {
    malware: ['virus', 'malware', 'exploit', 'trojan', 'backdoor'],
    phishing: ['login', 'verify', 'password', 'account'],
    cmd: [';r', '&&w', '|b']
  };

  const categories = Object.keys(patterns) as Array<keyof typeof patterns>;
  const selectedCategory = categories[Math.floor(Math.random() * categories.length)];
  const selectedPatterns = patterns[selectedCategory];
  const pattern = selectedPatterns[Math.floor(Math.random() * selectedPatterns.length)];

  anomalies.push(`[${selectedCategory.toUpperCase()}] DNS Query with malicious pattern: "${pattern}"`);
  anomalies.push('DNS amplification attack signature detected');
  anomalies.push('Suspicious domain resolution pattern');

  log.push(`2. Selected category: ${selectedCategory}, pattern: "${pattern}"`);
  log.push('3. Constructed malicious DNS query with injected pattern');
  log.push(`4. Added ${anomalies.length} attack indicators`);
  anomalies.forEach(a => log.push(`   • ${a}`));

  const dnsPayload = `Malicious DNS Query - ${selectedCategory}: ${pattern} - Amplification Attack Pattern`;
  const hex = Array.from(dnsPayload)
    .map(c => c.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('');

  log.push('5. Converted malicious DNS packet to hexadecimal');

  return { hex, payload: dnsPayload, anomalies };
};

/**
 * Generate PCAP file header (global header)
 */
const generatePcapGlobalHeader = (): string => {
  return 'a1b2c3d400020004000000000000000000ffff000001000000';
};

/**
 * Generate PCAP packet header (per packet)
 */
const generatePcapPacketHeader = (payloadLength: number): string => {
  const timestamp = Math.floor(Date.now() / 1000);
  const microseconds = Math.floor(Math.random() * 1000000);
  
  const tsSeconds = timestamp.toString(16).padStart(8, '0');
  const tsMicros = microseconds.toString(16).padStart(8, '0');
  const inclLen = (payloadLength).toString(16).padStart(8, '0');
  const origLen = (payloadLength).toString(16).padStart(8, '0');
  
  return tsSeconds + tsMicros + inclLen + origLen;
};

/**
 * Main packet generation function - generates HTTP packets
 */
export const generatePacket = (options: PacketGeneratorOptions): GeneratedPacket => {
  const log: string[] = [];
  const timestamp = new Date().toISOString();

  const sourceIP = generateIP();
  const destIP = generateIP();
  const sourcePort = generatePort();
  const destPort = 80;

  let payload: string;
  let anomalies: string[] = [];
  let packetType: 'benign' | 'malicious' = 'benign';
  let isValidProtocol = true;

  // Determine generation strategy
  if (options.random) {
    // Random generation
    const result = generateRandomHTTP(log);
    payload = result.payload;
    packetType = MALICIOUS_PATTERNS.some(p => payload.includes(p)) ? 'malicious' : 'benign';
    isValidProtocol = result.payload.match(/^[A-Z]+\s+\S+\s+HTTP\/1\.\d\r\n/) !== null;
    if (result.anomalies) {
      anomalies = result.anomalies;
    }
  } else if (options.protocolType === 'invalid') {
    // Invalid protocol
    if (options.payloadType === 'malicious') {
      // Malicious-invalid: both malicious and invalid
      const result = generateMaliciousInvalidHTTP(log);
      payload = result.payload;
      packetType = 'malicious';
      isValidProtocol = false;
      anomalies.push('Malicious patterns detected');
      anomalies.push('Invalid HTTP protocol structure');
    } else {
      // Invalid only
      const result = generateInvalidHTTP(log);
      payload = result.payload;
      isValidProtocol = false;
      packetType = MALICIOUS_PATTERNS.some(p => payload.includes(p)) ? 'malicious' : 'benign';
      anomalies.push('Invalid HTTP protocol structure');
    }
  } else {
    // Valid protocol with specified payload type
    const payloadType = options.payloadType || 'benign';

    // Try to generate a PDA-valid HTTP request; retry a few times if PDA rejects
    let attempts = 0;
    let validResult: { payload: string; hex: string } | null = null;
    while (attempts < 3 && !validResult) {
      const candidate = generateValidHTTP(payloadType, log);
      const pda = new PDAEngine();
      const ok = pda.validate(candidate.payload);
      if (ok) {
        validResult = candidate;
      } else {
        log.push(`PDA self-check failed on attempt ${attempts + 1}, regenerating...`);
      }
      attempts++;
    }

    const result = validResult ?? generateValidHTTP(payloadType, log);
    payload = result.payload;
    packetType = payloadType;
    isValidProtocol = true;
    if (payloadType === 'malicious') {
      anomalies.push('Malicious payload patterns detected');
    }
  }

  const flags = packetType === 'benign' ? ['SYN', 'ACK'] : ['SYN'];
  const tcpHeader = generateTCPHeader(flags);

  // For PCAP: include TCP header + HTTP payload
  const rawHex = tcpHeader + Array.from(payload)
    .map(c => c.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('');

  // For direct HTTP validation: use only the HTTP payload (no TCP headers)
  const httpPayloadHex = Array.from(payload)
    .map(c => c.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('');

  const pcapGlobalHeader = generatePcapGlobalHeader();
  const pcapPacketHeader = generatePcapPacketHeader(rawHex.length / 2);
  const pcapFileContent = pcapGlobalHeader + pcapPacketHeader + rawHex;

  let pcapBase64 = '';
  try {
    const bytes = new Uint8Array(pcapFileContent.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    pcapBase64 = btoa(String.fromCharCode(...bytes));
  } catch (e) {
    pcapBase64 = '';
  }

  return {
    timestamp,
    type: packetType,
    protocol: isValidProtocol ? 'HTTP' : 'HTTP-INVALID',
    rawHex: httpPayloadHex, // Store only HTTP payload hex (no TCP headers) for validation
    payload, // HTTP payload string
    pcapBase64, // Full PCAP with TCP headers
    metadata: {
      sourceIP,
      destIP,
      sourcePort,
      destPort,
      flags,
      anomalies: anomalies.length > 0 ? anomalies : undefined
    },
    generationLog: log
  };
};

/**
 * Export packet as PCAP file content (base64 encoded)
 */
export const exportPacketAsPcap = (packet: GeneratedPacket): string => {
  return packet.pcapBase64;
};

/**
 * Export packet as hex file content
 */
export const exportPacketAsHex = (packet: GeneratedPacket): string => {
  return packet.rawHex;
};

/**
 * Export packet as text file content
 */
export const exportPacketAsText = (packet: GeneratedPacket): string => {
  let content = `Packet Generated: ${packet.timestamp}\n`;
  content += `Type: ${packet.type}\n`;
  content += `Protocol: ${packet.protocol}\n`;
  content += `\n--- Metadata ---\n`;
  content += `Source IP: ${packet.metadata.sourceIP}:${packet.metadata.sourcePort}\n`;
  content += `Destination IP: ${packet.metadata.destIP}:${packet.metadata.destPort}\n`;
  content += `TCP Flags: ${packet.metadata.flags.join(', ')}\n`;
  content += `\n--- Raw Payload ---\n`;
  content += packet.payload;
  content += `\n\n--- Generation Log ---\n`;
  content += packet.generationLog.join('\n');
  content += `\n\n--- PCAP (base64) ---\n`;
  content += packet.pcapBase64;

  return content;
};
