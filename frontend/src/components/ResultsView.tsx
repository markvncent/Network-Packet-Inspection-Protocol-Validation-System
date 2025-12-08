/**
 * Results View Component: Displays packet inspection and validation results
 * Integrates DFA visualizer with packet analysis output
 */

import React, { useState, useCallback } from 'react';
import DFAVisualizer from './DFAVisualizer';
import { DFAExecutionState } from '../utils/dfaEngine';
import { maliciousPatternDFA, benignTrafficDFA } from '../utils/dfa';
import './ResultsView.css';

export interface ResultsViewProps {
  /**
   * Packet payload to analyze
   */
  payload?: string;

  /**
   * DFA validation results from backend
   */
  validationResults?: {
    isValid: boolean;
    anomalies: string[];
    timestamp: number;
  };

  /**
   * Callback when user wants to re-inspect
   */
  onReInspect?: () => void;
}

/**
 * ResultsView Component
 * Displays DFA-based packet inspection with interactive visualizer
 */
export const ResultsView: React.FC<ResultsViewProps> = ({
  payload = '',
  validationResults,
  onReInspect
}) => {
  const [dfaResult, setDfaResult] = useState<{
    isValid: boolean;
    state: DFAExecutionState | null;
  }>({
    isValid: false,
    state: null
  });

  const [selectedDFA, setSelectedDFA] = useState<'malicious' | 'benign'>('malicious');

  const handleValidationResult = useCallback((isValid: boolean, state: DFAExecutionState) => {
    setDfaResult({ isValid, state });
  }, []);

  const statusColor = dfaResult.isValid ? '#10b981' : '#ef4444';
  const statusText = dfaResult.isValid ? 'PATTERN MATCHED' : 'NO MATCH';

  return (
    <div className="results-view">
      {/* Results Header */}
      <div className="results-header">
        <h3 className="results-title">DFA Inspection Results</h3>
        <div className="results-tabs">
          <button
            className={`results-tab ${selectedDFA === 'malicious' ? 'active' : ''}`}
            onClick={() => setSelectedDFA('malicious')}
          >
            🛡️ Malicious Pattern DFA
          </button>
          <button
            className={`results-tab ${selectedDFA === 'benign' ? 'active' : ''}`}
            onClick={() => setSelectedDFA('benign')}
          >
            ✓ Benign Traffic DFA
          </button>
        </div>
      </div>

      {/* Payload Display */}
      {payload && (
        <div className="payload-display">
          <h4 className="payload-label">Analyzed Payload</h4>
          <div className="payload-content">
            <code>{payload}</code>
          </div>
        </div>
      )}

      {/* DFA Visualizer */}
      <div className="dfa-section">
        <DFAVisualizer
          dfa={selectedDFA}
          initialInput={payload}
          onValidationResult={handleValidationResult}
          showDetails={true}
          enableStepMode={true}
        />
      </div>

      {/* Backend Validation Results */}
      {validationResults && (
        <div className="backend-results">
          <h4 className="results-label">Backend Validation</h4>
          <div
            className={`validation-status ${validationResults.isValid ? 'valid' : 'invalid'}`}
            style={{
              borderColor: validationResults.isValid ? '#10b981' : '#ef4444'
            }}
          >
            <span className="status-icon">
              {validationResults.isValid ? '✓' : '✗'}
            </span>
            <span className="status-text">
              {validationResults.isValid ? 'VALID' : 'MALICIOUS'}
            </span>
          </div>

          {validationResults.anomalies.length > 0 && (
            <div className="anomalies-list">
              <h5 className="anomalies-title">Detected Anomalies</h5>
              <ul className="anomalies">
                {validationResults.anomalies.map((anomaly, idx) => (
                  <li key={idx} className="anomaly-item">
                    <span className="anomaly-badge">⚠</span>
                    {anomaly}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="results-actions">
        <button className="results-btn results-btn--export" onClick={onReInspect}>
          📥 Download Report
        </button>
        <button className="results-btn results-btn--rerun" onClick={onReInspect}>
          🔄 Re-Inspect Packet
        </button>
      </div>
    </div>
  );
};

export default ResultsView;
