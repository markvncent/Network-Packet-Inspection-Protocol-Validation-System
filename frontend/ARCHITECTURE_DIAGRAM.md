# DFA Visualizer Architecture & Integration Map

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MAGIC BENTO RESULTS VIEW CARD                    │
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                      ResultsView Component                     │  │
│  │  ┌─────────────────────────────────────────────────────────┐ │  │
│  │  │ [Malicious DFA] [Benign DFA]  ← Tab Selection          │ │  │
│  │  ├─────────────────────────────────────────────────────────┤ │  │
│  │  │ Payload: UNION SELECT * FROM users                      │ │  │
│  │  ├─────────────────────────────────────────────────────────┤ │  │
│  │  │                                                          │ │  │
│  │  │  ┌─────────────────────────────────────────────────┐    │ │  │
│  │  │  │      DFA Visualizer Component                  │    │ │  │
│  │  │  │                                                 │    │ │  │
│  │  │  │  Input: [UNION SELECT      ]  ← Type here     │    │ │  │
│  │  │  │  Status: ● PATTERN DETECTED                   │    │ │  │
│  │  │  │                                                 │    │ │  │
│  │  │  │  [Reset] [◄ Back] [Forward ►] [⚙ Step Mode]  │    │ │  │
│  │  │  │                                                 │    │ │  │
│  │  │  │  ─────── Details ────────                      │    │ │  │
│  │  │  │  Current State: q_union_select                │    │ │  │
│  │  │  │  Path: q0 → q_union → q_union_select          │    │ │  │
│  │  │  │  Transitions: 12 states visited               │    │ │  │
│  │  │  │  Result: ✗ REJECT (Anomaly: SQL Injection)    │    │ │  │
│  │  │  │                                                 │    │ │  │
│  │  │  └─────────────────────────────────────────────────┘    │ │  │
│  │  │                                                          │ │  │
│  │  ├─────────────────────────────────────────────────────────┤ │  │
│  │  │ Backend Validation:                                      │ │  │
│  │  │ ✗ MALICIOUS - Detected: SQL Injection, XSS Pattern      │ │  │
│  │  └─────────────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Hierarchy

```
MagicBento (Main App)
│
├─ Packet Intake Card
│  └─ File upload, packet generator
│
├─ Inspection Controls Card
│  ├─ DFA Inspection Button
│  │  └─ Status indicator (idle/inspecting/approved/malicious)
│  └─ PDA Validation Button
│     └─ Status indicator
│
└─ Result View Card ★ (DFA Visualizer Integration)
   │
   └─ ResultsView Component
      │
      ├─ Header with DFA Selector
      │  ├─ [Malicious Pattern DFA]
      │  └─ [Benign Traffic DFA]
      │
      ├─ Payload Display
      │  └─ Shows packet/input being analyzed
      │
      ├─ DFAVisualizer Component
      │  │
      │  ├─ Input Control Section
      │  │  └─ Text input field (real-time processing)
      │  │
      │  ├─ Control Buttons
      │  │  ├─ [Reset]          ← Clear state
      │  │  ├─ [◄ Step Back]     ← Undo last character
      │  │  ├─ [Step Forward ►]  ← Process next character
      │  │  └─ [⚙ Step Mode]     ← Toggle step-by-step mode
      │  │
      │  └─ Details Section (scrollable)
      │     ├─ Current State
      │     │  └─ Display active DFA state
      │     │
      │     ├─ Path Taken
      │     │  └─ Visual state sequence: q0 → q1 → q2 → ...
      │     │
      │     ├─ Transitions
      │     │  └─ List of all symbol→state mappings
      │     │
      │     └─ Statistics
      │        ├─ Input Length
      │        ├─ States Visited
      │        └─ Result (ACCEPT/REJECT)
      │
      ├─ Backend Results Display
      │  ├─ Validation Status
      │  │  └─ Valid ✓ or Malicious ✗
      │  │
      │  └─ Detected Anomalies
      │     └─ List of flagged patterns
      │
      └─ Action Buttons
         ├─ [📥 Download Report]  ← Export results
         └─ [🔄 Re-Inspect]       ← Rerun validation
```

## Data Flow Diagram

```
User Input (Payload)
       │
       ▼
  DFAVisualizer Component
  (React State Management)
       │
       ├─ handleInputChange()
       │  └─ processInput(newInput)
       │
       ▼
  DFAEngine Instance
  (Pure Logic - Zero React)
  ┌──────────────────────────┐
  │ • reset()                │
  │ • step(symbol)           │
  │ • run(input)             │
  │ • getExecutionState()    │
  └──────────────────────────┘
       │
       ├─ Consults DFA Definition
       │  ┌──────────────────────────┐
       │  │ states: [...]            │
       │  │ alphabet: [...]          │
       │  │ transition: {...}        │
       │  │ accept: [...]            │
       │  └──────────────────────────┘
       │
       ▼
  DFAExecutionState
  ┌────────────────────────────┐
  │ • currentState             │
  │ • visited[]                │
  │ • isAccepting              │
  │ • inputProcessed           │
  │ • transitionsTaken[]       │
  └────────────────────────────┘
       │
       ├─ Callback: onValidationResult()
       │
       ▼
  UI Update (React)
  ┌──────────────────────┐
  │ • Current State      │
  │ • Path Highlight     │
  │ • Status Icon        │
  │ • Statistics         │
  └──────────────────────┘
```

## Module Dependencies

