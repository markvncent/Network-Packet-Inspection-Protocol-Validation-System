#include "packet_inspection/dfa/dfa_matcher.hpp"
#include <iostream>
#include <algorithm>
#include <cctype>

namespace automata::packet_inspection::dfa {

// ============================================================================
// CnfGrammar Implementation
// ============================================================================

void CnfGrammar::build(const std::vector<std::string>& patterns) {
    rules_.clear();
    term_var_.clear();
    pattern_roots_.clear();
    next_term_id_ = 1;
    next_bin_id_ = 1;

    // Create terminal variable for each character in patterns
    for (const auto& p : patterns) {
        std::string root = make_pattern_root_name(p);
        build_pattern_cnf(p, root);
        pattern_roots_.push_back(root);
    }

    // Combine all pattern roots under S using binary tree
    if (pattern_roots_.empty()) {
        return;
    } else if (pattern_roots_.size() == 1) {
        rename_variable(pattern_roots_[0], "S");
        pattern_roots_[0] = "S";
    } else {
        build_binary_tree("S", pattern_roots_);
    }
}

void CnfGrammar::print() const {
    for (const auto& p : rules_) {
        std::cout << p.lhs << " -> ";
        if (p.rhs.size() == 1) {
            std::cout << "'" << escape_printable(p.rhs[0]) << "'";
        } else {
            std::cout << p.rhs[0] << " " << p.rhs[1];
        }
        std::cout << "\n";
    }
}

std::string CnfGrammar::make_pattern_root_name(const std::string& pattern) {
    std::string name = "P";
    name += std::to_string(next_bin_id_++);
    return name;
}

std::string CnfGrammar::ensure_term_var(char c) {
    std::string key(1, c);
    auto it = term_var_.find(key);
    if (it != term_var_.end()) return it->second;

    int code = static_cast<unsigned char>(c);
    std::string v = "T_" + std::to_string(code);
    term_var_[key] = v;

    std::string term_str(1, c);
    add_terminal(v, term_str);
    return v;
}

void CnfGrammar::add_terminal(const std::string& A, const std::string& term) {
    rules_.push_back({A, {term}});
}

void CnfGrammar::add_binary(const std::string& A, const std::string& B, const std::string& C) {
    rules_.push_back({A, {B, C}});
}

void CnfGrammar::build_pattern_cnf(const std::string& pattern, const std::string& root) {
    int k = static_cast<int>(pattern.size());
    if (k == 0) {
        return;
    }
    if (k == 1) {
        add_terminal(root, std::string(1, pattern[0]));
        return;
    }

    std::vector<std::string> V;
    for (int i = 0; i <= k - 2; ++i) {
        V.push_back(root + "_V" + std::to_string(i + 1));
    }

    std::vector<std::string> T(k);
    for (int i = 0; i < k; ++i) {
        T[i] = ensure_term_var(pattern[i]);
    }

    std::string V0 = root;
    std::vector<std::string> vars;
    vars.push_back(V0);
    for (int i = 1; i < static_cast<int>(V.size()); ++i) {
        vars.push_back(V[i]);
    }

    for (int i = 0; i <= k - 3; ++i) {
        std::string Vi = vars[i];
        std::string Ti = T[i];
        std::string Vi1 = vars[i + 1];
        add_binary(Vi, Ti, Vi1);
    }

    std::string Vlast = vars.back();
    std::string Tpenult = T[k - 2];
    std::string Tlast = T[k - 1];
    add_binary(Vlast, Tpenult, Tlast);
}

std::string CnfGrammar::build_binary_tree(const std::string& root_name, std::vector<std::string> vars) {
    if (vars.empty()) return "";

    if (vars.size() == 2) {
        add_binary(root_name, vars[0], vars[1]);
        return root_name;
    }

    std::vector<std::string> current = vars;
    std::vector<std::string> next;

    while (current.size() > 1) {
        next.clear();
        for (size_t i = 0; i < current.size(); i += 2) {
            if (i + 1 < current.size()) {
                if (current.size() == 2 && next.empty()) {
                    add_binary(root_name, current[0], current[1]);
                    next.push_back(root_name);
                } else {
                    std::string new_var = root_name + "_N" + std::to_string(next_bin_id_++);
                    add_binary(new_var, current[i], current[i + 1]);
                    next.push_back(new_var);
                }
            } else {
                next.push_back(current[i]);
            }
        }
        current.swap(next);
    }

    if (current.size() == 1 && current[0] != root_name) {
        rename_variable(current[0], root_name);
        return root_name;
    }

    return current[0];
}

void CnfGrammar::rename_variable(const std::string& from, const std::string& to) {
    for (auto& r : rules_) {
        if (r.lhs == from) r.lhs = to;
        for (auto& s : r.rhs) {
            if (s == from) s = to;
        }
    }
}

std::string CnfGrammar::escape_printable(const std::string& s) {
    if (s.empty()) return "";
    unsigned char c = s[0];
    if (std::isprint(c)) return s;
    return "\\" + std::to_string(static_cast<int>(c));
}

// ============================================================================
// PatternMatcher Implementation
// ============================================================================

PatternMatcher::PatternMatcher(const std::vector<std::string>& patterns)
    : malicious_patterns_(patterns) {
    grammar_.build(patterns);
}

bool PatternMatcher::has_malicious_pattern(const std::string& payload) const {
    for (const auto& pattern : malicious_patterns_) {
        if (matches_pattern(payload, pattern)) {
            return true;
        }
    }
    return false;
}

std::vector<std::string> PatternMatcher::get_matched_patterns(const std::string& payload) const {
    std::vector<std::string> matched;
    for (const auto& pattern : malicious_patterns_) {
        if (matches_pattern(payload, pattern)) {
            matched.push_back(pattern);
        }
    }
    return matched;
}

bool PatternMatcher::matches_pattern(const std::string& payload, const std::string& pattern) const {
    // Simple substring matching with case-insensitive option for common payloads
    std::string lower_payload = payload;
    std::string lower_pattern = pattern;
    std::transform(lower_payload.begin(), lower_payload.end(), lower_payload.begin(), ::tolower);
    std::transform(lower_pattern.begin(), lower_pattern.end(), lower_pattern.begin(), ::tolower);
    
    return lower_payload.find(lower_pattern) != std::string::npos;
}

// ============================================================================
// DfaMatcher Implementation
// ============================================================================

DfaMatcher::DfaMatcher(State start_state) 
    : start_state_(start_state), pattern_matcher_(nullptr) {}

void DfaMatcher::add_accepting_state(State s) {
    accepting_[s] = true;
}

void DfaMatcher::add_transition(State from, unsigned char symbol, State to) {
    transitions_[TransitionKey{from, symbol}] = to;
}

bool DfaMatcher::matches(const std::vector<unsigned char>& data) const {
    State current = start_state_;

    for (auto ch : data) {
        auto it = transitions_.find(TransitionKey{current, ch});
        if (it == transitions_.end()) {
            return false;
        }
        current = it->second;
    }

    auto it_accept = accepting_.find(current);
    return it_accept != accepting_.end() && it_accept->second;
}

bool DfaMatcher::matches(const std::string& data) const {
    return matches(std::vector<unsigned char>(data.begin(), data.end()));
}

bool DfaMatcher::inspect_payload(const std::string& payload) const {
    if (!pattern_matcher_) {
        return false;  // No pattern matcher set, assume benign
    }
    return pattern_matcher_->has_malicious_pattern(payload);
}

std::vector<std::string> DfaMatcher::get_payload_anomalies(const std::string& payload) const {
    if (!pattern_matcher_) {
        return {};  // No pattern matcher set
    }
    return pattern_matcher_->get_matched_patterns(payload);
}

} // namespace automata::packet_inspection::dfa


