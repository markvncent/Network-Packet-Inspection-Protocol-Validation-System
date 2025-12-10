#pragma once
#include "PDAEngine.hpp"
#include <string>

class PDAController {
public:
    PDAController();

    // load raw payload (already decoded from pcap/hex to ASCII for HTTP)
    bool loadPacket(const std::string& hexOrPcapPayload);
    // run the PDA; returns true if accepted
    bool validate();

    // frontend uses this to step through the trace
    std::string getNextTraceStep();
    bool hasMoreSteps();

private:
    PDAEngine pda;
    std::string payload;
    size_t traceIndex;
};