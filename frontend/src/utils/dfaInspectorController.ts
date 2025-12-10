/**
 * DFA Inspector Controller
 * Provides step-by-step inspection simulation for visualization
 */

import { DFAInspector, DFAInspectionOptions, PatternMatch, MatchStep } from './dfaInspector';
import { ACTrieData } from './ahoCorasick';

export interface DFASimulationState {
  currentStep: number;
  currentNodeId: number;
  currentMatches: PatternMatch[];
  isComplete: boolean;
  isMalicious: boolean;
}

export class DFAInspectorController {
  private inspector: DFAInspector;
  private payload: Uint8Array | null = null;
  private currentState: DFASimulationState | null = null;
  private allSteps: MatchStep[] = [];
  private allMatches: PatternMatch[] = [];

  constructor(patterns?: string[], caseSensitive: boolean = false) {
    this.inspector = new DFAInspector(patterns, caseSensitive);
  }

  /**
   * Load payload for inspection
   */
  loadPayload(payload: Uint8Array): void {
    this.payload = payload;
    this.currentState = null;
    this.allSteps = [];
    this.allMatches = [];
  }

  /**
   * Run full inspection and get results
   */
  inspect(): {
    isMalicious: boolean;
    matches: PatternMatch[];
    steps: MatchStep[];
    trieData: ACTrieData | null;
  } {
    if (!this.payload) {
      return {
        isMalicious: false,
        matches: [],
        steps: [],
        trieData: this.inspector.getTrieData()
      };
    }

    const result = this.inspector.inspect(this.payload);
    this.allSteps = result.steps;
    this.allMatches = result.matches;
    
    return result;
  }

  /**
   * Get trie data for visualization
   */
  getTrieData(): ACTrieData | null {
    return this.inspector.getTrieData();
  }

  /**
   * Get all matches found during inspection
   */
  getMatches(): PatternMatch[] {
    return this.allMatches;
  }

  /**
   * Get all steps from inspection
   */
  getSteps(): MatchStep[] {
    return this.allSteps;
  }

  /**
   * Get current simulation state
   */
  getState(): DFASimulationState | null {
    return this.currentState;
  }

  /**
   * Reset simulation state
   */
  reset(): void {
    this.currentState = null;
  }

  /**
   * Step through inspection one byte at a time
   * Returns the next step or null if complete
   */
  step(): MatchStep | null {
    if (!this.payload) {
      return null;
    }

    // If we haven't run inspection yet, run it first
    if (this.allSteps.length === 0) {
      this.inspect();
    }

    const currentStepIndex = this.currentState?.currentStep ?? -1;
    
    if (currentStepIndex + 1 >= this.allSteps.length) {
      // Inspection complete
      if (this.currentState) {
        this.currentState.isComplete = true;
      }
      return null;
    }

    const nextStepIndex = currentStepIndex + 1;
    const nextStep = this.allSteps[nextStepIndex];
    
    // Collect all matches that have been found up to this point
    const matchesUpToStep = this.allMatches.filter(m => {
      // Match is found at position m.position, so it's visible at step m.position
      return m.position <= nextStepIndex;
    });

    this.currentState = {
      currentStep: nextStepIndex,
      currentNodeId: nextStep.nodeId,
      currentMatches: matchesUpToStep,
      isComplete: nextStepIndex >= this.allSteps.length - 1,
      isMalicious: matchesUpToStep.length > 0
    };

    return nextStep;
  }

  /**
   * Check if there are more steps
   */
  hasMoreSteps(): boolean {
    if (!this.payload || this.allSteps.length === 0) {
      return false;
    }
    const currentStepIndex = this.currentState?.currentStep ?? -1;
    return currentStepIndex + 1 < this.allSteps.length;
  }
}

