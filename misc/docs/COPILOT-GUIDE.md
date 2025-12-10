# Copilot Instructions

Your task is to generate code that follows the architecture in architecture.md
using the pattern lists in patterns.json.

## Backend Requirements

### 1. Implement libpcap packet reader
- load any .pcap file
- extract TCP payload bytes
- return raw bytes, hex, ASCII

### 2. Generate Aho-Corasick Automaton
- read patterns.json
- build trie + fail links
- export to JSON
- provide match() function that returns:
    - list of matched patterns
    - positions
    - step-by-step node transitions

### 3. Build a DFA from patterns
- produce a minimal DFA
- export to JSON format described in automata-format.md

### 4. Expose API
Endpoints:
- GET /patterns → patterns.json
- GET /dfa → DFA JSON
- POST /scan-pcap → run matcher on payload
- POST /upload-pcap → upload .pcap file

## Frontend Requirements

### dfaVisualizer.tsx
- render graph from DFA JSON
- visualize active state while scanning

### hexView.tsx
- highlight bytes that match patterns

### packetList.tsx
- show list of packet payload summaries

### acTrieVisualizer.tsx
- render trie
- animate fail transitions and outputs

Follow these rules:
- Typescript + React 18
- Vite project
- Use d3-force for graph layout

Use clean, modular structure.
When unsure, consult architecture.md or automata-format.md.
