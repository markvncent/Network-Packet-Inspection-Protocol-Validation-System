/**
 * Packet Generation Utility Module
 * Generates synthetic network packets for testing DFA/PDA validation
 */

export interface PacketGeneratorOptions {
  type: 'benign' | 'malicious';
  protocol?: 'http' | 'tcp' | 'dns';
  payloadSize?: number;
  includeAnomalies?: boolean;
}

export interface GeneratedPacket {
  timestamp: string;
  type: 'benign' | 'malicious';
  protocol: string;
  rawHex: string;
  payload: string;
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
 * Generate benign HTTP GET request
 */
const generateBenignHTTP = (log: string[]): { hex: string; payload: string } => {
  log.push('1. Generating benign HTTP GET request');

  const methods = ['GET', 'POST', 'HEAD'];
  const paths = ['/api/users', '/index.html', '/api/data', '/static/img.png'];
  const hosts = ['example.com', 'api.example.com', 'cdn.example.com'];

  const method = methods[Math.floor(Math.random() * methods.length)];
  const path = paths[Math.floor(Math.random() * paths.length)];
  const host = hosts[Math.floor(Math.random() * hosts.length)];

  log.push(`2. Selected method: ${method}, path: ${path}, host: ${host}`);

  const httpPayload = `${method} ${path} HTTP/1.1\r\nHost: ${host}\r\nUser-Agent: Mozilla/5.0\r\nAccept: */*\r\nConnection: close\r\n\r\n`;

  log.push('3. Constructed HTTP headers with standard format');

  const hex = Array.from(httpPayload)
    .map(c => c.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('');

  log.push('4. Converted payload to hexadecimal');

  return { hex, payload: httpPayload };
};

/**
 * Generate malicious HTTP request with injection/anomalies matching DFA patterns
 */
const generateMaliciousHTTP = (
  log: string[]
): { hex: string; payload: string; anomalies: string[] } => {
  log.push('1. Generating malicious HTTP request with DFA-detectable patterns');

  const anomalies: string[] = [];

  // DFA pattern matching - select from definite malicious signatures
  const dfaMaliciousPatterns = [
    { name: 'virus', payload: 'virus_payload.exe' },
    { name: 'malware', payload: 'malware_detection' },
    { name: 'exploit', payload: 'exploit_kit_payload' },
    { name: 'eval', payload: 'eval(dangerous_code)' },
    { name: 'base64', payload: 'base64_encoded_malware' },
    { name: '<script tag', payload: '<script>alert("xss")</script>' },
    { name: 'SQL injection', payload: "'; DROP TABLE users; --" },
    { name: 'UNION SELECT', payload: 'UNION SELECT * FROM passwords' },
    { name: 'command injection', payload: '; rm -rf /' }
  ];

  const selectedPattern = dfaMaliciousPatterns[Math.floor(Math.random() * dfaMaliciousPatterns.length)];
  anomalies.push(`DFA Pattern Detected: ${selectedPattern.name}`);

  log.push(`2. Selected DFA malicious pattern: ${selectedPattern.name}`);

  // Build malicious HTTP request
  let headers = `GET /search HTTP/1.1\r\n`;
  headers += `Host: example.com\r\n`;
  headers += `User-Agent: Mozilla/5.0\r\n`;

  // Inject the pattern into the request
  if (selectedPattern.name.includes('SQL') || selectedPattern.name.includes('UNION')) {
    headers += `Cookie: id=${selectedPattern.payload}\r\n`;
    anomalies.push('Malicious SQL pattern in cookie');
  } else if (selectedPattern.name === '<script tag') {
    headers += `X-Payload: ${selectedPattern.payload}\r\n`;
    anomalies.push('XSS payload detected in header');
  } else if (selectedPattern.name === 'eval') {
    headers += `X-Custom: eval(${selectedPattern.payload})\r\n`;
    anomalies.push('Code eval function detected');
  } else if (selectedPattern.name === 'base64') {
    headers += `Authorization: Bearer ${selectedPattern.payload}\r\n`;
    anomalies.push('Base64 encoded payload in authorization');
  } else if (selectedPattern.name === 'command injection') {
    headers += `path=/api${selectedPattern.payload}\r\n`;
    anomalies.push('Command injection pattern detected');
  } else {
    // virus, malware, exploit, etc.
    headers += `X-Malware: ${selectedPattern.payload}\r\n`;
    anomalies.push(`${selectedPattern.name} signature detected`);
  }

  headers += `Content-Length: ${selectedPattern.payload.length}\r\n`;
  headers += `Connection: close\r\n\r\n`;

  log.push(`3. Injected malicious pattern into HTTP request`);
  log.push(`4. Added ${anomalies.length} anomalies to packet`);

  const hex = Array.from(headers)
    .map(c => c.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('');

  log.push('5. Converted malicious payload to hexadecimal');

  return { hex, payload: headers, anomalies };
};

/**
 * Generate benign DNS query
 */
const generateBenignDNS = (log: string[]): { hex: string; payload: string } => {
  log.push('1. Generating benign DNS query');

  const domains = ['example.com', 'google.com', 'github.com', 'stackoverflow.com'];
  const domain = domains[Math.floor(Math.random() * domains.length)];

  log.push(`2. Selected domain: ${domain}`);

  // Simplified DNS query representation
  const dnsPayload = `DNS Query for ${domain} (Type A)`;
  const hex = Array.from(dnsPayload)
    .map(c => c.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('');

  log.push('3. Constructed DNS query structure');
  log.push('4. Converted to hexadecimal format');

  return { hex, payload: dnsPayload };
};

/**
 * Generate malicious DNS query (DNS amplification/poisoning)
 */
const generateMaliciousDNS = (
  log: string[]
): { hex: string; payload: string; anomalies: string[] } => {
  log.push('1. Generating malicious DNS query');

  const anomalies: string[] = [];

  // DNS amplification attack pattern
  anomalies.push('DNS query from spoofed source IP');
  anomalies.push('Excessively large DNS response expected');
  anomalies.push('Multiple DNS queries to same resolver');

  log.push('2. Constructed DNS amplification attack pattern');
  log.push('3. Configured spoofed source IP for amplification');
  log.push(`4. Added ${anomalies.length} attack indicators`);

  const dnsPayload = `Malicious DNS Query - Amplification Attack Pattern`;
  const hex = Array.from(dnsPayload)
    .map(c => c.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('');

  log.push('5. Converted malicious DNS packet to hexadecimal');

  return { hex, payload: dnsPayload, anomalies };
};

/**
 * Main packet generation function
 */
export const generatePacket = (options: PacketGeneratorOptions): GeneratedPacket => {
  const log: string[] = [];
  const timestamp = new Date().toISOString();

  log.push(`=== Packet Generation Started at ${timestamp} ===`);
  log.push(`Type: ${options.type}, Protocol: ${options.protocol || 'HTTP'}`);

  const protocol = options.protocol || 'http';
  const sourceIP = generateIP();
  const destIP = generateIP();
  const sourcePort = generatePort();
  const destPort = protocol === 'http' ? 80 : protocol === 'dns' ? 53 : generatePort();

  log.push(`\n--- Network Layer ---`);
  log.push(`Source IP: ${sourceIP}`);
  log.push(`Destination IP: ${destIP}`);
  log.push(`Source Port: ${sourcePort}`);
  log.push(`Destination Port: ${destPort}`);

  log.push(`\n--- TCP Layer ---`);
  const flags = options.type === 'benign' ? ['SYN', 'ACK'] : ['SYN'];
  log.push(`TCP Flags: ${flags.join(', ')}`);
  const tcpHeader = generateTCPHeader(flags);
  log.push(`TCP Header (hex): ${tcpHeader.substring(0, 32)}...`);

  log.push(`\n--- Payload Generation ---`);

  let rawHex = tcpHeader;
  let payload: string;
  let anomalies: string[] = [];

  if (protocol === 'http') {
    if (options.type === 'benign') {
      const result = generateBenignHTTP(log);
      rawHex += result.hex;
      payload = result.payload;
    } else {
      const result = generateMaliciousHTTP(log);
      rawHex += result.hex;
      payload = result.payload;
      anomalies = result.anomalies;
    }
  } else if (protocol === 'dns') {
    if (options.type === 'benign') {
      const result = generateBenignDNS(log);
      rawHex += result.hex;
      payload = result.payload;
    } else {
      const result = generateMaliciousDNS(log);
      rawHex += result.hex;
      payload = result.payload;
      anomalies = result.anomalies;
    }
  } else {
    // Default to HTTP
    const result = generateBenignHTTP(log);
    rawHex += result.hex;
    payload = result.payload;
  }

  log.push(`\n--- Summary ---`);
  log.push(`Total packet size: ${rawHex.length / 2} bytes`);
  if (anomalies.length > 0) {
    log.push(`Anomalies detected: ${anomalies.length}`);
    anomalies.forEach(a => log.push(`  • ${a}`));
  } else {
    log.push(`No anomalies detected`);
  }
  log.push(`=== Packet Generation Complete ===`);

  return {
    timestamp,
    type: options.type,
    protocol,
    rawHex,
    payload,
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

  return content;
};
