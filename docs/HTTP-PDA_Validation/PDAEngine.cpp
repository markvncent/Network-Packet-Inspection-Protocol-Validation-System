#include "PDAEngine.hpp"
#include <cctype>
#include <sstream>
#include <algorithm>

PDAEngine::PDAEngine() {
    state = PDAState::START;
    while (!st.empty()) st.pop();
    st.push('$');
    lastWasCR = false;
    consecutiveCRLFs = 0;
    contentLengthRemaining = -1;
    bodyBytesConsumed = 0;
}

void PDAEngine::log(char input, const std::string& action) {
    trace.push_back({
        state,
        input,
        stackTopString(),
        action
    });
}

std::string PDAEngine::stackTopString() const {
    if (st.empty()) return "";
    return std::string(1, st.top());
}

void PDAEngine::pushMarker(char m, const std::string& action) {
    st.push(m);
    log(0, action + " (push)");
}

void PDAEngine::popMarker(const std::string& action) {
    if (!st.empty() && st.top() != '$') {
        st.pop();
        log(0, action + " (pop)");
    } else {
        // still log attempt
        log(0, action + " (pop failed)");
    }
}

bool PDAEngine::isMethodChar(char c) {
    return std::isupper(static_cast<unsigned char>(c)); // typical HTTP methods are uppercase letters
}

bool PDAEngine::isURIChar(char c) {
    // accept typical URI chars + pct-encoding + query chars
    return std::isalnum(static_cast<unsigned char>(c)) || c=='/' || c=='.' || c=='-' || c=='_' || c=='?' || c=='=' || c=='&' || c=='%';
}

bool PDAEngine::isVersionChar(char c) {
    return std::isalnum(static_cast<unsigned char>(c)) || c=='.' || c=='/';
}

