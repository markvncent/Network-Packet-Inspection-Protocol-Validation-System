#include "PDAController.hpp"
#include <sstream>

PDAController::PDAController() : traceIndex(0) {}

bool PDAController::loadPacket(const std::string& data) {
    payload = data;
    traceIndex = 0;
    return true;
}

bool PDAController::validate() {
    bool ok = pda.validate(payload);
    traceIndex = 0; // reset stepping index so frontend will iterate from start
    return ok;
}

bool PDAController::hasMoreSteps() {
    return traceIndex < pda.getTrace().size();
}

std::string PDAController::getNextTraceStep() {
    if (!hasMoreSteps()) return "";

    const PDATrace& t = pda.getTrace()[traceIndex++];

    std::ostringstream oss;
    // show state, input (with readable escape for CR/LF), stack top, action
    std::string inputDesc;
    if (t.input == 0) inputDesc = "ε";
    else if (t.input == '\r') inputDesc = "\\r";
    else if (t.input == '\n') inputDesc = "\\n";
    else {
        inputDesc = std::string(1, t.input);
    }

    oss << "State=" << static_cast<int>(t.state)
        << " Input=" << inputDesc
        << " StackTop=" << t.stackTop
        << " Action=" << t.action;

    return oss.str();
}
