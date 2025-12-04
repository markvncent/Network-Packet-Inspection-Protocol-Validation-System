#pragma once

#include <string>
#include <vector>

namespace automata::protocol_validation::http_pda {

// Very simplified PDA-style validator for HTTP-like message structure.
// This is intentionally abstract so you can extend it to full HTTP compliance.
class HttpPdaValidator {
public:
    enum class Result {
        Valid,
        Invalid,
        Incomplete
    };

    // Feed a full HTTP message as a single string for now.
    [[nodiscard]] Result validate(const std::string& http_message);

private:
    // Internal helpers implementing a PDA-like stack discipline for headers.
    bool parse_request_line(const std::string& line);
    bool parse_header_line(const std::string& line);
    bool is_header_continuation(const std::string& line) const;

    std::vector<char> stack_;
};

} // namespace automata::protocol_validation::http_pda


