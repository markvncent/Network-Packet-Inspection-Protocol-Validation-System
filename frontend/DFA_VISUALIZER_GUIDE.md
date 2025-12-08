# DFA Visualizer System - Frontend Implementation Guide

## Overview

A comprehensive, modular DFA (Deterministic Finite Automaton) visualization and simulation system integrated into the Vite-React frontend. Allows interactive pattern matching validation with real-time state tracking and step-by-step execution mode.

## Architecture

The system is organized into **independent, modular layers**:

```
┌─────────────────────────────────────────────┐
│  Results View (ResultsView.tsx)             │  ← High-level integration
│  Container component for inspection results │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│  DFA Visualizer (DFAVisualizer.tsx)         │  ← Interactive UI
│  Input control, step mode, result display   │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│  DFA Engine (dfaEngine.ts)                  │  ← Pure Logic
│  State transitions, execution tracking      │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│  DFA Definitions (dfa.ts)                   │  ← Data Layer
│  States, transitions, malicious patterns    │
└─────────────────────────────────────────────┘

Optional:
┌─────────────────────────────────────────────┐
│  DFA Graph (DFAGraph.tsx)                   │  ← Visualization
│  ReactFlow-based interactive graph          │  (requires: npm install reactflow)
└─────────────────────────────────────────────┘
```

## Module Breakdown

### 1. **DFA Definitions** (`src/utils/dfa.ts`)
Purely declarative - no logic, just data structures.

**Exports:**
- `DFA` interface - Standard mathematical DFA definition
- `maliciousPatternDFA` - Detects: virus, malware, exploit, eval, base64, <script>, </script>, <iframe>, ' OR 1, UNION SELECT, DROP TABLE
- `benignTrafficDFA` - Accepts: GET, POST, HEAD
- `simpleDFA` - Test DFA (accepts "hello")

**Key Properties:**
```typescript
interface DFA {
  states: string[];              // All states (including "dead")
  alphabet: string[];            // Input symbols
  start: string;                 // Starting state
  accept: string[];              // Accepting states
  transition: Record<string, Record<string, string>>;  // δ(q, a) → q'
}
```

**Usage:**
```typescript
import { maliciousPatternDFA } from '../utils/dfa';
```

### 2. **DFA Engine** (`src/utils/dfaEngine.ts`)
Pure, framework-agnostic logic layer. Zero React dependencies.

**Main Class: `DFAEngine`**
```typescript
constructor(dfa: DFA)              // Initialize with a DFA
reset(): void                       // Reset to start state
step(symbol: string): void          // Process one symbol
run(input: string): boolean         // Process full input, return acceptance
getCurrentState(): string
getVisited(): string[]              // All visited states in order
getTransitions(): Array<...>        // All transitions taken with symbols
getExecutionState(): DFAExecutionState  // Full state snapshot
isAccepting(): boolean
isDeadState(): boolean
```

**Execution State Snapshot:**
```typescript
interface DFAExecutionState {
  currentState: string;
  visited: string[];
  isAccepting: boolean;
  inputProcessed: string;
  transitionsTaken: Array<{ from: string; symbol: string; to: string }>;
}
```

**Key Feature:** Tracks entire execution path - every state and transition taken.

**Usage:**
```typescript
import { DFAEngine } from '../utils/dfaEngine';
import { maliciousPatternDFA } from '../utils/dfa';

const engine = new DFAEngine(maliciousPatternDFA);
const isAccepted = engine.run("DROP TABLE users");
const execution = engine.getExecutionState();

// Step-by-step execution:
engine.reset();
engine.step('D');
engine.step('R');
engine.step('O');
console.log(engine.getCurrentState());  // "q_drop_o"
```

### 3. **DFA Visualizer** (`src/components/DFAVisualizer.tsx`)
Interactive React component for user interaction and visualization.

**Features:**
- Real-time input simulation
- Step-by-step execution mode (optional)
- State path visualization
- Transition tracking
- Acceptance result display
- Statistics (input length, states visited, etc.)

**Props:**
```typescript
interface DFAVisualizerProps {
  dfa?: DFA | 'malicious' | 'benign' | 'simple';  // Which DFA to use
  onValidationResult?: (isValid: boolean, state: DFAExecutionState) => void;
  initialInput?: string;
  showDetails?: boolean;
  enableStepMode?: boolean;
}
```

**Usage:**
```typescript
import DFAVisualizer from './DFAVisualizer';

<DFAVisualizer 
  dfa="malicious"
  initialInput="UNION SELECT"
  showDetails={true}
  enableStepMode={true}
  onValidationResult={(isValid, state) => {
    console.log('Pattern matched:', isValid);
    console.log('Path:', state.visited);
  }}
/>
```

**Key Modes:**
1. **Play Mode (Default)** - Instant processing of full input
2. **Step Mode** - Character-by-character navigation with step/back buttons

### 4. **Results View** (`src/components/ResultsView.tsx`)
High-level container integrating DFA visualizer with packet analysis results.

**Props:**
```typescript
interface ResultsViewProps {
  payload?: string;
  validationResults?: {
    isValid: boolean;
    anomalies: string[];
    timestamp: number;
  };
  onReInspect?: () => void;
}
```

**Features:**
- Switchable between malicious/benign DFA
- Displays analyzed payload
- Shows backend validation results
- Lists detected anomalies
- Export and re-inspect actions

**Usage:**
```typescript
import ResultsView from './ResultsView';

<ResultsView 
  payload="payload_here"
  validationResults={{
    isValid: false,
    anomalies: ["SQL Injection", "XSS Pattern"],
    timestamp: Date.now()
  }}
  onReInspect={handleReInspect}
/>
```

### 5. **DFA Graph** (`src/components/DFAGraph.tsx`) - Optional
Interactive state graph visualization using ReactFlow.

