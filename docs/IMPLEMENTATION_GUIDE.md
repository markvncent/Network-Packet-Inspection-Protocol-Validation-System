# Automata Network Protocol Packet Inspection & Validation System

Complete implementation of pattern matching, DFA visualization, and Aho-Corasick trie-based network packet analysis system with REST API and interactive React visualizers.

## 📋 Overview

This system implements a comprehensive network packet inspection solution with:

### Backend Components

1. **Packet Reader** (`packet_inspection/pcap/`)
   - Loads and parses `.pcap` files using libpcap format
   - Extracts TCP payload bytes from IPv4/IPv6 packets
   - Provides hex and ASCII representations of payloads
   - File: `packet_reader.cpp`/`packet_reader.hpp`

2. **Aho-Corasick Automaton** (`packet_inspection/ac/`)
   - Multi-pattern matching automaton with fail links
   - Builds trie from patterns.json
   - Returns matches with exact positions and step-by-step transitions
   - Exports trie structure to JSON format
   - File: `aho_corasick.cpp`/`aho_corasick.hpp`

3. **DFA Builder** (`packet_inspection/dfa/`)
   - Constructs minimal DFA from multiple patterns
   - Uses subset construction algorithm
   - Supports pattern matching with state transitions
   - Exports to JSON format compatible with frontend visualizer
   - File: `dfa_builder.cpp`/`dfa_builder.hpp`

4. **Patterns Loader** (`packet_inspection/utils/`)
   - Loads patterns from `patterns.json` file
   - Supports categorized patterns (malware, xss, sql, phishing, cmd)
   - Provides flattening for automata construction
   - File: `patterns_loader.cpp`/`patterns_loader.hpp`

5. **HTTP REST API Server** (`src/main.cpp`)
   - Built with Crow framework (header-only C++ web framework)
   - Endpoints:
     - `GET /health` - Health check
     - `GET /patterns` - Returns patterns.json
     - `GET /dfa` - Returns DFA in JSON format
     - `GET /ac-trie` - Returns Aho-Corasick trie in JSON
     - `POST /scan` - Scan hex/ASCII payload
     - `POST /scan-pcap` - Upload and scan PCAP file

### Frontend Components (React + TypeScript)

1. **DfaVisualizer** (`src/components/DfaVisualizer.tsx`)
   - Interactive graph visualization using d3-force simulation
   - Renders DFA states and transitions
   - Shows start state, accepting states, and active state
   - Supports state highlighting and path animation
   - File: `DfaVisualizer.tsx`/`DfaVisualizer.css`

2. **HexView** (`src/components/HexView.tsx`)
   - Displays packet payloads in hex and ASCII format
   - 16 bytes per line with offset addresses
   - Highlights matched pattern bytes
   - Shows matched patterns with positions
   - File: `HexView.tsx`/`HexView.css`

3. **PacketList** (`src/components/PacketList.tsx`)
   - Lists scanned packets with summaries
   - Shows packet ID, size, match count
   - Color-coded severity indicators (safe/warning/critical)
   - Displays matched pattern names with + count
   - File: `PacketList.tsx`/`PacketList.css`

4. **AcTrieVisualizer** (`src/components/AcTrieVisualizer.tsx`)
   - Tree visualization of Aho-Corasick trie
   - Shows nodes with matched patterns (output nodes)
   - Displays fail links as dashed lines
   - Highlights animated edges during pattern matching
   - File: `AcTrieVisualizer.tsx`/`AcTrieVisualizer.css`

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│           Frontend (React + TypeScript)          │
├─────────────────────────────────────────────────┤
│ • DfaVisualizer (d3-force graph)                │
│ • HexView (hex/ASCII payload display)           │
│ • PacketList (packet summaries)                 │
│ • AcTrieVisualizer (trie visualization)         │
└─────────────────────────────────────────────────┘
                        ↕
            HTTP REST API (localhost:8080)
                        ↕
┌─────────────────────────────────────────────────┐
│    Backend (C++ + Crow HTTP Framework)          │
├─────────────────────────────────────────────────┤
│ Packet Reader → DFA/AC Automata → Pattern Matches
│                                                  │
│ • PacketReader: Parse .pcap files               │
│ • AhoCorasick: Multi-pattern matching trie      │
│ • DFABuilder: Pattern matching DFA              │
│ • PatternsLoader: Load patterns.json            │
└─────────────────────────────────────────────────┘
```

## 📁 File Structure

```
backend/
├── include/packet_inspection/
│   ├── pcap/packet_reader.hpp
│   ├── ac/aho_corasick.hpp
│   ├── dfa/dfa_builder.hpp
│   └── utils/patterns_loader.hpp
├── src/
│   ├── main.cpp (HTTP Server)
│   └── packet_inspection/
│       ├── pcap/packet_reader.cpp
│       ├── ac/aho_corasick.cpp
│       ├── dfa/dfa_builder.cpp
│       └── utils/patterns_loader.cpp
├── pcap/patterns.json (Pattern definitions)
└── CMakeLists.txt

