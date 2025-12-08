#include "packet_inspection/dfa/dfa_builder.hpp"
#include <cctype>
#include <algorithm>
#include <queue>
#include <sstream>

void DFABuilder::buildFromPatterns(const std::vector<std::string>& patterns) {
    clear();
    buildNFA(patterns);
    fprintf(stdout, "Built DFA from %zu patterns with %zu states\n", patterns.size(), states.size());
}

void DFABuilder::buildNFA(const std::vector<std::string>& patterns) {
    // Create start state
    startState = "S0";
    DFAState startDfaState;
    startDfaState.id = startState;
    startDfaState.isAccepting = false;
    states[startState] = startDfaState;

    size_t stateCounter = 1;

    // For each pattern, build a chain of states
    std::vector<std::pair<std::string, std::vector<std::string>>> patternChains;

    for (const auto& pattern : patterns) {
        std::string currentState = startState;

        for (size_t i = 0; i < pattern.length(); ++i) {
            char lowerC = std::tolower(static_cast<unsigned char>(pattern[i]));
            std::string nextState = createStateId(stateCounter++);

            // Add transition if not already there
            if (states[currentState].transitions.find(lowerC) == states[currentState].transitions.end()) {
                states[currentState].transitions[lowerC] = nextState;
            } else {
                nextState = states[currentState].transitions[lowerC];
                stateCounter--;  // Revert counter if state already exists
            }

            // Create state if it doesn't exist
            if (states.find(nextState) == states.end()) {
                DFAState newState;
                newState.id = nextState;
                newState.isAccepting = false;
                states[nextState] = newState;
            }

            currentState = nextState;
        }

        // Mark final state as accepting
        states[currentState].isAccepting = true;
        states[currentState].acceptingPatterns.push_back(pattern);
    }
}

std::vector<uint32_t> DFABuilder::match(const std::string& text) const {
    std::vector<uint32_t> matchPositions;

    if (states.empty()) {
        return matchPositions;
    }

    std::string currentState = startState;

    for (size_t i = 0; i < text.length(); ++i) {
        char lowerC = std::tolower(static_cast<unsigned char>(text[i]));

        auto it = states.at(currentState).transitions.find(lowerC);
        if (it != states.at(currentState).transitions.end()) {
            currentState = it->second;

            if (states.at(currentState).isAccepting) {
                matchPositions.push_back(static_cast<uint32_t>(i));
            }
        } else {
            currentState = startState;
            
            // Try again from start state with current character
            auto startIt = states.at(startState).transitions.find(lowerC);
            if (startIt != states.at(startState).transitions.end()) {
                currentState = startIt->second;
                if (states.at(currentState).isAccepting) {
                    matchPositions.push_back(static_cast<uint32_t>(i));
                }
            }
        }
    }

    return matchPositions;
}

json DFABuilder::exportToJson() const {
    json output;

    // Export states
    json statesArray = json::array();
    std::set<std::string> stateIds;
    std::set<std::string> acceptingStates;

    for (const auto& [stateId, state] : states) {
        statesArray.push_back(stateId);
        stateIds.insert(stateId);
        if (state.isAccepting) {
            acceptingStates.insert(stateId);
        }
    }

    output["states"] = statesArray;
    output["start"] = startState;

    // Export accepting states
    json acceptingArray = json::array();
    for (const auto& state : acceptingStates) {
        acceptingArray.push_back(state);
    }
    output["accept"] = acceptingArray;

    // Export transitions
    json transitionsArray = json::array();
    for (const auto& [fromState, state] : states) {
        for (const auto& [inputChar, toState] : state.transitions) {
            json transition;
            transition["from"] = fromState;
            transition["input"] = std::string(1, inputChar);
            transition["to"] = toState;
            transitionsArray.push_back(transition);
        }
    }
    output["transitions"] = transitionsArray;

    return output;
}

void DFABuilder::clear() {
    states.clear();
    startState = "";
}

std::set<std::string> DFABuilder::epsilonClosure(const std::set<std::string>& stateSet) const {
    // For standard DFA without epsilon transitions, just return the set as-is
    return stateSet;
}

std::set<std::string> DFABuilder::move(const std::set<std::string>& stateSet, char input) const {
    std::set<std::string> result;
    for (const auto& state : stateSet) {
        auto it = states.find(state);
        if (it != states.end()) {
            auto transIt = it->second.transitions.find(input);
            if (transIt != it->second.transitions.end()) {
                result.insert(transIt->second);
            }
        }
    }
    return result;
}
