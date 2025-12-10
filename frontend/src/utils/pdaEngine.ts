// TypeScript implementation of PDAEngine based on docs/HTTP-PDA_Validation/PDAEngine.cpp

export enum PDAState {
  START = 'START',
  METHOD = 'METHOD',
  SP1 = 'SP1',
  URI = 'URI',
  SP2 = 'SP2',
  VERSION = 'VERSION',
  REQUEST_LINE_CR = 'REQUEST_LINE_CR',
  HEADERS = 'HEADERS',
  HEADER_NAME = 'HEADER_NAME',
  HEADER_COLON = 'HEADER_COLON',
  HEADER_VALUE = 'HEADER_VALUE',
  HEADER_CR = 'HEADER_CR',
  BODY = 'BODY',
  ACCEPT = 'ACCEPT',
  ERROR = 'ERROR'
}

export interface PDATrace {
  state: PDAState;
  input: string; // character or 'ε' for epsilon
  stackTop: string;
  action: string;
  position?: number; // character position in input
}

export class PDAEngine {
  private stack: string[] = [];
  private state: PDAState = PDAState.START;
  private trace: PDATrace[] = [];
  private headers: Map<string, string> = new Map();
  private currentHeaderName: string = '';
  private currentHeaderValue: string = '';
  private currentMethod: string = '';
  private contentLengthRemaining: number = -1;
  private bodyBytesConsumed: number = 0;
  private previousStackTop: string = ''; // Track previous stack top for CRLF detection

  constructor() {
    this.reset();
  }

  reset(): void {
    this.state = PDAState.START;
    this.stack = [];
    this.trace = [];
    this.headers.clear();
    this.currentHeaderName = '';
    this.currentHeaderValue = '';
    this.currentMethod = '';
    this.contentLengthRemaining = -1;
    this.bodyBytesConsumed = 0;
    this.previousStackTop = '';
  }