frontend/
└── src/components/
    ├── DfaVisualizer.tsx/css
    ├── HexView.tsx/css
    ├── PacketList.tsx/css
    └── AcTrieVisualizer.tsx/css
```

## 🔧 Building & Running

### Backend Setup

#### Prerequisites
- C++20 compiler
- CMake 3.16+
- nlohmann/json library
- Crow framework (header-only)

#### Build
```bash
cd backend
mkdir build
cd build
cmake ..
cmake --build . --config Release
```

#### Run API Server
```bash
./packet_inspection_server
```

Server starts on `http://localhost:8080`

### Frontend Setup

#### Prerequisites
- Node.js 16+
- npm/yarn

#### Install Dependencies
```bash
cd frontend
npm install
```

This installs:
- `d3` - Graph visualization
- `d3-force` - Force-directed layout
- `d3-hierarchy` - Hierarchical layout
- `react` & `react-dom` - React framework
- `gsap` - Animation library
- `ogl` - WebGL library

#### Run Development Server
```bash
npm run dev
```

Frontend runs on `http://localhost:5173`

#### Build for Production
```bash
npm run build
```

## 📊 Data Formats

### DFA JSON Format
```json
{
  "states": ["S0", "S1", "S2", "S3"],
  "start": "S0",
  "accept": ["S3"],
  "transitions": [
    {"from": "S0", "input": "v", "to": "S1"},
    {"from": "S1", "input": "i", "to": "S2"},
    {"from": "S2", "input": "r", "to": "S3"}
  ]
}
```

### AC Trie JSON Format
```json
{
  "nodes": [
    {"id": 0, "fail": 0, "output": []},
    {"id": 1, "fail": 0, "output": ["virus"]},
    {"id": 2, "fail": 0, "output": []}
  ],
  "edges": [
    {"from": 0, "input": "v", "to": 1},
    {"from": 1, "input": "i", "to": 2}
  ]
}
```

### Scan Result Format
```json
{
  "packetId": 0,
  "payloadHex": "476554202f2048...",
  "payloadAscii": "GET / HTTP/1.1...",
  "matches": [
    {"pattern": "UNION SELECT", "position": 145},
    {"pattern": "<script", "position": 289}
  ],
  "steps": [
    {"byte": 71, "char": "G", "nodeId": 1, "outputs": []},
    {"byte": 69, "char": "E", "nodeId": 2, "outputs": []},
    ...
  ]
}
```

## 🎯 API Usage Examples

### Get Patterns
```bash
curl http://localhost:8080/patterns
```

### Get DFA
```bash
curl http://localhost:8080/dfa
```

### Scan Payload
```bash
curl -X POST http://localhost:8080/scan \
  -H "Content-Type: application/json" \
  -d '{
    "payload": "476554",
    "isHex": true,
    "packetId": 0
  }'
```

### Scan PCAP File
```bash
curl -X POST http://localhost:8080/scan-pcap \
  --data-binary @test.pcap
```

## 🎨 Frontend Features

- **Interactive DFA Visualization**
  - Pan and zoom with mouse
  - Drag nodes to rearrange
  - Hover for node details
  - Path highlighting during scanning

- **Hex Payload Analysis**
  - 16 bytes per line display
  - Offset addresses
  - Hover matching pattern details
  - Color-coded match highlighting

- **Packet Summary List**
  - Grid view of scanned packets
  - Severity color coding
  - Pattern tag display
  - Statistics footer

- **Trie Visualization**
  - Tree layout rendering
  - Fail link display
  - Output node highlighting
  - Edge label animation

## 🔍 Pattern Categories (from patterns.json)

- **Malware**: virus, malware, exploit, ransom, trojan, backdoor, rootkit
- **XSS**: \<script, \</script, \<iframe, eval, base64
- **SQL Injection**: ' OR 1, UNION SELECT, DROP TABLE
- **Phishing**: login, verify, password, account
- **Command Injection**: ;r, &&w, |b

## 📈 Performance Characteristics

- **Packet Reader**: O(n) where n = packet size
- **AC Pattern Matching**: O(n + m + z) where n = text length, m = pattern total length, z = match count
- **DFA Pattern Matching**: O(n) where n = text length
- **Memory**: DFA ≈ O(m × α) where m = pattern count, α = alphabet size

## 🚀 Future Enhancements

- [ ] Live packet capture integration with libpcap
- [ ] Real-time streaming analysis
- [ ] Custom pattern editor UI
- [ ] Export scan results to CSV/JSON
- [ ] Batch PCAP processing
- [ ] WebSocket support for live updates
- [ ] Pattern performance benchmarking
- [ ] Advanced filtering and search

## 📝 Notes

- Ensure `patterns.json` is in `backend/pcap/` directory
- All paths in CMakeLists.txt are relative to backend directory
- Frontend requires Node.js 16+ for proper build
- Crow framework is header-only, no separate installation needed
- D3 visualizations are responsive and mobile-friendly

## 🔐 Security Considerations

- Input validation on all API endpoints
- Pattern matching case-insensitive
- Non-printable characters sanitized in ASCII display
- Thread-safe pattern matching with mutexes
- PCAP file validation before processing
