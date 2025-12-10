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
  private lastWasCR: boolean = false;
  private consecutiveCRLFs: number = 0;
  private headers: Map<string, string> = new Map();
  private currentHeaderName: string = '';
  private currentHeaderValue: string = '';
  private contentLengthRemaining: number = -1;
  private bodyBytesConsumed: number = 0;

  constructor() {
    this.reset();
  }

  reset(): void {
    this.state = PDAState.START;
    this.stack = ['$'];
    this.trace = [];
    this.lastWasCR = false;
    this.consecutiveCRLFs = 0;
    this.headers.clear();
    this.currentHeaderName = '';
    this.currentHeaderValue = '';
    this.contentLengthRemaining = -1;
    this.bodyBytesConsumed = 0;
  }

  validate(httpMessage: string): boolean {
    this.reset();
    
    // Trim leading whitespace and ensure we start with HTTP method
    const trimmed = httpMessage.trimStart();
    if (trimmed.length === 0) {
      this.log('', 'REJECT: Empty HTTP message');
      this.state = PDAState.ERROR;
      return false;
    }
    
    // Verify it starts with a valid HTTP method (must be uppercase letter)
    if (!/^[A-Z]/.test(trimmed)) {
      const firstChar = trimmed[0] || '';
      const charCode = firstChar.charCodeAt(0);
      this.log(firstChar, `REJECT: Does not start with HTTP method (char code: ${charCode})`);
      this.state = PDAState.ERROR;
      return false;
    }
    
    this.pushMarker('R', 'start request (R)');

    // Process the trimmed message character by character
    for (let i = 0; i < trimmed.length; i++) {
      const c = trimmed[i];
      let action = 'consume';

      switch (this.state) {
        case PDAState.START:
          if (this.isMethodChar(c)) {
            this.state = PDAState.METHOD;
            this.log(c, 'begin METHOD', i);
          } else {
            this.log(c, `expected METHOD (got: ${c.charCodeAt(0) === 0 ? 'null' : c === ' ' ? 'space' : c})`, i);
            this.state = PDAState.ERROR;
            return false;
          }
          this.consecutiveCRLFs = 0;
          this.lastWasCR = false;
          break;

        case PDAState.METHOD:
          if (this.isMethodChar(c)) {
            this.log(c, 'METHOD char', i);
          } else if (c === ' ') {
            this.state = PDAState.SP1;
            this.log(c, 'METHOD -> SP1', i);
          } else {
            this.log(c, 'invalid METHOD char', i);
            this.state = PDAState.ERROR;
            return false;
          }
          this.lastWasCR = false;
          this.consecutiveCRLFs = 0;
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
          this.lastWasCR = false;
          this.consecutiveCRLFs = 0;
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
          this.lastWasCR = false;
          this.consecutiveCRLFs = 0;
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
          this.lastWasCR = false;
          this.consecutiveCRLFs = 0;
          break;

        case PDAState.VERSION:
          if (this.isVersionChar(c)) {
            this.log(c, 'VERSION char', i);
          } else if (c === '\r') {
            this.state = PDAState.REQUEST_LINE_CR;
            this.log(c, 'REQUEST_LINE_CR', i);
            this.lastWasCR = true;
          } else {
            this.log(c, 'invalid VERSION char', i);
            this.state = PDAState.ERROR;
            return false;
          }
          break;

        case PDAState.REQUEST_LINE_CR:
          if (c === '\n') {
            this.state = PDAState.HEADERS;
            this.log(c, 'REQUEST_LINE end -> HEADERS', i);
            this.currentHeaderName = '';
            this.currentHeaderValue = '';
            this.consecutiveCRLFs = 0;
            this.lastWasCR = false;
          } else {
            this.log(c, 'expected LF after CR', i);
            this.state = PDAState.ERROR;
            return false;
          }
          break;

        case PDAState.HEADERS:
          if (c === '\r') {
            this.lastWasCR = true;
            this.log(c, 'maybe CR (headers)', i);
          } else if (c === '\n' && this.lastWasCR) {
            this.consecutiveCRLFs++;
            this.log(c, 'CRLF (headers)', i);
            this.lastWasCR = false;

            if (this.consecutiveCRLFs === 2) {
              this.state = PDAState.BODY;
              this.log('', 'end of headers -> BODY', i);
              const contentLength = this.headers.get('content-length');
              if (contentLength) {
                const len = parseInt(contentLength, 10);
                if (!isNaN(len) && len >= 0) {
                  this.contentLengthRemaining = len;
                } else {
                  this.log('', 'invalid Content-Length', i);
                  this.state = PDAState.ERROR;
                  return false;
                }
              } else {
                this.contentLengthRemaining = -1;
              }
            }
          } else {
            this.consecutiveCRLFs = 0;
            this.lastWasCR = false;
            if (/[a-zA-Z]/.test(c)) {
              this.state = PDAState.HEADER_NAME;
              this.currentHeaderName = c.toLowerCase();
              this.currentHeaderValue = '';
              this.log(c, 'begin HEADER_NAME', i);
            } else {
              this.log(c, 'invalid header start', i);
              this.state = PDAState.ERROR;
              return false;
            }
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
          this.lastWasCR = false;
          this.consecutiveCRLFs = 0;
          break;

        case PDAState.HEADER_COLON:
          if (c === ' ') {
            this.log(c, 'HEADER_COLON -> skip SPACE', i);
          } else if (c === '\r') {
            this.currentHeaderValue = '';
            this.state = PDAState.HEADER_CR;
            this.lastWasCR = true;
            this.log(c, 'HEADER_COLON -> CR (empty value)', i);
          } else {
            this.state = PDAState.HEADER_VALUE;
            this.currentHeaderValue = c;
            this.log(c, 'begin HEADER_VALUE', i);
          }
          this.lastWasCR = (c === '\r');
          break;

        case PDAState.HEADER_VALUE:
          if (c === '\r') {
            this.state = PDAState.HEADER_CR;
            this.lastWasCR = true;
            this.log(c, 'HEADER_VALUE -> CR', i);
          } else {
            this.currentHeaderValue += c;
            this.log(c, 'HEADER_VALUE char', i);
            this.lastWasCR = false;
          }
          break;

        case PDAState.HEADER_CR:
          if (c === '\n' && this.lastWasCR) {
            // Trim trailing spaces in value
            this.currentHeaderValue = this.currentHeaderValue.trim();
            this.headers.set(this.currentHeaderName, this.currentHeaderValue);
            this.log('', `store header: ${this.currentHeaderName} -> ${this.currentHeaderValue}`, i);

            this.state = PDAState.HEADERS;
            this.log(c, 'HEADER end -> HEADERS', i);
            this.lastWasCR = false;
            this.consecutiveCRLFs = 0;
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
              this.log('', 'body complete (matched Content-Length)', i);
            }
          } else {
            this.bodyBytesConsumed++;
            this.log(c, 'BODY byte (unknown length)', i);
          }
          this.lastWasCR = false;
          this.consecutiveCRLFs = 0;
          break;

        case PDAState.ERROR:
          this.log(c, 'in ERROR state', i);
          return false;

        default:
          this.log(c, 'unhandled state', i);
          this.state = PDAState.ERROR;
          return false;
      }
    }

    // After input exhausted, determine acceptance
    if (this.state === PDAState.BODY) {
      if (this.contentLengthRemaining >= 0) {
        if (this.bodyBytesConsumed === this.contentLengthRemaining) {
          this.log('', 'ACCEPT (body length matched)', httpMessage.length);
          this.state = PDAState.ACCEPT;
          this.popMarker('end request (R)');
          return true;
        } else {
          this.log('', 'REJECT (body length mismatch)', httpMessage.length);
          this.state = PDAState.ERROR;
          return false;
        }
      } else {
        this.log('', 'ACCEPT (EOF terminates body)', httpMessage.length);
        this.state = PDAState.ACCEPT;
        this.popMarker('end request (R)');
        return true;
      }
    }

    if (this.state === PDAState.HEADERS && this.consecutiveCRLFs === 2) {
      this.log('', 'ACCEPT (no body)', httpMessage.length);
      this.state = PDAState.ACCEPT;
      this.popMarker('end request (R)');
      return true;
    }

    this.log('', 'REJECT (input ended in state other than BODY/HEADERS)', httpMessage.length);
    this.state = PDAState.ERROR;
    return false;
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

  private pushMarker(m: string, action: string): void {
    this.stack.push(m);
    this.log('', action + ' (push)');
  }

  private popMarker(action: string): void {
    if (this.stack.length > 0 && this.stack[this.stack.length - 1] !== '$') {
      this.stack.pop();
      this.log('', action + ' (pop)');
    } else {
      this.log('', action + ' (pop failed)');
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
}

