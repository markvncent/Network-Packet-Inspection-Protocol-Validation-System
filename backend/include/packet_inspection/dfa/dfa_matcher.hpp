#pragma once

#include <string>
#include <unordered_map>
#include <vector>
#include <map>
#include <set>

namespace automata::packet_inspection::dfa {

// Production rule in Chomsky Normal Form (CNF)
struct Production {
    std::string lhs;
    std::vector<std::string> rhs;  // size 1 (terminal) or size 2 (binary non-terminal)
};

// CNF-based pattern grammar for malicious payload detection
class CnfGrammar {
public:
    // Build grammar from a list of malicious patterns
    void build(const std::vector<std::string>& patterns);

    // Get all production rules
    [[nodiscard]] const std::vector<Production>& get_rules() const { return rules_; }

    // Print grammar in human-readable format
    void print() const;

private:
    std::vector<Production> rules_;
    std::map<std::string, std::string> term_var_;  // terminal char -> variable name
    std::vector<std::string> pattern_roots_;
    int next_term_id_ = 1;
    int next_bin_id_ = 1;

    std::string make_pattern_root_name(const std::string& pattern);
    std::string ensure_term_var(char c);
    void add_terminal(const std::string& A, const std::string& term);
    void add_binary(const std::string& A, const std::string& B, const std::string& C);
    void build_pattern_cnf(const std::string& pattern, const std::string& root);
    std::string build_binary_tree(const std::string& root_name, std::vector<std::string> vars);
    void rename_variable(const std::string& from, const std::string& to);
    static std::string escape_printable(const std::string& s);
};

// Pattern matcher using CNF grammar for payload validation
class PatternMatcher {
public:
    // Initialize with malicious patterns
    explicit PatternMatcher(const std::vector<std::string>& patterns = {});

    // Check if payload matches any malicious pattern
    [[nodiscard]] bool has_malicious_pattern(const std::string& payload) const;

    // Get list of matched patterns (for detailed analysis)
    [[nodiscard]] std::vector<std::string> get_matched_patterns(const std::string& payload) const;

    // Get the underlying grammar
    [[nodiscard]] const CnfGrammar& get_grammar() const { return grammar_; }

private:
    CnfGrammar grammar_;
    std::vector<std::string> malicious_patterns_;

    bool matches_pattern(const std::string& payload, const std::string& pattern) const;
};

// Simple deterministic finite automaton for payload / header matching.
class DfaMatcher {
public:
    using State = int;

    struct TransitionKey {
        State state;
        unsigned char symbol;

        bool operator==(const TransitionKey& other) const noexcept {
            return state == other.state && symbol == other.symbol;
        }
    };

    struct TransitionKeyHash {
        std::size_t operator()(const TransitionKey& k) const noexcept {
            return (static_cast<std::size_t>(k.state) << 8) ^ k.symbol;
        }
    };

    explicit DfaMatcher(State start_state = 0);

    void add_accepting_state(State s);
    void add_transition(State from, unsigned char symbol, State to);

    // Match a byte sequence (e.g. packet payload or header fragment).
    [[nodiscard]] bool matches(const std::vector<unsigned char>& data) const;
    [[nodiscard]] bool matches(const std::string& data) const;

    // Comprehensive payload inspection using CNF pattern matching
    [[nodiscard]] bool inspect_payload(const std::string& payload) const;
    [[nodiscard]] std::vector<std::string> get_payload_anomalies(const std::string& payload) const;

    // Set pattern matcher for payload validation
    void set_pattern_matcher(const PatternMatcher& matcher) {
        pattern_matcher_ = std::make_unique<PatternMatcher>(matcher);
    }

private:
    State start_state_;
    std::unordered_map<TransitionKey, State, TransitionKeyHash> transitions_;
    std::unordered_map<State, bool> accepting_;
    std::unique_ptr<PatternMatcher> pattern_matcher_;
};

} // namespace automata::packet_inspection::dfa