**Installation (if using):**
```bash
cd frontend
npm install reactflow
```

**Props:**
```typescript
interface DFAGraphProps {
  dfa: DFA;
  activeState?: string;
  highlightedPath?: string[];
  isAccepting?: boolean;
}
```

**Features:**
- Circular state layout
- Animated path highlighting
- Color-coded states (active, accepting, dead)
- Interactive controls (zoom, pan)

## Integration Points

### MagicBento.tsx (Main Component)
The Results View card is rendered with:
```typescript
<ResultsView 
  payload={uploadedFile ? uploadedFile.name : "No packet loaded"}
  validationResults={undefined}
  onReInspect={() => {
    setDfaStatus('idle');
    setPdaStatus('idle');
  }}
/>
```

## Files Created

| File | Purpose | Lines |
|------|---------|-------|
| `frontend/src/utils/dfa.ts` | DFA definitions and patterns | ~250 |
| `frontend/src/utils/dfaEngine.ts` | DFA execution engine | ~150 |
| `frontend/src/components/DFAVisualizer.tsx` | Interactive visualizer UI | ~250 |
| `frontend/src/components/DFAVisualizer.css` | Visualizer styling | ~300 |
| `frontend/src/components/DFAGraph.tsx` | ReactFlow graph (optional) | ~140 |
| `frontend/src/components/ResultsView.tsx` | Results container | ~130 |
| `frontend/src/components/ResultsView.css` | Results styling | ~350 |

**Total: ~1,570 lines of modular code**

## Detected Malicious Patterns

The `maliciousPatternDFA` detects:

| Category | Patterns |
|----------|----------|
| Malware | virus, malware, exploit, ransom |
| XSS | <script, </script>, <iframe> |
| Code Injection | eval, base64 |
| SQL Injection | ' OR 1, UNION SELECT, DROP TABLE |

## State Coloring Scheme

- **White** - Idle/inactive state
- **Green** - Active state (current) or accepting state
- **Red** - Dead/reject state
- **Gray** - Unvisited regular states
- **Blue with glow** - Currently processing

## Usage Examples

### Example 1: Test DFA with Benign Input
```typescript
import DFAVisualizer from './DFAVisualizer';

export function BenignTest() {
  return (
    <DFAVisualizer 
      dfa="benign"
      initialInput="GET"
      showDetails={true}
    />
  );
}
```

**Expected Result:** ✓ ACCEPT

### Example 2: Test DFA with Malicious Input
```typescript
import DFAVisualizer from './DFAVisualizer';

export function MaliciousTest() {
  return (
    <DFAVisualizer 
      dfa="malicious"
      initialInput="UNION SELECT * FROM users"
      showDetails={true}
      enableStepMode={true}
    />
  );
}
```

**Expected Result:** ✗ REJECT (pattern detected)

### Example 3: Custom DFA
```typescript
import { DFAEngine } from './utils/dfaEngine';
import DFAVisualizer from './DFAVisualizer';

const customDFA = {
  states: ["q0", "q1", "accept"],
  alphabet: ["a", "b"],
  start: "q0",
  accept: ["accept"],
  transition: {
    q0: { a: "q1" },
    q1: { b: "accept" },
    accept: {}
  }
};

export function CustomTest() {
  return (
    <DFAVisualizer 
      dfa={customDFA}
      initialInput="ab"
      showDetails={true}
    />
  );
}
```

## Testing

Each module is independently testable:

```typescript
// Test DFA Engine directly (no React needed)
import { DFAEngine } from '../utils/dfaEngine';
import { maliciousPatternDFA } from '../utils/dfa';

const engine = new DFAEngine(maliciousPatternDFA);

// Test 1: Should accept "virus"
engine.run("virus");
expect(engine.isAccepting()).toBe(true);

// Test 2: Should reject "hello"
engine.run("hello");
expect(engine.isAccepting()).toBe(false);

// Test 3: Should track path
engine.run("DROP TABLE");
expect(engine.getVisited()).toContain("q_drop");
```

## Performance

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| Step transition | O(1) | Hash map lookup |
| Run full input | O(n) | n = input length |
| Get execution state | O(n) | Copy arrays |
| Visual render | O(s²) | s = number of states |

**Optimization:** State transitions use hash maps for O(1) lookups.

## Future Extensions

1. **Add ReactFlow Visualization**
   ```bash
   npm install reactflow
   # Then import and use DFAGraph component
   ```

2. **Custom Pattern Import**
   ```typescript
   function generateDFAFromPatterns(patterns: string[]): DFA {
     // Build trie-based DFA from patterns
   }
   ```

3. **Aho-Corasick Multi-Pattern Matching**
   - More efficient for many patterns
   - Fewer states than individual pattern DFAs

4. **Export Execution Trace**
   ```typescript
   function exportTrace(state: DFAExecutionState): string {
     // Generate detailed report
   }
   ```

5. **Animated Transitions**
   - Highlight state changes in real-time
   - Show symbol consumption animation

## Copilot Integration

This codebase is designed for optimal Copilot autocomplete:

1. **Clear naming** - `step()`, `run()`, `isAccepting()` are self-explanatory
2. **TypeScript interfaces** - Full type hints for better suggestions
3. **JSDoc comments** - Detailed function documentation
4. **Modular structure** - Copilot can predict patterns across modules
5. **Consistent patterns** - Similar methods in engine and components

**Copilot-friendly tasks:**
- Generate new DFA definitions
- Create test cases
- Add visualization features
- Extend pattern detection

## Support

For issues or enhancements:
1. Check component props in TypeScript interfaces
2. Review DFA definitions for pattern coverage
3. Test engine logic independently
4. Validate state transitions with execution state snapshots
