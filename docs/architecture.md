# IDS Visualizer Architecture

## Purpose
This system loads PCAP packet captures, extracts TCP/HTTP payloads, and applies
multi-pattern matching using both:

1. Aho–Corasick automaton (production)
2. DFA visualizer (educational)
3. CNF grammar visualizer (optional)

The backend returns:
- matches
- automaton transitions
- matched patterns
- trace steps

React frontend visualizes:
- DFA nodes + edges
- highlight transitions during packet scanning
- hex/ascii payload viewer
- matched patterns list

## Backend Components
### packet_reader.cpp
- Load .pcap file using libpcap
- Extract TCP payload bytes
- Convert to ASCII + hex

### aho_corasic.cpp
- Build AC trie from patterns.json
- Export automaton to JSON
- Run matching on payload

### dfa_builder.cpp
- Convert patterns → DFA (or minimize)
- Export:
    - states
    - transitions
    - accepting states

### server.cpp
- Expose HTTP API:
    GET /patterns
    GET /dfa
    POST /scan
    POST /upload-pcap

## Frontend
### dfaVisualizer.tsx
Receives JSON DFA:
{
  states: [...],
  start: "S0",
  accept: ["S13", ...],
  transitions: [
      {from:"S0", input:"v", to:"S1"}
  ]
}

Displays interactive graph.

### hexView.tsx
Display packet payload hex + ASCII, highlight matched bytes.

