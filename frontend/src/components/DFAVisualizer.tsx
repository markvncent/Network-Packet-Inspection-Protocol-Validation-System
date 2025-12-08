/**
 * DFA Visualizer Component: Interactive DFA simulator and visualizer
 * Integrates DFA engine with visualization and input handling
 * Modular and standalone - can be placed in any container
 */

import React, { useState, useMemo, useCallback } from 'react';
import { DFAEngine, DFAExecutionState } from '../utils/dfaEngine';
import { DFA, maliciousPatternDFA, benignTrafficDFA, simpleDFA } from '../utils/dfa';
import './DFAVisualizer.css';

interface DFAVisualizerProps {
  /**
   * Which DFA to use for visualization
   * Options: 'malicious' | 'benign' | 'simple'
   */
  dfa?: DFA | 'malicious' | 'benign' | 'simple';

  /**
   * Callback when validation result changes
   */
  onValidationResult?: (isValid: boolean, state: DFAExecutionState) => void;

  /**
   * Initial input value
   */
  initialInput?: string;

  /**
   * Show detailed state information
   */
  showDetails?: boolean;

  /**
   * Enable step-by-step mode
   */
  enableStepMode?: boolean;
}

/**
 * Resolve DFA selection to actual DFA object
 */
function resolveDFA(dfa?: DFA | 'malicious' | 'benign' | 'simple'): DFA {
  if (!dfa) return maliciousPatternDFA;
  if (typeof dfa === 'string') {
    switch (dfa) {
      case 'malicious':
        return maliciousPatternDFA;
      case 'benign':
        return benignTrafficDFA;
      case 'simple':
        return simpleDFA;
      default:
        return maliciousPatternDFA;
    }
  }
  return dfa;
}

/**
 * DFAVisualizer Component
 * Main interactive component for DFA simulation and visualization
 */
