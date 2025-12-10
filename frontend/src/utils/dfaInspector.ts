/**
 * DFA Payload Inspection Module
 * Encapsulates malicious string detection, pattern scanning, and step tracing
 */

import { buildAhoCorasick, ACTrieData } from './ahoCorasick';

export interface PatternMatch {
  pattern: string;
  position: number;
}

export interface MatchStep {
  byte: number;
  character: string;
  nodeId: number;
  outputs: string[];
}

export interface DFAInspectionResult {
  isMalicious: boolean;
  matches: PatternMatch[];
  steps: MatchStep[];
  trieData: ACTrieData;
}

export interface DFAInspectionOptions {
  patterns?: string[];
  caseSensitive?: boolean;
  stepCallback?: (step: MatchStep, currentMatches: PatternMatch[]) => void;
}

/**
 * Default malicious patterns used for DFA inspection
 */
export const DEFAULT_MALICIOUS_PATTERNS = [
  'virus', 'malware', 'exploit', 'ransom', 'trojan', 'backdoor', 'rootkit',
  '<script', '</script', '<iframe', 'eval', 'base64',
  "' OR 1", 'UNION SELECT', 'DROP TABLE',
  'login', 'verify', 'password', 'account',
  ';r', '&&w', '|b'
];

/**
 * DFA Payload Inspector
 * Provides malicious pattern detection using Aho-Corasick automaton
 */
export class DFAInspector {
  private patterns: string[];
  private caseSensitive: boolean;
  private trieData: ACTrieData | null = null;

  constructor(patterns: string[] = DEFAULT_MALICIOUS_PATTERNS, caseSensitive: boolean = false) {
    this.patterns = caseSensitive ? patterns : patterns.map(p => p.toLowerCase());
    this.caseSensitive = caseSensitive;
    this.buildAutomaton();
  }

  /**
   * Build the Aho-Corasick automaton from patterns
   */
  private buildAutomaton(): void {
    this.trieData = buildAhoCorasick(this.patterns);
  }

  /**
   * Get the trie data for visualization
   */
  getTrieData(): ACTrieData | null {
    return this.trieData;
  }

  /**
   * Inspect payload for malicious patterns
   * Returns inspection result with matches and steps
   */
  inspect(payload: Uint8Array, options: DFAInspectionOptions = {}): DFAInspectionResult {
    if (!payload || payload.length === 0) {
      return {
        isMalicious: false,
        matches: [],
        steps: [],
        trieData: this.trieData || buildAhoCorasick(this.patterns)
      };
    }

    const patterns = options.patterns || this.patterns;
    const caseSensitive = options.caseSensitive ?? this.caseSensitive;
    
    // Build automaton with provided patterns or use default
    const trieData = options.patterns 
      ? buildAhoCorasick(caseSensitive ? patterns : patterns.map(p => p.toLowerCase()))
      : (this.trieData || buildAhoCorasick(this.patterns));

    const raw = trieData.rawNodes;
    let state = 0;
    const matches: PatternMatch[] = [];
    const steps: MatchStep[] = [];

    // Scan payload byte by byte
    for (let i = 0; i < payload.length; i++) {
      const b = payload[i];
      const ch = caseSensitive 
        ? String.fromCharCode(b) 
        : String.fromCharCode(b).toLowerCase();
      
      const prevState = state;

      // Follow transitions with fail links
      while (state !== 0 && !raw[state].edges.has(ch)) {
        state = raw[state].fail;
      }
      
      if (raw[state].edges.has(ch)) {
        state = raw[state].edges.get(ch)!;
      }

      // Check for pattern matches at current state
      const outputs = raw[state].output || [];
      
      // Record step
      const step: MatchStep = {
        byte: b,
        character: String.fromCharCode(b),
        nodeId: state,
        outputs: [...outputs]
      };
      steps.push(step);

      // Record matches
      if (outputs.length > 0) {
        for (const pat of outputs) {
          const pos = i - pat.length + 1;
          matches.push({ pattern: pat, position: Math.max(0, pos) });
        }
      }

      // Call step callback if provided
      if (options.stepCallback) {
        options.stepCallback(step, [...matches]);
      }
    }

    return {
      isMalicious: matches.length > 0,
      matches,
      steps,
      trieData
    };
  }

  /**
   * Quick check if payload contains malicious patterns
   */
  hasMaliciousPatterns(payload: Uint8Array): boolean {
    const result = this.inspect(payload);
    return result.isMalicious;
  }

  /**
   * Get matched patterns without full inspection
   */
  getMatchedPatterns(payload: Uint8Array): PatternMatch[] {
    const result = this.inspect(payload);
    return result.matches;
  }

  /**
   * Update patterns and rebuild automaton
   */
  setPatterns(patterns: string[]): void {
    this.patterns = this.caseSensitive ? patterns : patterns.map(p => p.toLowerCase());
    this.buildAutomaton();
  }

  /**
   * Get current patterns
   */
  getPatterns(): string[] {
    return this.patterns;
  }
}

