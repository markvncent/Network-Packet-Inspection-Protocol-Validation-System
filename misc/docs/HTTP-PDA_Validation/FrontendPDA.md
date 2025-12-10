PDAController controller;

controller.loadPacket(httpString);   // from PCAP → TCP reassembly
bool ok = controller.validate();

while (controller.hasMoreSteps()) {
    std::string step = controller.getNextTraceStep();
    frontend.displayPDA(step);       // UI callback
}

if (ok)
    frontend.showStatus("VALID HTTP");
else
    frontend.showStatus("INVALID HTTP");
