/**
 * Packet Generation Utility Module
 * Generates synthetic network packets for testing DFA/PDA validation
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
 * Generate valid HTTP request (PDA-compatible)
 * Ensures strict compliance with PDA validation requirements:
 * - Request line: METHOD SPACE URI SPACE HTTP/VERSION CRLF
 * - Headers: HeaderName: HeaderValue CRLF (each header on its own line)
 * - End headers: CRLF CRLF (empty line)
 * - Body: Optional, must match Content-Length if specified
 */
const generateValidHTTP = (payloadType: 'benign' | 'malicious', log: string[]): { hex: string; payload: string } => {
  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'];
  const paths = ['/api/users', '/index.html', '/api/data', '/static/img.png', '/search'];
  const hosts = ['example.com', 'api.example.com', 'cdn.example.com'];

  const method = methods[Math.floor(Math.random() * methods.length)];
  const path = paths[Math.floor(Math.random() * paths.length)];
  const host = hosts[Math.floor(Math.random() * hosts.length)];

  // Build request line: METHOD SPACE URI SPACE HTTP/VERSION CRLF
  // Must start with uppercase method, no leading whitespace
  let httpPayload = `${method} ${path} HTTP/1.1\r\n`;
  
  // Build headers - each header must be: HeaderName: HeaderValue CRLF
  // Header names must start with letter, can contain letters, numbers, hyphens
  // Header values can contain most printable characters
  httpPayload += `Host: ${host}\r\n`;
  httpPayload += `User-Agent: Mozilla/5.0\r\n`;
  httpPayload += `Accept: */*\r\n`;
  httpPayload += `Connection: close\r\n`;

  let bodyContent = '';
  
  // Add body for POST/PUT requests
  if (method === 'POST' || method === 'PUT') {
    if (payloadType === 'malicious') {
      bodyContent = '{"data":"malicious"}';
    } else {
      bodyContent = '{"data":"test"}';
    }
    // Add Content-Length header BEFORE the empty line
    // Value must be exact byte count of body
    httpPayload += `Content-Length: ${bodyContent.length}\r\n`;
  }

  if (payloadType === 'malicious') {
    // Add malicious patterns in headers (ensure header name is valid)
    // Use simple patterns that won't break header parsing
    const maliciousPatterns = ['virus', 'exploit', 'malware'];
    const pattern = maliciousPatterns[Math.floor(Math.random() * maliciousPatterns.length)];
    httpPayload += `X-Custom: ${pattern}\r\n`;
  }

  // End headers with CRLF CRLF (empty line) - this is critical for PDA
  httpPayload += `\r\n`;
  
  // Add body if present (must match Content-Length exactly)
  // No trailing CRLF after body - body ends at Content-Length bytes
  if (bodyContent) {
    httpPayload += bodyContent;
  }

  // Validate the generated payload structure
  // Ensure it starts with HTTP method
  if (!/^[A-Z]+\s/.test(httpPayload)) {
    throw new Error('Generated HTTP payload does not start with valid method');
  }
  
  // Ensure request line ends with CRLF
  const requestLineEnd = httpPayload.indexOf('\r\n');
  if (requestLineEnd === -1) {
    throw new Error('Generated HTTP payload missing CRLF in request line');
  }
  
  // Ensure headers end with CRLF CRLF
  if (httpPayload.indexOf('\r\n\r\n') === -1) {
    throw new Error('Generated HTTP payload missing CRLF CRLF to end headers');
  }

  const hex = Array.from(httpPayload)
    .map(c => c.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('');

  return { hex, payload: httpPayload };
};

/**
 * Generate invalid HTTP request (PDA should reject)
 */
const generateInvalidHTTP = (log: string[]): { hex: string; payload: string } => {
  const invalidTypes = [
    // Missing method
    () => ` /index.html HTTP/1.1\r\nHost: example.com\r\n\r\n`,
    // Missing space after method
    () => `GET/index.html HTTP/1.1\r\nHost: example.com\r\n\r\n`,
    // Invalid version format
    () => `GET /index.html HTTP/2.0\r\nHost: example.com\r\n\r\n`,
    // Missing CRLF after request line
    () => `GET /index.html HTTP/1.1\nHost: example.com\r\n\r\n`,
    // Invalid header format (no colon)
    () => `GET /index.html HTTP/1.1\r\nHost example.com\r\n\r\n`,
    // Missing header value
    () => `GET /index.html HTTP/1.1\r\nHost:\r\n\r\n`,
    // Invalid method (lowercase)
    () => `get /index.html HTTP/1.1\r\nHost: example.com\r\n\r\n`,
    // Missing version
    () => `GET /index.html\r\nHost: example.com\r\n\r\n`,
  ];

  const selectedType = invalidTypes[Math.floor(Math.random() * invalidTypes.length)];
  const httpPayload = selectedType();

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
  
  if (randomType < 0.3) {
    // 30% chance: invalid protocol
    log.push('Generating random invalid HTTP protocol');
    return generateInvalidHTTP(log);
  } else if (randomType < 0.6) {
    // 30% chance: valid HTTP with malicious payload
    log.push('Generating random valid HTTP with malicious payload');
    return generateValidHTTP('malicious', log);
  } else {
    // 40% chance: valid HTTP with benign payload
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

  // Simplified DNS query representation with benign content
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
 * Uses patterns: malware, phishing, cmd injection
 */
const generateMaliciousDNS = (
  log: string[]
): { hex: string; payload: string; anomalies: string[] } => {
  log.push('1. Generating malicious DNS query with backend patterns');

  const anomalies: string[] = [];

  // Use patterns that fit DNS context
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
  // PCAP global header (24 bytes)
  // Magic: 0xa1b2c3d4 (big-endian)
  // Version: 2.4
  // Snaplen: 65535, Network: 1 (Ethernet)
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
    packetType = result.payload.includes('malicious') || result.payload.includes('<script') || result.payload.includes('UNION') ? 'malicious' : 'benign';
    isValidProtocol = result.payload.match(/^[A-Z]+\s+\S+\s+HTTP\/1\.\d\r\n/) !== null;
    if (result.anomalies) {
      anomalies = result.anomalies;
    }
  } else if (options.protocolType === 'invalid') {
    // Invalid protocol
    const result = generateInvalidHTTP(log);
    payload = result.payload;
    isValidProtocol = false;
    packetType = payload.includes('malicious') || payload.includes('<script') ? 'malicious' : 'benign';
    anomalies.push('Invalid HTTP protocol structure');
  } else {
    // Valid protocol with specified payload type
    const payloadType = options.payloadType || 'benign';
    const result = generateValidHTTP(payloadType, log);
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

  return content;
};
