# CNF Pattern Matching Integration - DFA Payload Inspector

## Overview
The pattern matching logic from `pattern_matching.cpp` has been fully integrated into the DFA matcher as the official **packet payload inspection validator**. This integration provides a Chomsky Normal Form (CNF) grammar-based pattern matching system for detecting malicious payloads in network packets.

## Architecture

### Components

#### 1. **CnfGrammar Class**
Implements Chomsky Normal Form grammar construction for pattern matching.

**Key Methods:**
- `build(patterns)` - Builds CNF grammar from malicious pattern list
- `get_rules()` - Returns all production rules
- `print()` - Outputs grammar in human-readable format

**Grammar Structure:**
```
Terminal Rules: T_code -> 'character'
Pattern Rules:  P_n -> T_i T_j (binary productions)
Root Rule:      S -> pattern_1 | pattern_2 | ... | pattern_n
```

#### 2. **PatternMatcher Class**
Uses CNF grammar to detect malicious patterns in network payloads.

**Key Methods:**
- `has_malicious_pattern(payload)` - Boolean check for any malicious pattern
- `get_matched_patterns(payload)` - Returns list of all detected patterns
- `get_grammar()` - Access underlying CNF grammar

**Pattern Detection Features:**
- Case-insensitive matching for common attack vectors
- Substring-based detection with CNF validation framework
- Multi-pattern simultaneous detection
- Detailed anomaly reporting

#### 3. **DfaMatcher Enhancement**
Extended with payload inspection capabilities.

**New Methods:**
- `set_pattern_matcher(matcher)` - Inject pattern matcher instance
- `inspect_payload(payload)` - Check if payload contains malicious patterns
- `get_payload_anomalies(payload)` - List all detected malicious patterns

## Integrated Malicious Patterns

The system detects the following attack vectors:

### 1. **Virus/Malware Signatures**
- `virus`
- `malware`
- `exploit`
- `ransom`

### 2. **XSS (Cross-Site Scripting)**
- `<script`
- `</script`
- `<iframe`

### 3. **Code Injection**
- `base64` (encoding bypass detection)
- `eval` (dynamic code execution)
- `cmd.exe` (Windows command shell)
- `bash -i` (Linux interactive shell)
- `reverse shell`

### 4. **SQL Injection**
- `'; OR 1` (logic bypass)
- `UNION SELECT` (data exfiltration)
- `DROP TABLE` (data destruction)

## Usage Example

```cpp
#include "packet_inspection/dfa/dfa_matcher.hpp"

using automata::packet_inspection::dfa::DfaMatcher;
using automata::packet_inspection::dfa::PatternMatcher;

int main() {
    // Initialize DFA matcher
    DfaMatcher dfa(0);
    
    // Create pattern matcher with malicious signatures
    std::vector<std::string> patterns = {
        "virus", "malware", "<script", "UNION SELECT", "cmd.exe"
    };
    PatternMatcher matcher(patterns);
    
    // Inject pattern matcher into DFA
    dfa.set_pattern_matcher(matcher);
    
    // Inspect packet payload
    std::string payload = "GET /admin?id=1 UNION SELECT * FROM users";
    
    if (dfa.inspect_payload(payload)) {
        auto anomalies = dfa.get_payload_anomalies(payload);
        std::cout << "Malicious payload detected!\n";
        std::cout << "Matched patterns:\n";
        for (const auto& pattern : anomalies) {
            std::cout << "  - " << pattern << "\n";
        }
    }
    
    return 0;
}
```

## Integration Points

### Frontend Integration
The DFA inspection results are exposed via the HTTP API and feed into:
- **DFA Inspection Control** - Displays malicious/benign status
- **Result View** - Shows matched attack patterns with severity indicators

### Backend Flow
```
Packet Received
    ↓
[DfaMatcher::inspect_payload()]
    ↓
[PatternMatcher::has_malicious_pattern()]
    ↓
[CnfGrammar::build(patterns)]
    ↓
Match Detection + Anomaly Reporting
    ↓
HTTP Response with Results
```

## Performance Characteristics

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| Grammar Build | O(n·m) | n patterns, m avg length |
| Pattern Matching | O(p·k) | p payload size, k patterns |
| Anomaly Detection | O(p·k) | Full scan for all patterns |

## Testing

Sample test cases in `main.cpp`:
- ✓ Benign payloads pass inspection
- ✓ SQL injection patterns detected
- ✓ XSS payloads flagged
- ✓ Command injection signatures identified
- ✓ Multiple pattern matching in single payload

## Extension Points

### Adding New Patterns
Simply extend the patterns vector:
```cpp
std::vector<std::string> patterns = {
    // Existing patterns...
    "new_malicious_signature",
    "another_attack_vector"
};
PatternMatcher matcher(patterns);
```

### Custom Pattern Detection
Override `matches_pattern()` in PatternMatcher for regex-based or semantic detection.

### Grammar Optimization
The CNF construction can be optimized for:
- Trie-based pattern matching
- Aho-Corasick multi-pattern algorithm
- State machine optimization

## Files Modified

1. **backend/include/packet_inspection/dfa/dfa_matcher.hpp**
   - Added `CnfGrammar` class definition
   - Added `PatternMatcher` class definition
   - Extended `DfaMatcher` with payload inspection methods

2. **backend/src/packet_inspection/dfa/dfa_matcher.cpp**
   - Implemented full CNF grammar construction
   - Implemented pattern matcher with multi-pattern detection
   - Extended DfaMatcher with payload inspection logic

3. **backend/src/main.cpp**
   - Added comprehensive example usage
   - Demonstrated malicious pattern detection
   - Showed results reporting and anomaly listing

## References

- Original logic: `logic_notes/pattern_matching.cpp`
- CNF Grammar Theory: https://en.wikipedia.org/wiki/Chomsky_normal_form
- Pattern Matching: String algorithms for multi-pattern detection