bool PDAEngine::validate(const std::string& s) {
    trace.clear();
    state = PDAState::START;
    while (!st.empty()) st.pop();
    st.push('$');

    lastWasCR = false;
    consecutiveCRLFs = 0;
    headers.clear();
    currentHeaderName.clear();
    currentHeaderValue.clear();
    contentLengthRemaining = -1;
    bodyBytesConsumed = 0;

    // push an R marker to indicate we're parsing a request (visual PDA stack activity)
    pushMarker('R', "start request (R)");

    for (size_t i = 0; i < s.size(); ++i) {
        char c = s[i];

        // default action text (may be replaced by specific branch)
        std::string action = "consume";

        // state machine
        switch (state) {
            case PDAState::START:
                if (isMethodChar(c)) {
                    state = PDAState::METHOD;
                    log(c, "begin METHOD");
                } else {
                    log(c, "expected METHOD");
                    state = PDAState::ERROR;
                    return false;
                }
                consecutiveCRLFs = 0;
                lastWasCR = false;
                break;

            case PDAState::METHOD:
                if (isMethodChar(c)) {
                    log(c, "METHOD char");
                } else if (c == ' ') {
                    state = PDAState::SP1;
                    log(c, "METHOD -> SP1");
                } else {
                    log(c, "invalid METHOD char");
                    state = PDAState::ERROR;
                    return false;
                }
                lastWasCR = false;
                consecutiveCRLFs = 0;
                break;

            case PDAState::SP1:
                if (isURIChar(c)) {
                    state = PDAState::URI;
                    log(c, "begin URI");
                } else {
                    log(c, "expected URI");
                    state = PDAState::ERROR;
                    return false;
                }
                lastWasCR = false;
                consecutiveCRLFs = 0;
                break;

            case PDAState::URI:
                if (isURIChar(c)) {
                    log(c, "URI char");
                } else if (c == ' ') {
                    state = PDAState::SP2;
                    log(c, "URI -> SP2");
                } else {
                    log(c, "invalid URI char");
                    state = PDAState::ERROR;
                    return false;
                }
                lastWasCR = false;
                consecutiveCRLFs = 0;
                break;

            case PDAState::SP2:
                if (isVersionChar(c)) {
                    state = PDAState::VERSION;
                    log(c, "begin VERSION");
                } else {
                    log(c, "expected VERSION");
                    state = PDAState::ERROR;
                    return false;
                }
                lastWasCR = false;
                consecutiveCRLFs = 0;
                break;

            case PDAState::VERSION:
                if (isVersionChar(c)) {
                    log(c, "VERSION char");
                } else if (c == '\r') {
                    state = PDAState::REQUEST_LINE_CR;
                    log(c, "REQUEST_LINE_CR");
                    lastWasCR = true;
                } else {
                    log(c, "invalid VERSION char");
                    state = PDAState::ERROR;
                    return false;
                }
                break;

            case PDAState::REQUEST_LINE_CR:
                if (c == '\n') {
                    state = PDAState::HEADERS;
                    log(c, "REQUEST_LINE end -> HEADERS");
                    // after request-line CRLF, we're at start of headers; reset header trackers
                    currentHeaderName.clear();
                    currentHeaderValue.clear();
                    consecutiveCRLFs = 0;
                    lastWasCR = false;
                } else {
                    log(c, "expected LF after CR");
                    state = PDAState::ERROR;
                    return false;
                }
                break;

            case PDAState::HEADERS:
                // Detect end-of-headers: CRLF CRLF sequence (two consecutive CRLFs w/o data)
                if (c == '\r') {
                    lastWasCR = true;
                    log(c, "maybe CR (headers)");
                } else if (c == '\n' && lastWasCR) {
                    // we have a CRLF termination of a line
                    consecutiveCRLFs++;
                    log(c, "CRLF (headers)");
                    lastWasCR = false;

                    if (consecutiveCRLFs == 2) {
                        // CRLF CRLF => end of headers
                        state = PDAState::BODY;
                        log(0, "end of headers -> BODY");
                        // if we found Content-Length header earlier, prepare body counters
                        auto it = headers.find("content-length");
                        if (it != headers.end()) {
                            std::istringstream iss(it->second);
                            int len = -1;
                            if ((iss >> len) && len >= 0) {
                                contentLengthRemaining = len;
                            } else {
                                // malformed content-length -> treat as error
                                log(0, "invalid Content-Length");
                                state = PDAState::ERROR;
                                return false;
                            }
                        } else {
                            contentLengthRemaining = -1; // unknown — accept EOF as termination
                        }
                    } else {
                        // CRLF that ends a header line (but not empty line)
                        // stay in HEADERS waiting for next header or empty line
                    }
                } else {
                    // some non-CRLF content -> start a header name
                    consecutiveCRLFs = 0;
                    lastWasCR = false;
                    if (isalpha(static_cast<unsigned char>(c))) {
                        state = PDAState::HEADER_NAME;
                        currentHeaderName.clear();
                        currentHeaderValue.clear();
                        // first char of header name
                        currentHeaderName.push_back(std::tolower(static_cast<unsigned char>(c)));
                        log(c, "begin HEADER_NAME");
                    } else {
                        // invalid header start (could be folding or extension; for simplicity, reject)
                        log(c, "invalid header start");
                        state = PDAState::ERROR;
                        return false;
                    }
                }
                break;

            case PDAState::HEADER_NAME:
                if (c == ':') {
                    state = PDAState::HEADER_COLON;
                    // store header name lowercased
                    log(c, "HEADER_NAME -> ':' -> HEADER_COLON");
                    // trim trailing spaces from header name (unlikely here but safe)
                    while (!currentHeaderName.empty() && std::isspace(static_cast<unsigned char>(currentHeaderName.back())))
                        currentHeaderName.pop_back();
                } else if (std::isalnum(static_cast<unsigned char>(c)) || c=='-' ) {
                    currentHeaderName.push_back(std::tolower(static_cast<unsigned char>(c)));
                    log(c, "HEADER_NAME char");
                } else {
                    log(c, "invalid HEADER_NAME char");
                    state = PDAState::ERROR;
                    return false;
                }
                lastWasCR = false;
                consecutiveCRLFs = 0;
                break;

            case PDAState::HEADER_COLON:
                // After colon, optional single space then value begins.
                if (c == ' ') {
                    log(c, "HEADER_COLON -> skip SPACE");
                    // stay in HEADER_COLON until non-space seen; next non-space -> HEADER_VALUE
                } else if (c == '\r') {
                    // empty header value is allowed; treat as header completed with empty value
                    currentHeaderValue.clear();
                    state = PDAState::HEADER_CR;
                    lastWasCR = true;
                    log(c, "HEADER_COLON -> CR (empty value)");
                } else {
                    // begin header value
                    state = PDAState::HEADER_VALUE;
                    currentHeaderValue.push_back(c);
                    log(c, "begin HEADER_VALUE");
                }
                lastWasCR = (c == '\r');
                break;

            case PDAState::HEADER_VALUE:
                if (c == '\r') {
                    state = PDAState::HEADER_CR;
                    lastWasCR = true;
                    log(c, "HEADER_VALUE -> CR");
                } else {
                    currentHeaderValue.push_back(c);
                    log(c, "HEADER_VALUE char");
                    lastWasCR = false;
                }
                break;

            case PDAState::HEADER_CR:
                if (c == '\n' && lastWasCR) {
                    // header line ended; store header (trim trailing spaces)
                    // trim trailing spaces in value
                    while (!currentHeaderValue.empty() && (currentHeaderValue.back() == ' ' || currentHeaderValue.back() == '\t'))
                        currentHeaderValue.pop_back();

                    headers[currentHeaderName] = currentHeaderValue;
                    log(0, "store header: " + currentHeaderName + " -> " + currentHeaderValue);

                    // go back to HEADERS to either see next header or detect CRLF CRLF
                    state = PDAState::HEADERS;
                    log(c, "HEADER end -> HEADERS");
                    lastWasCR = false;
                    // consecutiveCRLFs will be incremented in HEADERS if this CRLF is followed by another CRLF, so set to 0 here
                    consecutiveCRLFs = 0;
                } else {
                    log(c, "expected LF after CR in header");
                    state = PDAState::ERROR;
                    return false;
                }
                break;

            case PDAState::BODY:
                // When in BODY, we either have a known content-length or accept to EOF.
                if (contentLengthRemaining >= 0) {
                    // consume fixed number of bytes
                    bodyBytesConsumed++;
                    log(c, "BODY byte " + std::to_string(bodyBytesConsumed));
                    if (bodyBytesConsumed == contentLengthRemaining) {
                        // exactly consumed the body; mark accept (but we still allow extra bytes in input? we'll accept only if at end)
                        log(0, "body complete (matched Content-Length)");
                        // If there are leftover characters after body, reject; but we will check after loop whether we've consumed entire input.
                    }
                } else {
                    // unknown length: consume until EOF
                    bodyBytesConsumed++;
                    log(c, "BODY byte (unknown length)");
                }
                lastWasCR = false;
                consecutiveCRLFs = 0;
                break;

            case PDAState::ERROR:
                log(c, "in ERROR state");
                return false;

            default:
                log(c, "unhandled state");
                state = PDAState::ERROR;
                return false;
        } // end switch
    } // end for each input char

    // after input exhausted, determine acceptance
    if (state == PDAState::BODY) {
        // if Content-Length specified, ensure we've read exactly that many bytes
        if (contentLengthRemaining >= 0) {
            if (bodyBytesConsumed == contentLengthRemaining) {
                log(0, "ACCEPT (body length matched)");
                state = PDAState::ACCEPT;
                // pop R marker to show completion
                popMarker("end request (R)");
                return true;
            } else {
                log(0, "REJECT (body length mismatch)");
                state = PDAState::ERROR;
                return false;
            }
        } else {
            // unknown length: accept whatever was provided (EOF ends message)
            log(0, "ACCEPT (EOF terminates body)");
            state = PDAState::ACCEPT;
            popMarker("end request (R)");
            return true;
        }
    }

    // If we ended in HEADERS because there were no headers and no body (rare) or input ended earlier,
    // accept only if we are exactly at the end-of-headers (i.e., consecutiveCRLFs==2)
    if (state == PDAState::HEADERS && consecutiveCRLFs == 2) {
        // no body
        log(0, "ACCEPT (no body)");
        state = PDAState::ACCEPT;
        popMarker("end request (R)");
        return true;
    }

    // If the input ended prematurely in other states => reject
    log(0, "REJECT (input ended in state other than BODY/HEADERS)");
    state = PDAState::ERROR;
    return false;
}
