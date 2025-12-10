// TypeScript PDA Controller wrapper based on docs/HTTP-PDA_Validation/PDAController.cpp

import { PDAEngine, PDATrace } from './pdaEngine';

export class PDAController {
  private pda: PDAEngine;
  private payload: string = '';
  private traceIndex: number = 0;

  constructor() {
    this.pda = new PDAEngine();
    this.traceIndex = 0;
  }

  loadPacket(data: string): boolean {
    this.payload = data;
    this.traceIndex = 0;
    return true;
  }

  validate(): boolean {
    const ok = this.pda.validate(this.payload);
    this.traceIndex = 0; // reset stepping index
    return ok;
  }

  hasMoreSteps(): boolean {
    return this.traceIndex < this.pda.getTrace().length;
  }

  getNextTraceStep(): string {
    if (!this.hasMoreSteps()) return '';

    const trace = this.pda.getTrace();
    const t = trace[this.traceIndex++];

    const inputDesc = t.input;
    return `State=${t.state} Input=${inputDesc} StackTop=${t.stackTop} Action=${t.action}`;
  }

  getAllTrace(): PDATrace[] {
    return this.pda.getTrace();
  }

  getHeaders(): Map<string, string> {
    return this.pda.getHeaders();
  }
}

