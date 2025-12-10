#ifndef AHO_CORASICK_HPP
#define AHO_CORASICK_HPP

#include <string>
#include <vector>
#include <map>
#include <memory>
#include <queue>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

/**
 * Represents a single pattern match result
 */
struct PatternMatch {
    std::string pattern;
    uint32_t position;  // Position in the text where pattern was found
};

/**
 * Represents a step in the matching process
 */
struct MatchStep {
    uint8_t byte;
    char character;
    uint32_t nodeId;
    std::vector<std::string> outputs;  // Patterns matched at this node
};

/**
 * Represents scan results
 */
struct ScanResult {
    uint32_t packetId;
    std::string payloadHex;
    std::string payloadAscii;
    std::vector<PatternMatch> matches;
    std::vector<MatchStep> steps;
};

/**
 * AhoCorasick: Multi-pattern matching automaton
 * - Builds trie with fail links from pattern list
 * - Provides match() function for pattern matching
 * - Returns matches with positions and step-by-step transitions
 */
class AhoCorasick {
private:
    /**
     * TrieNode: Single node in the AC trie
     */
    struct TrieNode {
        uint32_t id;
        std::map<char, std::shared_ptr<TrieNode>> children;
        std::shared_ptr<TrieNode> failLink;
        std::vector<std::string> output;  // Patterns ending at this node
    };

public:
    AhoCorasick() : nextNodeId(0) {}
    ~AhoCorasick() = default;

    /**
     * Build the Aho-Corasick automaton from a list of patterns
     * @param patterns Vector of patterns to match
     */
    void buildFromPatterns(const std::vector<std::string>& patterns);

    /**
     * Scan text for pattern matches
     * @param text Text to scan
     * @param packetId ID of the packet being scanned
     * @param payloadHex Hex representation of payload
     * @param payloadAscii ASCII representation of payload
     * @return ScanResult with all matches and steps
     */
    ScanResult scan(const std::string& text, uint32_t packetId, 
                    const std::string& payloadHex, const std::string& payloadAscii);

    /**
     * Export the automaton to JSON format
     * @return JSON representation of the trie
     */
    json exportToJson() const;

    /**
     * Clear the automaton (delete all nodes)
     */
    void clear();

private:
    std::shared_ptr<TrieNode> root;
    uint32_t nextNodeId;

    /**
     * Create a new trie node
     * @return Shared pointer to new node
     */
    std::shared_ptr<TrieNode> createNode();

    /**
     * Insert a single pattern into the trie
     * @param pattern Pattern to insert
     */
    void insertPattern(const std::string& pattern);

    /**
     * Build fail links using BFS (after all patterns inserted)
     */
    void buildFailLinks();

    /**
     * Serialize a trie node to JSON
     * @param node Node to serialize
     * @param visited Set of already serialized node IDs
     * @return JSON representation of node
     */
    json nodeToJson(const std::shared_ptr<TrieNode>& node, std::set<uint32_t>& visited) const;
};

#endif // AHO_CORASICK_HPP