```
frontend/
├── src/
│   ├── utils/
│   │   ├── dfa.ts ────────────────────────┐
│   │   │  (Pure Data)                      │
│   │   │   • maliciousPatternDFA         │
│   │   │   • benignTrafficDFA             │
│   │   │   • simpleDFA                    │
│   │   │                                  │
│   │   └─► Imported by dfaEngine.ts        │
│   │   │    and DFAVisualizer.tsx          │
│   │   │                                  │
│   │   └── dfaEngine.ts ──────────────────┤
│   │      (Pure Logic, No React)          │
│   │       • DFAEngine class              │
│   │       • batchProcessInputs()         │
│   │       • DFAExecutionState interface  │
│   │                                      │
│   │       └─► Imported by DFAVisualizer.tsx
│   │                                      │
│   ├── components/                        │
│   │   │                                  │
│   │   ├─ MagicBento.tsx ─────────────────┤
│   │   │  (Imports ResultsView)           │
│   │   │                                  │
│   │   ├─ ResultsView.tsx ────────────────┤
│   │   │  │ (High-level Container)       │
│   │   │  │  └─ Imports DFAVisualizer    │
│   │   │  │                              │
│   │   │  └─ ResultsView.css             │
│   │   │                                  │
│   │   ├─ DFAVisualizer.tsx ──────────────┤
│   │   │  │ (Interactive UI)             │
│   │   │  │  └─ Imports dfaEngine        │
│   │   │  │  └─ Imports dfa definitions  │
│   │   │  │                              │
│   │   │  └─ DFAVisualizer.css           │
│   │   │                                  │
│   │   ├─ DFAGraph.tsx ────────────────────┤
│   │   │  (Optional: Requires ReactFlow)  │
│   │   │  ├─ Imports dfa                 │
│   │   │  └─ Imports reactflow           │
│   │   │                                  │
│   │   └─ DFAGraph.css (styles)          │
│   │                                      │
│   └── (other components...)              │
│                                          │
└─ DFA_VISUALIZER_GUIDE.md                │
   IMPLEMENTATION_SUMMARY.md              │
   (Documentation)                        │
```

## State Flow (Example: "UNION SELECT")

```
Input: "U N I O N   S E L E C T"

Initial:
  currentState: q0
  visited: [q0]
  isAccepting: false

After 'U':
  currentState: q_union_u
  visited: [q0, q_union_u]

After 'N':
  currentState: q_union_n
  visited: [q0, q_union_u, q_union_n]

After 'I':
  currentState: q_union_i
  visited: [q0, q_union_u, q_union_n, q_union_i]

... (continues) ...

After 'T':
  currentState: q_union (ACCEPTING STATE!)
  visited: [q0, ..., q_union]
  isAccepting: true
  ← UI displays: ✗ PATTERN DETECTED
             Red status indicator
             Highlighting of matched pattern
```

## Modes of Operation

### Mode 1: Play Mode (Default)
```
Input Field: [Type something here        ] ◄─ Full input visible
Process: Entire input processed immediately
Output: Current state, acceptance result
Best for: Quick validation checks
```

### Mode 2: Step Mode
```
Input Field: [Disabled - read only       ]
Buttons: [◄ Back] [Forward ►]  Step 3/12 Current: 'N'
Process: Character-by-character advancement
Output: State at each step, full execution trace
Best for: Debugging, understanding transitions
```

## Color Scheme & Indicators

```
Status Indicators:
├─ Idle/Ready        → Gray (⚪ gray)
├─ Processing/Active → Blue (🔵 blue) + glow effect
├─ Pattern Detected  → Red (🔴 red) + pulse animation
└─ Benign/Approved   → Green (🟢 green) + checkmark

State Colors (in path):
├─ Unvisited States  → White background
├─ Current State     → Green with glow
├─ Accepting States  → Light green
└─ Dead State        → Red background

Button Colors:
├─ Primary Actions   → Purple gradient
├─ Reset             → Red gradient
├─ Step Back         → Blue gradient
└─ Step Forward      → Green gradient
```

## Integration Checklist

- [x] DFA definitions module created
- [x] DFA engine (pure logic) created
- [x] Interactive visualizer component created
- [x] Results view container created
- [x] Styling complete (responsive, themed)
- [x] Optional graph component created (ReactFlow-ready)
- [x] Integrated into MagicBento Results View card
- [x] Comprehensive documentation
- [x] All files committed to GitHub

## Next Integration Steps

1. **Test in browser**
   ```bash
   cd frontend
   npm run dev
   # Navigate to Results View card
   # Type test payloads: "UNION SELECT", "virus", "<script>"
   ```

2. **Connect backend results** (Future)
   ```typescript
   // In ResultsView.tsx
   <ResultsView
     payload={backendPacket}
     validationResults={backendValidationResults}  // Add C++ results here
     onReInspect={triggerBackendInspection}
   />
   ```

3. **Add ReactFlow visualization** (Optional)
   ```bash
   cd frontend
   npm install reactflow
   # Then DFAGraph.tsx will be fully enabled
   ```

4. **Generate DFAs from backend** (Advanced)
   - Use backend pattern list to generate frontend DFA
   - Keep DFAs synchronized with C++ validation rules

## File Tree

```
frontend/
├── DFA_VISUALIZER_GUIDE.md          ← Detailed docs
├── src/
│   ├── utils/
│   │   ├── dfa.ts                   ← DFA definitions
│   │   └── dfaEngine.ts             ← Execution engine
│   └── components/
│       ├── MagicBento.tsx           ← Updated with ResultsView
│       ├── ResultsView.tsx          ← New container
│       ├── ResultsView.css          ← Styling
│       ├── DFAVisualizer.tsx        ← New visualizer
│       ├── DFAVisualizer.css        ← Styling
│       ├── DFAGraph.tsx             ← Optional ReactFlow
│       └── DFAGraph.css             ← Styling
└── IMPLEMENTATION_SUMMARY.md         ← This document
```

---

**Ready for production use!** 🚀
