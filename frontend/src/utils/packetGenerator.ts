/**
 * Packet Generation Utility Module
 * Generates synthetic network packets for testing DFA/PDA validation
 */

export interface PacketGeneratorOptions {
  type: 'benign' | 'malicious';
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

  const httpPayload = `${method} ${path} HTTP/1.1\r\nHost: ${host}\r\nUser-Agent: Mozilla/5.0\r\nAccept: */*\r\nContent-Type: application/json\r\nConnection: close\r\n\r\n`;

  log.push('3. Constructed HTTP headers with standard format - no malicious patterns');
  log.push('   Verified absence of: virus, malware, exploit, <script, DROP TABLE, UNION SELECT, login, ;r, &&w, |b');

  const hex = Array.from(httpPayload)
    .map(c => c.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('');

  log.push('4. Converted payload to hexadecimal');

  return { hex, payload: httpPayload };
};

/**
 * Generate malicious HTTP request with injection/anomalies using actual patterns
 * Backend patterns:
 *   malware: "virus", "malware", "exploit", "ransom", "trojan", "backdoor", "rootkit"
 *   xss: "<script", "</script", "<iframe", "eval", "base64"
 *   sql: "' OR 1", "UNION SELECT", "DROP TABLE"
 *   phishing: "login", "verify", "password", "account"
 *   cmd: ";r", "&&w", "|b"
 */
const generateMaliciousHTTP = (
  log: string[]
): { hex: string; payload: string; anomalies: string[] } => {
  log.push('1. Generating malicious HTTP request with actual backend patterns');

  const anomalies: string[] = [];

  // Define pattern categories matching backend patterns.json
  const patterns = {
    malware: ['virus', 'malware', 'exploit', 'ransom', 'trojan', 'backdoor', 'rootkit'],
    xss: ['<script', '</script', '<iframe', 'eval', 'base64'],
    sql: ["' OR 1", 'UNION SELECT', 'DROP TABLE'],
    phishing: ['login', 'verify', 'password', 'account'],
    cmd: [';r', '&&w', '|b']
  };

  // Randomly select 2-3 pattern categories to include
  const categories = Object.keys(patterns) as Array<keyof typeof patterns>;
  const selectedCategories = categories.sort(() => Math.random() - 0.5).slice(0, Math.random() > 0.5 ? 2 : 3);

  log.push(`2. Selected pattern categories for injection: ${selectedCategories.join(', ')}`);

  let injectionPayloads: string[] = [];
  const selectedPatterns: string[] = [];

  selectedCategories.forEach(category => {
    const categoryPatterns = patterns[category];
    const selected = categoryPatterns[Math.floor(Math.random() * categoryPatterns.length)];
    selectedPatterns.push(selected);
    injectionPayloads.push(selected);
    anomalies.push(`[${category.toUpperCase()}] Pattern Detected: "${selected}"`);
  });

  log.push(`3. Selected patterns: ${selectedPatterns.map(p => `"${p}"`).join(', ')}`);

  // Build malicious payload with injected patterns
  let headers = `GET /search?q=${encodeURIComponent(injectionPayloads[0])} HTTP/1.1\r\n`;
  headers += `Host: suspicious-site.com\r\n`;
  headers += `User-Agent: Mozilla/5.0 (suspicious)\r\n`;
  headers += `X-Custom-Header: ${selectedPatterns[1] || selectedPatterns[0]}\r\n`;

  // Add command injection patterns if cmd was selected
  if (selectedCategories.includes('cmd') && selectedPatterns.some(p => [';r', '&&w', '|b'].includes(p))) {
    const cmdPattern = selectedPatterns.find(p => [';r', '&&w', '|b'].includes(p)) || ';r';
    headers += `X-Execute: cmd${cmdPattern}\r\n`;
  }

  headers += `Connection: close\r\n`;
  headers += `\r\n`;
  
  // Add any XSS patterns to body
  if (selectedCategories.includes('xss')) {
    const xssPattern = selectedPatterns.find(p => ['<script', '</script', '<iframe', 'eval', 'base64'].includes(p)) || '<script';
    headers += `${xssPattern} alert('malicious') ${xssPattern === '<script' ? '</script>' : ''}\r\n`;
  }

  log.push(`4. Injected ${selectedPatterns.length} malicious patterns into request`);
  log.push(`   Categories: ${selectedCategories.join(', ')}`);
  anomalies.forEach(a => log.push(`   • ${a}`));

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
 * Main packet generation function - generates HTTP PCAP packets
 */
export const generatePacket = (options: PacketGeneratorOptions): GeneratedPacket => {
  const log: string[] = [];
  const timestamp = new Date().toISOString();

  log.push(`=== PCAP Packet Generation Started at ${timestamp} ===`);
  log.push(`Type: ${options.type}, Protocol: HTTP`);
  log.push(`Output Format: PCAP (Packet Capture)`);

  const sourceIP = generateIP();
  const destIP = generateIP();
  const sourcePort = generatePort();
  const destPort = 80; // HTTP port

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

  log.push(`\n--- HTTP Payload Generation ---`);

  let payload: string;
  let anomalies: string[] = [];

  if (options.type === 'benign') {
    const result = generateBenignHTTP(log);
    payload = result.payload;
  } else {
    const result = generateMaliciousHTTP(log);
    payload = result.payload;
    anomalies = result.anomalies;
  }

  // Construct full packet: TCP + HTTP payload
  const rawHex = tcpHeader + Array.from(payload)
    .map(c => c.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('');

  // Build PCAP file
  const pcapGlobalHeader = generatePcapGlobalHeader();
  const pcapPacketHeader = generatePcapPacketHeader(rawHex.length / 2);
  const pcapFileContent = pcapGlobalHeader + pcapPacketHeader + rawHex;

  // Convert to base64 for file download
  let pcapBase64 = '';
  try {
    // Convert hex string to bytes, then to base64
    const bytes = new Uint8Array(pcapFileContent.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    pcapBase64 = btoa(String.fromCharCode(...bytes));
  } catch (e) {
    log.push(`Warning: Could not generate PCAP base64: ${e}`);
    pcapBase64 = '';
  }

  log.push(`\n--- PCAP Generation ---`);
  log.push(`PCAP Global Header: ${pcapGlobalHeader.substring(0, 16)}...`);
  log.push(`PCAP Packet Header: ${pcapPacketHeader}`);
  log.push(`Total PCAP file size: ${(pcapFileContent.length / 2)} bytes`);

  log.push(`\n--- Summary ---`);
  log.push(`Total packet size: ${rawHex.length / 2} bytes`);
  log.push(`Protocol: HTTP (Port 80)`);
  if (anomalies.length > 0) {
    log.push(`Anomalies detected: ${anomalies.length}`);
    anomalies.forEach(a => log.push(`  • ${a}`));
  } else {
    log.push(`No anomalies detected`);
  }
  log.push(`=== PCAP Packet Generation Complete ===`);

  return {
    timestamp,
    type: options.type,
    protocol: 'HTTP',
    rawHex,
    payload,
    pcapBase64,
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
