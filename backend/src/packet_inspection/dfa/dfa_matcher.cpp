#include "packet_inspection/dfa/dfa_matcher.hpp"

namespace automata::packet_inspection::dfa {

DfaMatcher::DfaMatcher(State start_state) : start_state_(start_state) {}

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

} // namespace automata::packet_inspection::dfa


