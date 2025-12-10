# Modular System Architecture

## Overview
The system has been refactored into clearly separated, modular components for DFA payload inspection and PDA protocol validation.

## Module Structure

### 1. DFA Payload Inspection Module

#### `ahoCorasick.ts`
- **Purpose**: Core Aho-Corasick automaton implementation
- **Exports**:
  - `buildAhoCorasick()` - Builds automaton from patterns
  - `ACTrieData` - Trie data structure for visualization
  - `ACNode` - Internal node structure
- **Responsibilities**:
  - Trie construction
  - Failure link computation
  - Pattern matching automaton

#### `dfaInspector.ts`
- **Purpose**: DFA payload inspection engine
- **Exports**:
  - `DFAInspector` class - Main inspection engine
  - `PatternMatch` - Match result interface
  - `MatchStep` - Step-by-step trace interface
  - `DFAInspectionResult` - Complete inspection result
  - `DEFAULT_MALICIOUS_PATTERNS` - Default pattern set
- **Responsibilities**:
  - Malicious pattern detection
  - Step-by-step inspection
  - Pattern matching logic
  - Match position tracking

#### `dfaInspectorController.ts`
- **Purpose**: Controller for step-by-step DFA inspection simulation
- **Exports**:
  - `DFAInspectorController` class - Simulation controller
  - `DFASimulationState` - Current simulation state
- **Responsibilities**:
  - Step-by-step simulation
  - State management
  - Visualization data preparation
  - Match accumulation

### 2. PDA Protocol Validation Module

#### `pdaEngine.ts`
- **Purpose**: HTTP PDA validation engine
- **Exports**:
  - `PDAEngine` class - Main PDA engine
  - `PDAState` enum - PDA state machine states
  - `PDATrace` interface - Trace entry structure
- **Responsibilities**:
  - HTTP protocol parsing
  - Stack-based structural validation
  - Trace generation
  - Header extraction
  - Body validation

#### `pdaController.ts`
- **Purpose**: Controller for PDA validation
- **Exports**:
  - `PDAController` class - PDA controller wrapper
- **Responsibilities**:
  - Packet loading
  - Validation orchestration
  - Trace access
  - Header access

### 3. Packet Generation Module

#### `packetGenerator.ts`
- **Purpose**: Synthetic packet generation for testing
- **Exports**:
  - `generatePacket()` - Main generation function
  - `PacketGeneratorOptions` - Generation options
  - `GeneratedPacket` - Generated packet structure
- **Responsibilities**:
  - Valid/invalid HTTP generation
  - Malicious pattern insertion
  - PCAP file generation
  - Payload diversity

## Module Interactions

```
MagicBento.tsx (UI Component)
    ├── DFAInspectorController (DFA inspection)
    │   └── DFAInspector
    │       └── buildAhoCorasick()
    │
    └── PDAController (PDA validation)
        └── PDAEngine
```

## Interface Contracts

### DFA Inspection Interface
```typescript
// Load payload
dfaInspectorController.loadPayload(payload: Uint8Array): void

// Run inspection
const result = dfaInspectorController.inspect(): {
  isMalicious: boolean;
  matches: PatternMatch[];
  steps: MatchStep[];
  trieData: ACTrieData;
}

// Step-by-step simulation
const step = dfaInspectorController.step(): MatchStep | null
const state = dfaInspectorController.getState(): DFASimulationState
```

### PDA Validation Interface
```typescript
// Load packet
pdaController.loadPacket(data: string): boolean

// Validate
const isValid = pdaController.validate(): boolean

// Get trace
const trace = pdaController.getAllTrace(): PDATrace[]

// Get headers
const headers = pdaController.getHeaders(): Map<string, string>
```

## Benefits of Modularization

1. **Separation of Concerns**: DFA and PDA logic are completely independent
2. **Testability**: Each module can be tested independently
3. **Maintainability**: Changes to one module don't affect the other
4. **Reusability**: Modules can be used in other contexts
5. **Readability**: Clear boundaries and responsibilities
6. **Extensibility**: Easy to add new features to each module

## Testing

Each module can be tested independently:

- **DFA Inspector**: Test pattern matching, step generation, match detection
- **PDA Engine**: Test HTTP parsing, stack operations, validation rules
- **Controllers**: Test simulation, state management, interface contracts

## Future Enhancements

- Backend API integration for DFA inspection
- Pattern management system
- Custom pattern sets per inspection
- Performance optimizations
- Additional protocol validators (beyond HTTP)

