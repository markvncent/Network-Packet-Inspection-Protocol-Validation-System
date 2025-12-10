#include "protocol_validation/http_pda/http_pda_validator.hpp"

#include <sstream>

namespace automata::protocol_validation::http_pda {

HttpPdaValidator::Result HttpPdaValidator::validate(const std::string& http_message) {
    stack_.clear();

    std::istringstream stream(http_message);
    std::string line;

    if (!std::getline(stream, line)) {
        return Result::Incomplete;
    }
    if (!parse_request_line(line)) {
        return Result::Invalid;
    }

    bool saw_empty_line = false;
    while (std::getline(stream, line)) {
        if (!line.empty() && line.back() == '\r') {
            line.pop_back();
        }

        if (line.empty()) {
            saw_empty_line = true;
            break;
        }

        if (!parse_header_line(line)) {
            return Result::Invalid;
        }
    }

    if (!saw_empty_line) {
        return Result::Incomplete;
    }

    return Result::Valid;
}

bool HttpPdaValidator::parse_request_line(const std::string& line) {
    std::istringstream iss(line);
    std::string method, path, version;
    if (!(iss >> method >> path >> version)) {
        return false;
    }

    if (version != "HTTP/1.1" && version != "HTTP/1.0") {
        return false;
    }

    stack_.push_back('R');
    return true;
}

bool HttpPdaValidator::parse_header_line(const std::string& line) {
    if (is_header_continuation(line)) {
        if (stack_.empty() || stack_.back() != 'H') {
            return false;
        }
        return true;
    }

    auto colon_pos = line.find(':');
    if (colon_pos == std::string::npos || colon_pos == 0) {
        return false;
    }

    stack_.push_back('H');
    return true;
}

bool HttpPdaValidator::is_header_continuation(const std::string& line) const {
    if (line.empty()) {
        return false;
    }
    char c = line.front();
    return c == ' ' || c == '\t';
}

} // namespace automata::protocol_validation::http_pda