  validate(httpMessage: string): boolean {
    this.reset();
    
    // Trim leading whitespace
    const trimmed = httpMessage.trimStart();
    if (trimmed.length === 0) {
      // Push markers even for empty input (for consistent stack state)
      this.pushStack('$', 'push bottom marker');
      this.pushStack('HTTP', 'push HTTP marker');
      this.log('', 'REJECT: Empty HTTP message', 0);
      this.state = PDAState.ERROR;
      return false;
    }
    
    // (1) ALWAYS push root markers at start, BEFORE any validation
    this.pushStack('$', 'push bottom marker');
    this.pushStack('HTTP', 'push HTTP marker');

    // Process the trimmed message character by character
    for (let i = 0; i < trimmed.length; i++) {
      // Stop immediately if we've reached ACCEPT or ERROR state
      if (this.state === PDAState.ACCEPT) {
        // Already accepted - stop consuming input
        return true;
      }
      if (this.state === PDAState.ERROR) {
        // Already in error - stop consuming input
        return false;
      }

      const c = trimmed[i];
      let action = 'consume';

      switch (this.state) {
        case PDAState.START:
          // Accumulate method character
          if (this.isMethodChar(c)) {
            this.state = PDAState.METHOD;
            this.currentMethod = c;
            this.log(c, 'begin METHOD (accumulating)', i);
          } else {
            // Invalid first character - error but stack still has $ and HTTP
            this.log(c, `expected METHOD (got: ${c.charCodeAt(0) === 0 ? 'null' : c === ' ' ? 'space' : c})`, i);
            this.state = PDAState.ERROR;
            return false;
          }
          break;
      
        case PDAState.METHOD:
          if (this.isMethodChar(c)) {
            // Accumulate method character
            this.currentMethod += c;
            this.log(c, `METHOD char (current: ${this.currentMethod})`, i);
          } else if (c === ' ') {
            // Validate full method after hitting space
            const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS', 'TRACE', 'CONNECT', 'PATCH'];
            if (!validMethods.includes(this.currentMethod)) {
              // Invalid method - error but stack still has $ and HTTP
              this.log(c, `invalid HTTP method: ${this.currentMethod}`, i);
              this.state = PDAState.ERROR;
              return false;
            }
            // Method is valid - push REQ_LINE marker and continue
            this.pushStack('REQ_LINE', 'push REQ_LINE marker - start request line parsing');
            this.state = PDAState.SP1;
            this.log(c, `METHOD -> SP1 (valid method: ${this.currentMethod})`, i);
            this.currentMethod = ''; // reset for next use
          } else {
            // Invalid character in method
            this.log(c, `invalid METHOD char (current: ${this.currentMethod})`, i);
            this.state = PDAState.ERROR;
            return false;
          }
          break;      

        case PDAState.SP1:
          if (this.isURIChar(c)) {
            this.state = PDAState.URI;
            this.log(c, 'begin URI', i);
          } else {
            this.log(c, 'expected URI', i);
            this.state = PDAState.ERROR;
            return false;
          }
          break;

        case PDAState.URI:
          if (this.isURIChar(c)) {
            this.log(c, 'URI char', i);
          } else if (c === ' ') {
            this.state = PDAState.SP2;
            this.log(c, 'URI -> SP2', i);
          } else {
            this.log(c, 'invalid URI char', i);
            this.state = PDAState.ERROR;
            return false;
          }
          break;

        case PDAState.SP2:
          if (this.isVersionChar(c)) {
            this.state = PDAState.VERSION;
            this.log(c, 'begin VERSION', i);
          } else {
            this.log(c, 'expected VERSION', i);
            this.state = PDAState.ERROR;
            return false;
          }
          break;

        case PDAState.VERSION:
          if (this.isVersionChar(c)) {
            this.log(c, 'VERSION char', i);
          } else if (c === '\r') {
            // (3) Push CR marker for CRLF sequence
            this.pushStack('CR', 'push CR marker');
            this.state = PDAState.REQUEST_LINE_CR;
            this.log(c, 'REQUEST_LINE_CR', i);
          } else {
            this.log(c, 'invalid VERSION char', i);
            this.state = PDAState.ERROR;
            return false;
          }
          break;

        case PDAState.REQUEST_LINE_CR:
          if (c === '\n') {
            // (3) Pop CR marker
            if (!this.popStack('CR', 'pop CR marker')) {
              this.log(c, 'REJECT: expected CR on stack', i);
              this.state = PDAState.ERROR;
              return false;
            }
            // (2) Pop REQ_LINE after first CRLF
            if (!this.popStack('REQ_LINE', 'pop REQ_LINE - request line complete')) {
              this.log(c, 'REJECT: expected REQ_LINE on stack', i);
              this.state = PDAState.ERROR;
              return false;
            }
            // (2) Push HEADERS when entering header scanning
            this.pushStack('HEADERS', 'push HEADERS marker - start header section');
            this.state = PDAState.HEADERS;
            this.log(c, 'REQUEST_LINE end -> HEADERS', i);
            this.currentHeaderName = '';
            this.currentHeaderValue = '';
          } else {
            this.log(c, 'expected LF after CR', i);
            this.state = PDAState.ERROR;
            return false;
          }
          break;

        case PDAState.HEADERS:
          if (c === '\r') {
            // (3) Push CR marker - remember what was on top before
            this.previousStackTop = this.stackTopString();
            this.pushStack('CR', 'push CR marker');
            this.log(c, 'maybe CR (headers)', i);
          } else if (c === '\n') {
            // (3) Pop CR marker
            if (!this.popStack('CR', 'pop CR marker')) {
              this.log(c, 'REJECT: expected CR on stack', i);
              this.state = PDAState.ERROR;
              return false;
            }
            this.log(c, 'CRLF (headers)', i);
            
            // (3) Check if we just popped CR and top is HEADERS and previous was HEADERS
            // This means we have CRLF CRLF (blank line ending headers)
            // Pattern: HEADERS -> push CR -> HEADERS,CR -> pop CR -> HEADERS
            //          Then: HEADERS -> push CR -> HEADERS,CR -> pop CR -> HEADERS
            //          If previousStackTop was HEADERS, we have the blank line
            if (this.stackTopString() === 'HEADERS' && this.previousStackTop === 'HEADERS') {
              // End of headers - pop HEADERS
              if (!this.popStack('HEADERS', 'pop HEADERS - end of header section')) {
                this.log(c, 'REJECT: expected HEADERS on stack', i);
                this.state = PDAState.ERROR;
                return false;
              }
              
              // (2) Push BODY marker if body must follow
              const contentLength = this.headers.get('content-length');
              if (contentLength) {
                const len = parseInt(contentLength, 10);
                if (!isNaN(len) && len >= 0) {
                  this.contentLengthRemaining = len;
                  if (len > 0) {
                    this.pushStack('BODY', 'push BODY marker - body section starts');
                    this.state = PDAState.BODY;
                    this.log('', 'end of headers -> BODY', i);
                  } else {
                    // Content-Length is 0, no body - continue to finish acceptance at end
                    this.contentLengthRemaining = 0;
                    this.log('', 'end of headers (no body, Content-Length=0)', i);
                    // Don't set ACCEPT here - wait until input is fully consumed
                  }
                } else {
                  this.log('', 'invalid Content-Length', i);
                  this.state = PDAState.ERROR;
                  return false;
                }
              } else {
                // No Content-Length header - no body expected - continue to finish acceptance at end
                this.contentLengthRemaining = -1;
                this.log('', 'end of headers (no body expected)', i);
                // Don't set ACCEPT here - wait until input is fully consumed
              }
            }
            // Reset previous stack top after processing
            this.previousStackTop = '';
          } else if (/[a-zA-Z]/.test(c)) {
            // Start of a new header line
            // (2) Push H marker for header
            this.pushStack('H', 'push H marker - start header parsing');
            this.state = PDAState.HEADER_NAME;
            this.currentHeaderName = c.toLowerCase();
            this.currentHeaderValue = '';
            this.log(c, 'begin HEADER_NAME', i);
            this.previousStackTop = ''; // Reset when starting new header
          } else {
            // Invalid header start character
            this.log(c, 'invalid header start', i);
            this.state = PDAState.ERROR;
            return false;
          }
          break;

        case PDAState.HEADER_NAME:
          if (c === ':') {
            this.state = PDAState.HEADER_COLON;
            this.log(c, "HEADER_NAME -> ':' -> HEADER_COLON", i);
            // Trim trailing spaces
            this.currentHeaderName = this.currentHeaderName.trim();
          } else if (/[a-zA-Z0-9-]/.test(c)) {
            this.currentHeaderName += c.toLowerCase();
            this.log(c, 'HEADER_NAME char', i);
          } else {
            this.log(c, 'invalid HEADER_NAME char', i);
            this.state = PDAState.ERROR;
            return false;
          }
          break;

        case PDAState.HEADER_COLON:
          if (c === ' ') {
            this.log(c, 'HEADER_COLON -> skip SPACE', i);
          } else if (c === '\r') {
            // (3) Push CR marker
            this.previousStackTop = this.stackTopString();
            this.pushStack('CR', 'push CR marker');
            this.currentHeaderValue = '';
            this.state = PDAState.HEADER_CR;
            this.log(c, 'HEADER_COLON -> CR (empty value)', i);
          } else {
            this.state = PDAState.HEADER_VALUE;
            this.currentHeaderValue = c;
            this.log(c, 'begin HEADER_VALUE', i);
          }
          break;

        case PDAState.HEADER_VALUE:
          if (c === '\r') {
            // (3) Push CR marker
            this.previousStackTop = this.stackTopString();
            this.pushStack('CR', 'push CR marker');
            this.state = PDAState.HEADER_CR;
            this.log(c, 'HEADER_VALUE -> CR', i);
          } else {
            this.currentHeaderValue += c;
            this.log(c, 'HEADER_VALUE char', i);
          }
          break;

        case PDAState.HEADER_CR:
          if (c === '\n') {
            // (3) Pop CR marker
            if (!this.popStack('CR', 'pop CR marker')) {
              this.log(c, 'REJECT: expected CR on stack', i);
              this.state = PDAState.ERROR;
              return false;
            }
            
            // Trim trailing spaces in value
            this.currentHeaderValue = this.currentHeaderValue.trim();
            this.headers.set(this.currentHeaderName, this.currentHeaderValue);
            this.log('', `store header: ${this.currentHeaderName} -> ${this.currentHeaderValue}`, i);

            // (2) Pop H marker - header complete
            if (!this.popStack('H', 'pop H marker - header complete')) {
              this.log(c, 'REJECT: expected H on stack', i);
              this.state = PDAState.ERROR;
              return false;
            }

            this.state = PDAState.HEADERS;
            this.log(c, 'HEADER end -> HEADERS', i);
            this.previousStackTop = '';
          } else {
            this.log(c, 'expected LF after CR in header', i);
            this.state = PDAState.ERROR;
            return false;
          }
          break;

        case PDAState.BODY:
          if (this.contentLengthRemaining >= 0) {
            this.bodyBytesConsumed++;
            this.log(c, `BODY byte ${this.bodyBytesConsumed}`, i);
            if (this.bodyBytesConsumed === this.contentLengthRemaining) {
              // (2) Pop BODY marker when body is complete
              if (!this.popStack('BODY', 'pop BODY marker - body complete')) {
                this.log('', 'REJECT: expected BODY on stack', i);
                this.state = PDAState.ERROR;
                return false;
              }
              this.log('', 'body complete (matched Content-Length)', i);
              // Body is complete - if this is the last character, we can accept
              // Otherwise, continue to next iteration where we'll check at end of loop
              if (i === trimmed.length - 1) {
                // Last character - finish acceptance now
                return this.finishAccept(i + 1);
              }
              // Not last character - continue processing (shouldn't happen with proper Content-Length)
            }
          } else {
            this.bodyBytesConsumed++;
            this.log(c, 'BODY byte (unknown length)', i);
          }
          break;

        default:
          // Handle ACCEPT, ERROR, and any unhandled states
          if (this.state === PDAState.ACCEPT) {
            // Should never reach here due to check at start of loop, but handle it anyway
            return true;
          }
          if (this.state === PDAState.ERROR) {
            // Should never reach here due to check at start of loop, but handle it anyway
            return false;
          }
          this.log(c, 'unhandled state', i);
          this.state = PDAState.ERROR;
          return false;
      }
    }

    // (7) Acceptance criteria: stack must be ["$"] and input fully consumed
    // After input exhausted, determine acceptance
    // Check if we're already in ACCEPT or ERROR state (shouldn't happen, but be safe)
    if (this.state === PDAState.ACCEPT) {
        return true;
    }
    if (this.state === PDAState.ERROR) {
        return false;
    }

    const finalPosition = trimmed.length;
    
    if (this.state === PDAState.BODY) {
        if (this.contentLengthRemaining >= 0) {
            if (this.bodyBytesConsumed === this.contentLengthRemaining) {
                // Body already popped in the loop - ready to finish acceptance
                const result = this.finishAccept(finalPosition);
                // finishAccept sets state to ACCEPT or ERROR, so we can return immediately
                return result;
            } else {
                this.log('', 'REJECT (body length mismatch)', finalPosition);
                this.state = PDAState.ERROR;
                return false;
            }
        } else {
            // Unknown length body - pop BODY marker if still on stack
            if (this.stackTopString() === 'BODY') {
                if (!this.popStack('BODY', 'pop BODY marker - EOF terminates body')) {
                    this.log('', 'REJECT: expected BODY on stack', finalPosition);
                    this.state = PDAState.ERROR;
                    return false;
                }
            }
            // Ready to finish acceptance
            const result = this.finishAccept(finalPosition);
            // finishAccept sets state to ACCEPT or ERROR, so we can return immediately
            return result;
        }
    } else if (this.state === PDAState.HEADERS) {
        // Headers ended without body - ready to finish acceptance
        const result = this.finishAccept(finalPosition);
        // finishAccept sets state to ACCEPT or ERROR, so we can return immediately
        return result;
    } else {
        this.log('', 'REJECT (input ended in invalid state)', finalPosition);
        this.state = PDAState.ERROR;
        return false;
    }
  }

