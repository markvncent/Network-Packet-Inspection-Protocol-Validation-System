/**
 * DFA Engine Module: Pure logic layer for DFA state transitions
 * Framework-agnostic, testable DFA execution engine
 */

import { DFA } from "./dfa";

/**
 * Execution state of the DFA at any point in time
 */
export interface DFAExecutionState {
  currentState: string;
  visited: string[];
  isAccepting: boolean;
  inputProcessed: string;
  transitionsTaken: Array<{ from: string; symbol: string; to: string }>;
}

/**
 * DFAEngine - Pure logic implementation of DFA simulation
 * Handles state transitions, tracking, and acceptance testing
 */
export class DFAEngine {
  private dfa: DFA;
  private currentState: string;
  private visited: string[];
  private inputProcessed: string;
  private transitionsTaken: Array<{ from: string; symbol: string; to: string }>;

  constructor(dfa: DFA) {
    this.dfa = dfa;
    this.currentState = dfa.start;
    this.visited = [dfa.start];
    this.inputProcessed = "";
    this.transitionsTaken = [];
  }

  /**
   * Reset the engine to initial state
   */
  public reset(): void {
    this.currentState = this.dfa.start;
    this.visited = [this.dfa.start];
    this.inputProcessed = "";
    this.transitionsTaken = [];
  }

  /**
   * Process a single input symbol
   * @param symbol - Single character to process
   */
  public step(symbol: string): void {
    const transitions = this.dfa.transition[this.currentState];
    const nextState = transitions?.[symbol];

    const newState = nextState ?? "dead";
    this.transitionsTaken.push({
      from: this.currentState,
      symbol,
      to: newState
    });

    this.currentState = newState;
    this.visited.push(newState);
    this.inputProcessed += symbol;
  }

  /**
   * Run the entire input string through the DFA
   * @param input - Complete input string to process
   * @returns true if input is accepted, false otherwise
   */
  public run(input: string): boolean {
    this.reset();
    for (const char of input) {
      this.step(char);
    }
    return this.isAccepting();
  }

  /**
   * Get current state
   */
  public getCurrentState(): string {
    return this.currentState;
  }

  /**
   * Get all visited states in order
   */
  public getVisited(): string[] {
    return [...this.visited];
  }

  /**
   * Get all transitions taken
   */
  public getTransitions(): Array<{ from: string; symbol: string; to: string }> {
    return [...this.transitionsTaken];
  }

  /**
   * Get input processed so far
   */
  public getInputProcessed(): string {
    return this.inputProcessed;
  }

  /**
   * Check if current state is accepting
   */
  public isAccepting(): boolean {
    return this.dfa.accept.includes(this.currentState);
  }

  /**
   * Get the full execution state snapshot
   */
  public getExecutionState(): DFAExecutionState {
    return {
      currentState: this.currentState,
      visited: [...this.visited],
      isAccepting: this.isAccepting(),
      inputProcessed: this.inputProcessed,
      transitionsTaken: [...this.transitionsTaken]
    };
  }

  /**
   * Check if a state is valid in this DFA
   */
  public isValidState(state: string): boolean {
    return this.dfa.states.includes(state);
  }

  /**
   * Get the underlying DFA definition
   */
  public getDFA(): DFA {
    return this.dfa;
  }

  /**
   * Get all states in the DFA
   */
  public getStates(): string[] {
    return [...this.dfa.states];
  }

  /**
   * Get all accepting states
   */
  public getAcceptingStates(): string[] {
    return [...this.dfa.accept];
  }

  /**
   * Check if current state is a dead state
   */
  public isDeadState(): boolean {
    return this.currentState === "dead";
  }
}

/**
 * Batch process multiple inputs for testing
 */
export function batchProcessInputs(dfa: DFA, inputs: string[]): DFAExecutionState[] {
  const engine = new DFAEngine(dfa);
  return inputs.map(input => {
    engine.reset();
    engine.run(input);
    return engine.getExecutionState();
  });
}
