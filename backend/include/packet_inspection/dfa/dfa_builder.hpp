#ifndef DFA_BUILDER_HPP
#define DFA_BUILDER_HPP

#include <string>
#include <vector>
#include <set>
#include <map>
#include <memory>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

/**
 * DFABuilder: Constructs a Deterministic Finite Automaton from patterns
 * - Builds a minimal DFA from multiple patterns
 * - Exports to JSON format compatible with frontend visualizer
 * - Provides matching functionality
 */
class DFABuilder {
private:
    /**
     * DFAState: Single state in the DFA
     */
    struct DFAState {
        std::string id;
        bool isAccepting;
        std::vector<std::string> acceptingPatterns;  // Patterns matched in this state
        std::map<char, std::string> transitions;     // char -> next state id
    };

public:
    DFABuilder() {}
    ~DFABuilder() = default;

    /**
     * Build DFA from patterns using subset construction from NFA
     * @param patterns Vector of patterns to match
     */
    void buildFromPatterns(const std::vector<std::string>& patterns);

    /**
     * Match text against the DFA
     * @param text Text to match
     * @return Vector of positions where patterns match
     */
    std::vector<uint32_t> match(const std::string& text) const;

    /**
     * Export the DFA to JSON format
     * @return JSON representation following automata-format.md
     */
    json exportToJson() const;

    /**
     * Clear the DFA (delete all states)
     */
    void clear();

    /**
     * Get number of states in the DFA
     * @return State count
     */
    size_t getStateCount() const { return states.size(); }

private:
    std::map<std::string, DFAState> states;
    std::string startState;

    /**
     * Build NFA first, then convert to DFA using subset construction
     */
    void buildNFA(const std::vector<std::string>& patterns);

    /**
     * Convert NFA to DFA using subset construction
     */
    void nfaToDFA(const std::map<std::string, DFAState>& nfaStates);

    /**
     * Epsilon closure (for standard DFA, not needed but reserved)
     */
    std::set<std::string> epsilonClosure(const std::set<std::string>& states) const;

    /**
     * Move operation: get all reachable states from state set on input char
     */
    std::set<std::string> move(const std::set<std::string>& states, char input) const;

    /**
     * Create a new state ID
     */
    static std::string createStateId(size_t index) {
        return "S" + std::to_string(index);
    }
};

#endif // DFA_BUILDER_HPP
