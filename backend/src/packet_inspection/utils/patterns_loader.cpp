#include "packet_inspection/utils/patterns_loader.hpp"
#include <fstream>
#include <sstream>

std::map<std::string, std::vector<std::string>> PatternsLoader::loadPatterns(const std::string& filePath) {
    std::map<std::string, std::vector<std::string>> patterns;

    std::ifstream file(filePath);
    if (!file.is_open()) {
        fprintf(stderr, "Error: Could not open patterns file: %s\n", filePath.c_str());
        return patterns;
    }

    try {
        json j;
        file >> j;

        // Parse JSON structure: { "category": ["pattern1", "pattern2", ...], ... }
        for (auto& [category, patternList] : j.items()) {
            if (patternList.is_array()) {
                for (const auto& pattern : patternList) {
                    if (pattern.is_string()) {
                        patterns[category].push_back(pattern.get<std::string>());
                    }
                }
            }
        }

        fprintf(stdout, "Loaded patterns from %s\n", filePath.c_str());
        for (const auto& [cat, pats] : patterns) {
            fprintf(stdout, "  %s: %zu patterns\n", cat.c_str(), pats.size());
        }
    } catch (const std::exception& e) {
        fprintf(stderr, "Error parsing patterns JSON: %s\n", e.what());
    }

    file.close();
    return patterns;
}

std::vector<std::string> PatternsLoader::flattenPatterns(
    const std::map<std::string, std::vector<std::string>>& patternMap) {
    std::vector<std::string> flattened;

    for (const auto& [category, patterns] : patternMap) {
        for (const auto& pattern : patterns) {
            flattened.push_back(pattern);
        }
    }

    return flattened;
}

json PatternsLoader::toJson(const std::map<std::string, std::vector<std::string>>& patterns) {
    json j;
    for (const auto& [category, patternList] : patterns) {
        j[category] = patternList;
    }
    return j;
}
