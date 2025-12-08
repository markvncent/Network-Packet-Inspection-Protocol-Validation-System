#include <iostream>
#include <string>
#include <memory>
#include <map>
#include <vector>
#include <thread>
#include <mutex>
#include <crow_all.hpp>
#include <nlohmann/json.hpp>

#include "packet_inspection/pcap/packet_reader.hpp"
#include "packet_inspection/ac/aho_corasick.hpp"
#include "packet_inspection/dfa/dfa_builder.hpp"
#include "packet_inspection/utils/patterns_loader.hpp"

using json = nlohmann::json;

// Global instances
std::map<std::string, std::vector<std::string>> g_patterns;
AhoCorasick g_acAutomaton;
DFABuilder g_dfaBuilder;
std::mutex g_dataMutex;

const std::string PATTERNS_FILE = "backend/pcap/patterns.json";
const int SERVER_PORT = 8080;

/**
 * Initialize automata from patterns
 */
void initializeAutomata() {
    std::lock_guard<std::mutex> lock(g_dataMutex);

    // Load patterns from JSON
    g_patterns = PatternsLoader::loadPatterns(PATTERNS_FILE);
    std::vector<std::string> flatPatterns = PatternsLoader::flattenPatterns(g_patterns);

    // Build automata
    g_acAutomaton.buildFromPatterns(flatPatterns);
    g_dfaBuilder.buildFromPatterns(flatPatterns);

    printf("Initialized automata with %zu patterns\n", flatPatterns.size());
}

int main() {
    crow::SimpleApp app;

    // Initialize automata on startup
    initializeAutomata();

    /**
     * GET /patterns
     * Returns the patterns.json content
     */
    CROW_ROUTE(app, "/patterns").methods("GET"_method)
    ([]() {
        std::lock_guard<std::mutex> lock(g_dataMutex);
        json response = PatternsLoader::toJson(g_patterns);
        return crow::response(200, response.dump());
    });

    /**
     * GET /dfa
     * Returns the DFA in JSON format
     */
    CROW_ROUTE(app, "/dfa").methods("GET"_method)
    ([]() {
        std::lock_guard<std::mutex> lock(g_dataMutex);
        json response = g_dfaBuilder.exportToJson();
        return crow::response(200, response.dump());
    });

    /**
     * GET /ac-trie
     * Returns the Aho-Corasick trie in JSON format
     */
    CROW_ROUTE(app, "/ac-trie").methods("GET"_method)
    ([]() {
        std::lock_guard<std::mutex> lock(g_dataMutex);
        json response = g_acAutomaton.exportToJson();
        return crow::response(200, response.dump());
    });

    /**
     * POST /scan
     * Scan raw hex or ASCII payload for patterns
     * Body: {
     *   "payload": "string in hex or ascii",
     *   "isHex": boolean,
     *   "packetId": number
     * }
     */
    CROW_ROUTE(app, "/scan").methods("POST"_method)
    ([](const crow::request& req) {
        try {
            auto json_body = crow::crow_json::load(req.body);
            
            std::string payloadStr = json_body["payload"].s();
            bool isHex = json_body["isHex"].b();
            uint32_t packetId = json_body["packetId"].i();

            // Convert hex to string if needed
            std::string textToScan = payloadStr;
            std::string payloadHex = payloadStr;
            std::string payloadAscii;

            if (isHex) {
                // Convert hex string to ASCII for scanning
                payloadAscii.clear();
                for (size_t i = 0; i < payloadStr.length(); i += 2) {
                    if (i + 1 < payloadStr.length()) {
                        std::string hexByte = payloadStr.substr(i, 2);
                        char c = (char)std::stoi(hexByte, nullptr, 16);
                        textToScan += c;
                        payloadAscii += (std::isprint(c) ? c : '.');
                    }
                }
            } else {
                payloadAscii = payloadStr;
                // Convert ASCII to hex
                for (char c : payloadStr) {
                    char buf[3];
                    sprintf(buf, "%02x", (unsigned char)c);
                    payloadHex += buf;
                }
            }

            std::lock_guard<std::mutex> lock(g_dataMutex);
            ScanResult result = g_acAutomaton.scan(textToScan, packetId, payloadHex, payloadAscii);

            // Build response JSON
            json response;
            response["packetId"] = result.packetId;
            response["payloadHex"] = result.payloadHex;
            response["payloadAscii"] = result.payloadAscii;

            json matches = json::array();
            for (const auto& match : result.matches) {
                json m;
                m["pattern"] = match.pattern;
                m["position"] = match.position;
                matches.push_back(m);
            }
            response["matches"] = matches;

            json steps = json::array();
            for (const auto& step : result.steps) {
                json s;
                s["byte"] = step.byte;
                s["char"] = std::string(1, step.character);
                s["nodeId"] = step.nodeId;
                s["outputs"] = step.outputs;
                steps.push_back(s);
            }
            response["steps"] = steps;

            return crow::response(200, response.dump());
        } catch (const std::exception& e) {
            json error;
            error["error"] = std::string(e.what());
            return crow::response(400, error.dump());
        }
    });

    /**
     * POST /scan-pcap
     * Upload and scan a PCAP file
     * Body: multipart/form-data with file field
     */
    CROW_ROUTE(app, "/scan-pcap").methods("POST"_method)
    ([](const crow::request& req) {
        try {
            // Simple PCAP file handling
            // In production, use proper multipart parsing
            std::string filename = "uploaded_packet.pcap";
            std::ofstream out(filename, std::ios::binary);
            out.write(req.body.c_str(), req.body.size());
            out.close();

            // Read PCAP file
            PacketReader reader;
            std::vector<Packet> packets = reader.readPcapFile(filename);

            json response = json::array();
            for (const auto& packet : packets) {
                std::lock_guard<std::mutex> lock(g_dataMutex);
                ScanResult result = g_acAutomaton.scan(
                    packet.payloadAscii, 
                    packet.packetId,
                    packet.payloadHex,
                    packet.payloadAscii
                );

                json pktResult;
                pktResult["packetId"] = result.packetId;
                pktResult["payloadHex"] = result.payloadHex;
                pktResult["payloadAscii"] = result.payloadAscii;

                json matches = json::array();
                for (const auto& match : result.matches) {
                    json m;
                    m["pattern"] = match.pattern;
                    m["position"] = match.position;
                    matches.push_back(m);
                }
                pktResult["matches"] = matches;

                response.push_back(pktResult);
            }

            return crow::response(200, response.dump());
        } catch (const std::exception& e) {
            json error;
            error["error"] = std::string(e.what());
            return crow::response(400, error.dump());
        }
    });

    /**
     * Health check endpoint
     */
    CROW_ROUTE(app, "/health").methods("GET"_method)
    ([]() {
        json response;
        response["status"] = "ok";
        response["service"] = "packet-inspection-api";
        response["version"] = "1.0.0";
        return crow::response(200, response.dump());
    });

    printf("Starting Packet Inspection API Server on port %d\n", SERVER_PORT);
    printf("Endpoints:\n");
    printf("  GET  /health         - Health check\n");
    printf("  GET  /patterns       - Get patterns.json\n");
    printf("  GET  /dfa            - Get DFA JSON\n");
    printf("  GET  /ac-trie        - Get AC Trie JSON\n");
    printf("  POST /scan           - Scan payload\n");
    printf("  POST /scan-pcap      - Upload and scan PCAP file\n");

    app.port(SERVER_PORT).multithreaded().run();

    return 0;
}