export const DFAVisualizer: React.FC<DFAVisualizerProps> = ({
  dfa: dfaProp,
  onValidationResult,
  initialInput = '',
  showDetails = true,
  enableStepMode = false
}) => {
  const resolvedDFA = resolveDFA(dfaProp);
  const engine = useMemo(() => new DFAEngine(resolvedDFA), [resolvedDFA]);

  const [input, setInput] = useState(initialInput);
  const [executionState, setExecutionState] = useState<DFAExecutionState>(
    engine.getExecutionState()
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [isSteppingMode, setIsSteppingMode] = useState(enableStepMode);

  // Process input in real-time
  const processInput = useCallback((newInput: string) => {
    setInput(newInput);
    engine.reset();

    if (isSteppingMode) {
      // In stepping mode, only process up to the current step
      for (let i = 0; i < Math.min(stepIndex, newInput.length); i++) {
        engine.step(newInput[i]);
      }
    } else {
      // Process full input immediately
      engine.run(newInput);
    }

    const newState = engine.getExecutionState();
    setExecutionState(newState);

    if (onValidationResult) {
      onValidationResult(newState.isAccepting, newState);
    }
  }, [engine, isSteppingMode, stepIndex, onValidationResult]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processInput(e.target.value);
  };

  // Step forward one character
  const handleStep = () => {
    if (stepIndex < input.length) {
      setStepIndex(stepIndex + 1);
      engine.reset();
      for (let i = 0; i <= stepIndex; i++) {
        engine.step(input[i]);
      }
      const newState = engine.getExecutionState();
      setExecutionState(newState);

      if (onValidationResult) {
        onValidationResult(newState.isAccepting, newState);
      }
    }
  };

  // Step backward one character
  const handleStepBack = () => {
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
      engine.reset();
      for (let i = 0; i < stepIndex; i++) {
        engine.step(input[i]);
      }
      const newState = engine.getExecutionState();
      setExecutionState(newState);

      if (onValidationResult) {
        onValidationResult(newState.isAccepting, newState);
      }
    }
  };

  // Reset simulation
  const handleReset = () => {
    setInput('');
    setStepIndex(0);
    engine.reset();
    const newState = engine.getExecutionState();
    setExecutionState(newState);

    if (onValidationResult) {
      onValidationResult(false, newState);
    }
  };

  // Toggle step mode
  const handleToggleStepMode = () => {
    setIsSteppingMode(!isSteppingMode);
    setStepIndex(0);
    engine.reset();
    const newState = engine.getExecutionState();
    setExecutionState(newState);
  };

  const statusColor = executionState.isAccepting
    ? '#10b981'
    : executionState.currentState === 'dead'
    ? '#ef4444'
    : '#6b7280';

  const statusText = executionState.isAccepting
    ? 'PATTERN DETECTED'
    : executionState.currentState === 'dead'
    ? 'REJECTED'
    : 'PROCESSING';

  return (
    <div className="dfa-visualizer">
      {/* Header */}
      <div className="dfa-visualizer__header">
        <h3 className="dfa-visualizer__title">DFA Pattern Matcher</h3>
        <div className="dfa-status" style={{ borderColor: statusColor, backgroundColor: `${statusColor}20` }}>
          <div className="dfa-status__indicator" style={{ backgroundColor: statusColor }} />
          <span className="dfa-status__text">{statusText}</span>
        </div>
      </div>

      {/* Input Section */}
      <div className="dfa-input-section">
        <label className="dfa-label">Input String</label>
        <input
          type="text"
          className="dfa-input"
          value={input}
          onChange={handleInputChange}
          placeholder="Type to simulate DFA transitions..."
          disabled={isSteppingMode}
        />

        {isSteppingMode && (
          <div className="dfa-step-indicator">
            Step {stepIndex} / {input.length}
            {input.length > 0 && stepIndex < input.length && (
              <span className="dfa-current-char">Current: '{input[stepIndex]}'</span>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="dfa-controls">
        <button className="dfa-btn dfa-btn--reset" onClick={handleReset} title="Reset simulation">
          ↻ Reset
        </button>

        {enableStepMode && (
          <>
            <button
              className="dfa-btn dfa-btn--step-back"
              onClick={handleStepBack}
              disabled={stepIndex === 0}
              title="Previous step"
            >
              ← Step Back
            </button>

            <button
              className="dfa-btn dfa-btn--step-forward"
              onClick={handleStep}
              disabled={stepIndex >= input.length}
              title="Next step"
            >
              Step Forward →
            </button>

            <button
              className={`dfa-btn dfa-btn--toggle-mode ${isSteppingMode ? 'active' : ''}`}
              onClick={handleToggleStepMode}
              title="Toggle between continuous and step-by-step mode"
            >
              {isSteppingMode ? '⚙ Stepping Mode' : '▶ Play Mode'}
            </button>
          </>
        )}

        {!enableStepMode && (
          <button
            className="dfa-btn dfa-btn--toggle-mode"
            onClick={handleToggleStepMode}
            title="Enable step-by-step mode"
          >
            ⚙ Enable Step Mode
          </button>
        )}
      </div>

      {/* State Information */}
      {showDetails && (
        <div className="dfa-details">
          <div className="dfa-details__section">
            <h4 className="dfa-details__title">Current State</h4>
            <div
              className={`dfa-details__value ${executionState.isAccepting ? 'accepting' : ''}`}
              style={{ borderLeftColor: statusColor }}
            >
              {executionState.currentState}
            </div>
          </div>

          <div className="dfa-details__section">
            <h4 className="dfa-details__title">Path Taken</h4>
            <div className="dfa-path-list">
              {executionState.visited.map((state, idx) => (
                <span key={idx} className={`dfa-path-item ${state === executionState.currentState ? 'active' : ''}`}>
                  {state}
                  {idx < executionState.visited.length - 1 && <span className="dfa-arrow">→</span>}
                </span>
              ))}
            </div>
          </div>

          {executionState.transitionsTaken.length > 0 && (
            <div className="dfa-details__section">
              <h4 className="dfa-details__title">Transitions</h4>
              <div className="dfa-transitions-list">
                {executionState.transitionsTaken.map((trans, idx) => (
                  <div key={idx} className="dfa-transition-item">
                    <span className="dfa-trans-from">{trans.from}</span>
                    <span className="dfa-trans-symbol">'{trans.symbol}'</span>
                    <span className="dfa-trans-to">{trans.to}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="dfa-details__section">
            <h4 className="dfa-details__title">Statistics</h4>
            <div className="dfa-stats">
              <div className="dfa-stat-item">
                <span className="dfa-stat-label">Input Length:</span>
                <span className="dfa-stat-value">{executionState.inputProcessed.length}</span>
              </div>
              <div className="dfa-stat-item">
                <span className="dfa-stat-label">States Visited:</span>
                <span className="dfa-stat-value">{executionState.visited.length}</span>
              </div>
              <div className="dfa-stat-item">
                <span className="dfa-stat-label">Result:</span>
                <span className={`dfa-stat-value ${executionState.isAccepting ? 'accept' : 'reject'}`}>
                  {executionState.isAccepting ? '✓ ACCEPT' : '✗ REJECT'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DFAVisualizer;
