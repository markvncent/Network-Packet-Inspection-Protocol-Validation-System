#include "packet_inspection/ac/aho_corasick.hpp"
#include <cctype>
#include <algorithm>
#include <set>

std::shared_ptr<AhoCorasick::TrieNode> AhoCorasick::createNode() {
    auto node = std::make_shared<TrieNode>();
    node->id = nextNodeId++;
    node->failLink = nullptr;
    return node;
}

void AhoCorasick::buildFromPatterns(const std::vector<std::string>& patterns) {
    clear();
    root = createNode();

    // Insert all patterns
    for (const auto& pattern : patterns) {
        insertPattern(pattern);
    }

    // Build fail links
    buildFailLinks();

    fprintf(stdout, "Built Aho-Corasick automaton with %zu patterns and %u nodes\n", 
            patterns.size(), nextNodeId);
}

void AhoCorasick::insertPattern(const std::string& pattern) {
    auto current = root;

    for (char c : pattern) {
        char lowerC = std::tolower(static_cast<unsigned char>(c));
        
        if (current->children.find(lowerC) == current->children.end()) {
            current->children[lowerC] = createNode();
        }
        current = current->children[lowerC];
    }

    // Mark this node as the end of a pattern
    current->output.push_back(pattern);
}

void AhoCorasick::buildFailLinks() {
    if (!root) return;

    // BFS to build fail links level by level
    std::queue<std::shared_ptr<TrieNode>> queue;

    // All nodes at depth 1 have fail link to root
    root->failLink = root;
    for (auto& [c, child] : root->children) {
        child->failLink = root;
        queue.push(child);
    }

    // Process remaining nodes
    while (!queue.empty()) {
        auto node = queue.front();
        queue.pop();

        for (auto& [c, child] : node->children) {
            queue.push(child);

            // Find fail link for child
            auto failNode = node->failLink;
            while (failNode != root && failNode->children.find(c) == failNode->children.end()) {
                failNode = failNode->failLink;
            }

            if (failNode->children.find(c) != failNode->children.end()) {
                child->failLink = failNode->children[c];
            } else {
                child->failLink = root;
            }

            // Merge output from fail link
            for (const auto& pattern : child->failLink->output) {
                child->output.push_back(pattern);
            }
        }
    }
}

ScanResult AhoCorasick::scan(const std::string& text, uint32_t packetId,
                             const std::string& payloadHex, const std::string& payloadAscii) {
    ScanResult result;
    result.packetId = packetId;
    result.payloadHex = payloadHex;
    result.payloadAscii = payloadAscii;

    if (!root) {
        return result;
    }

    auto current = root;
    std::set<std::string> foundPatterns;  // To avoid duplicate matches

    for (size_t i = 0; i < text.length(); ++i) {
        char c = std::tolower(static_cast<unsigned char>(text[i]));

        // Follow fail links until we find a match or reach root
        while (current != root && current->children.find(c) == current->children.end()) {
            current = current->failLink;
        }

        // Move to next node
        if (current->children.find(c) != current->children.end()) {
            current = current->children[c];
        }

        // Record any patterns matched at this position
        MatchStep step;
        step.byte = static_cast<uint8_t>(text[i]);
        step.character = text[i];
        step.nodeId = current->id;
        step.outputs = current->output;

        // Add matches to result
        for (const auto& pattern : current->output) {
            if (foundPatterns.find(pattern) == foundPatterns.end()) {
                result.matches.push_back({pattern, static_cast<uint32_t>(i)});
                foundPatterns.insert(pattern);
            }
        }

        result.steps.push_back(step);
    }

    return result;
}

json AhoCorasick::exportToJson() const {
    json output;
    std::set<uint32_t> visited;

    if (root) {
        // Export nodes
        json nodes = json::array();
        
        std::function<void(const std::shared_ptr<TrieNode>&)> exportNode =
            [&](const std::shared_ptr<TrieNode>& node) {
                if (visited.find(node->id) != visited.end()) {
                    return;
                }
                visited.insert(node->id);

                json nodeJson;
                nodeJson["id"] = node->id;
                nodeJson["fail"] = node->failLink ? node->failLink->id : 0;
                nodeJson["output"] = node->output;
                nodes.push_back(nodeJson);

                for (const auto& [c, child] : node->children) {
                    exportNode(child);
                }
            };

        exportNode(root);
        output["nodes"] = nodes;

        // Export edges
        visited.clear();
        json edges = json::array();
        
        std::function<void(const std::shared_ptr<TrieNode>&)> exportEdges =
            [&](const std::shared_ptr<TrieNode>& node) {
                if (visited.find(node->id) != visited.end()) {
                    return;
                }
                visited.insert(node->id);

                for (const auto& [c, child] : node->children) {
                    json edge;
                    edge["from"] = node->id;
                    edge["input"] = std::string(1, c);
                    edge["to"] = child->id;
                    edges.push_back(edge);
                    exportEdges(child);
                }
            };

        exportEdges(root);
        output["edges"] = edges;
    }

    return output;
}

void AhoCorasick::clear() {
    root = nullptr;
    nextNodeId = 0;
}
