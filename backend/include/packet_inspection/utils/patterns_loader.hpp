#ifndef PATTERNS_LOADER_HPP
#define PATTERNS_LOADER_HPP

#include <string>
#include <vector>
#include <map>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

/**
 * PatternsLoader: Loads patterns from patterns.json
 */
class PatternsLoader {
public:
    PatternsLoader() = default;
    ~PatternsLoader() = default;

    /**
     * Load patterns from JSON file
     * @param filePath Path to patterns.json
     * @return Map of category -> vector of patterns
     */
    static std::map<std::string, std::vector<std::string>> loadPatterns(const std::string& filePath);

    /**
     * Flatten all patterns into a single vector
     * @param patternMap Map of category -> patterns
     * @return Flattened vector of all patterns
     */
    static std::vector<std::string> flattenPatterns(
        const std::map<std::string, std::vector<std::string>>& patternMap);

    /**
     * Export patterns to JSON
     * @param patterns Map of patterns
     * @return JSON representation
     */
    static json toJson(const std::map<std::string, std::vector<std::string>>& patterns);
};

#endif // PATTERNS_LOADER_HPP
