/**
 * Results View Component: Pure visualizer for packet inspection results
 * Auto-detects benign vs malicious and displays DFA state transitions
 */

import React, { useState, useCallback } from 'react';
import DFAVisualizer from './DFAVisualizer';
import { DFAExecutionState } from '../utils/dfaEngine';
import { PacketInspectionResult } from '../utils/dfaPacketInspection';
import './ResultsView.css';

export interface ResultsViewProps {
  /**
   * Packet payload to visualize (from uploaded file)
   */
  payload?: string;

  /**
   * Auto-detected packet inspection result
   */
  inspectionResult?: PacketInspectionResult;

  /**
   * Callback when user wants to re-inspect different packet
   */
  onReInspect?: () => void;
}

/**
 * ResultsView Component - Pure Visualizer
 * Displays auto-detected packet classification and DFA state transitions
 * No manual input or DFA selection - all driven by uploaded packet data
 */
export const ResultsView: React.FC<ResultsViewProps> = ({
  payload = '',
  inspectionResult,
  onReInspect
}) => {
  const [dfaState, setDfaState] = useState<DFAExecutionState | null>(null);

  const handleValidationResult = useCallback((isValid: boolean, state: DFAExecutionState) => {
    setDfaState(state);
  }, []);

  if (!payload || !inspectionResult) {
    return (
      <div className="results-view results-view--empty">
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No Packet Inspection Data</h3>
          <p>Upload a packet and click "Packet Inspection" to visualize results here</p>
        </div>
      </div>
    );
  }

  const isBeginClassification = inspectionResult.classification === 'benign';
  const statusColor = isBeginClassification ? '#10b981' : '#ef4444';
  const statusIcon = isBeginClassification ? '✓' : '⚠';
  const statusText = isBeginClassification
    ? 'SAFE - BENIGN TRAFFIC'
    : 'ALERT - MALICIOUS TRAFFIC';

  return (
    <div className="results-view">
      {/* Classification Status Bar */}
      <div className="results-header">
        <div className="classification-box" style={{ borderColor: statusColor }}>
          <div className="classification-status">
            <span className="status-icon" style={{ color: statusColor }}>
              {statusIcon}
            </span>
            <span className="status-text">{statusText}</span>
            <span className="confidence-badge">
              {(inspectionResult.confidence * 100).toFixed(1)}% confidence
            </span>
          </div>
        </div>
      </div>

      {/* DFA Classification Type */}
      <div className="classification-info">
        <div className="info-item">
          <span className="info-label">Classification:</span>
          <span className="info-value">{inspectionResult.classification.toUpperCase()}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Payload Size:</span>
          <span className="info-value">{inspectionResult.details.payloadSize} bytes</span>
        </div>
        <div className="info-item">
          <span className="info-label">DFA Used:</span>
          <span className="info-value">
            {isBeginClassification ? 'Benign Traffic DFA' : 'Malicious Pattern DFA'}
          </span>
        </div>
      </div>

      {/* Payload Display */}
      <div className="payload-section">
        <h4 className="section-title">Analyzed Payload</h4>
        <div className="payload-display">
          <code className="payload-code">
            {payload.length > 500 ? `${payload.substring(0, 500)}...` : payload}
          </code>
          {payload.length > 500 && (
            <div className="payload-truncated">+ {payload.length - 500} more characters</div>
          )}
        </div>
      </div>

      {/* DFA Visualization */}
      <div className="dfa-visualizer-section">
        <h4 className="section-title">DFA State Transitions</h4>
        <p className="section-subtitle">
          Character-by-character processing through {isBeginClassification ? 'benign' : 'malicious'} pattern
          matcher
        </p>
        <DFAVisualizer
          dfa={isBeginClassification ? 'benign' : 'malicious'}
          initialInput={payload}
          onValidationResult={handleValidationResult}
          showDetails={true}
          enableStepMode={true}
        />
      </div>

      {/* Detected Signatures/Indicators */}
      {inspectionResult.details.detectedSignatures.length > 0 && (
        <div className="signatures-section">
          <h4 className="section-title">
            {isBeginClassification ? '✓ Detected Benign Indicators' : '⚠ Detected Suspicious Indicators'}
          </h4>
          <div className="signatures-list">
            {inspectionResult.details.detectedSignatures.map((sig, idx) => (
              <div key={idx} className="signature-item">
                <span className="signature-badge">
                  {isBeginClassification ? '✓' : '⚠'}
                </span>
                <span className="signature-text">{sig}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suspicious Indicators (if malicious) */}
      {!isBeginClassification && inspectionResult.details.suspiciousIndicators.length > 0 && (
        <div className="indicators-section indicators-section--malicious">
          <h4 className="section-title">🛑 Malicious Indicators</h4>
          <div className="indicators-list">
            {inspectionResult.details.suspiciousIndicators.map((indicator, idx) => (
              <div key={idx} className="indicator-item indicator-item--malicious">
                <span className="indicator-icon">🛑</span>
                <span className="indicator-text">{indicator}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Matched Patterns */}
      {inspectionResult.matchedPatterns.length > 0 && (
        <div className="patterns-section">
          <h4 className="section-title">Pattern Matches</h4>
          <div className="patterns-list">
            {inspectionResult.matchedPatterns.map((pattern, idx) => (
              <div key={idx} className="pattern-item">
                <span className="pattern-badge">→</span>
                <span className="pattern-text">{pattern}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* State Path Details */}
      {dfaState && (
        <div className="state-path-section">
          <h4 className="section-title">State Traversal Path</h4>
          <div className="state-path">
            <div className="state-sequence">
              {dfaState.visited.slice(0, 10).map((state, idx) => (
                <React.Fragment key={idx}>
                  <div className={`state-node ${state === dfaState.currentState ? 'current' : ''}`}>
                    {state}
                  </div>
                  {idx < Math.min(9, dfaState.visited.length - 1) && (
                    <div className="state-arrow">→</div>
                  )}
                </React.Fragment>
              ))}
              {dfaState.visited.length > 10 && (
                <div className="state-truncated">... +{dfaState.visited.length - 10} more</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="results-actions">
        {onReInspect && (
          <button className="action-btn action-btn--secondary" onClick={onReInspect}>
            📂 Inspect Different Packet
          </button>
        )}
        <button
          className="action-btn action-btn--primary"
          onClick={() => {
            const result = {
              classification: inspectionResult.classification,
              confidence: inspectionResult.confidence,
              payload: payload.substring(0, 100) + (payload.length > 100 ? '...' : ''),
              timestamp: new Date().toISOString()
            };
            const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `inspection_result_${Date.now()}.json`;
            a.click();
          }}
        >
          💾 Export Result
        </button>
      </div>
    </div>
  );
};

export default ResultsView;