  getTrace(): PDATrace[] {
    return this.trace;
  }

  getHeaders(): Map<string, string> {
    return this.headers;
  }

  private log(input: string, action: string, position?: number): void {
    const inputDesc = input === '' ? 'ε' : 
                     input === '\r' ? '\\r' : 
                     input === '\n' ? '\\n' : 
                     input;
    this.trace.push({
      state: this.state,
      input: inputDesc,
      stackTop: this.stackTopString(),
      action,
      position
    });
  }

  private stackTopString(): string {
    return this.stack.length > 0 ? this.stack[this.stack.length - 1] : '';
  }

  private pushStack(symbol: string, action: string): void {
    this.stack.push(symbol);
    this.log('', `${action} (push ${symbol})`);
  }

  private popStack(expectedSymbol: string, action: string): boolean {
    if (this.stack.length === 0) {
      this.log('', `${action} (pop failed: stack empty)`);
      return false;
    }
    const top = this.stack[this.stack.length - 1];
    if (top === expectedSymbol) {
      this.stack.pop();
      this.log('', `${action} (pop ${expectedSymbol})`);
      return true;
    } else {
      this.log('', `${action} (pop failed: expected ${expectedSymbol}, got ${top})`);
      return false;
    }
  }

  private isMethodChar(c: string): boolean {
    return /[A-Z]/.test(c);
  }

  private isURIChar(c: string): boolean {
    return /[a-zA-Z0-9/._?=&%-]/.test(c);
  }

  private isVersionChar(c: string): boolean {
    return /[a-zA-Z0-9./]/.test(c);
  }

  /**
   * Finish acceptance - only called once at the end when input is fully consumed.
   * Accepts ONLY if stack is reduced to ["$"].
   */
  private finishAccept(position: number): boolean {
    // Pop main HTTP marker
    if (!this.popStack('HTTP', 'pop HTTP marker - end request')) {
      this.log('', 'REJECT: expected HTTP on stack', position);
      this.state = PDAState.ERROR;
      return false;
    }

    // Accept only if stack == ["$"]
    if (this.stack.length !== 1 || this.stack[0] !== '$') {
      this.log('', `REJECT: stack not reduced to ["$"] (current: [${this.stack.join(', ')}])`, position);
      this.state = PDAState.ERROR;
      return false;
    }

    this.log('', 'ACCEPT (stack is ["$"], input consumed)', position);
    this.state = PDAState.ACCEPT;
    return true;
  }
}

