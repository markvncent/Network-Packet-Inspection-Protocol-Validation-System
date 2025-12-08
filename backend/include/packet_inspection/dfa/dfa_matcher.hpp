#pragma once

#include <string>
#include <unordered_map>
#include <vector>

namespace automata::packet_inspection::dfa {

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

private:
    State start_state_;
    std::unordered_map<TransitionKey, State, TransitionKeyHash> transitions_;
    std::unordered_map<State, bool> accepting_;
};

} // namespace automata::packet_inspection::dfa


