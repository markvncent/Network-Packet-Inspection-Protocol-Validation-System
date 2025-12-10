#pragma once
#include <string>
#include <vector>
#include <stack>
#include <unordered_map>

enum class PDAState {
    START,
    METHOD,
    SP1,
    URI,
    SP2,
    VERSION,
    REQUEST_LINE_CR,   // seen \r in request line
    HEADERS,
    HEADER_NAME,
    HEADER_COLON,
    HEADER_VALUE,
    HEADER_CR,         // saw '\r' after a header line
    BODY,
    ACCEPT,
    ERROR
};

struct PDATrace {
    PDAState state;
    char input;               // 0 == epsilon
    std::string stackTop;
    std::string action;
};

class PDAEngine {
public:
    PDAEngine();

    // Validate the HTTP message string. Returns true if accepted.
    // After calling validate(), call getTrace() to retrieve a detailed per-char trace.
    bool validate(const std::string& httpMessage);
    const std::vector<PDATrace>& getTrace() const { return trace; }

private:
    std::stack<char> st;
    PDAState state;
    std::vector<PDATrace> trace;

    // helpers for logging & character classification
    void log(char input, const std::string& action);
    bool isMethodChar(char c);
    bool isURIChar(char c);
    bool isVersionChar(char c);
    std::string stackTopString() const;

    // parsing helpers
    void pushMarker(char m, const std::string& action);
    void popMarker(const std::string& action);

    // fields to keep parsing context
    bool lastWasCR;                       // used to detect CRLF sequences
    int consecutiveCRLFs;                 // to detect CRLF CRLF (end of headers)
    std::unordered_map<std::string,std::string> headers;
    std::string currentHeaderName;
    std::string currentHeaderValue;
    int contentLengthRemaining;           // -1 if unknown / no Content-Length specified
    int bodyBytesConsumed;
};
