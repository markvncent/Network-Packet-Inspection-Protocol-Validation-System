#include "packet_inspection/dfa/dfa_matcher.hpp"
#include "protocol_validation/http_pda/http_pda_validator.hpp"

#include <iostream>

using automata::packet_inspection::dfa::DfaMatcher;
using automata::protocol_validation::http_pda::HttpPdaValidator;

int main() {
    // Example DFA that matches the literal string "GET".
    DfaMatcher dfa(0);
    dfa.add_transition(0, 'G', 1);
    dfa.add_transition(1, 'E', 2);
    dfa.add_transition(2, 'T', 3);
    dfa.add_accepting_state(3);

    std::cout << "DFA match on 'GET': " << (dfa.matches("GET") ? "true" : "false") << '\n';

    // Example HTTP PDA validation.
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


