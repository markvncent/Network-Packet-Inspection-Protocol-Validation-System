import React, { useEffect, useRef, useState } from 'react';
import './ProtocolValidationVisualizer.css';

export interface ProtocolValidationState {
  status: 'idle' | 'validating' | 'valid' | 'invalid';
  protocol?: string;
  validationSteps?: ValidationStep[];
  errors?: ValidationError[];
  warnings?: ValidationWarning[];
}

export interface ValidationStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message?: string;
  timestamp?: number;
}

export interface ValidationError {
  id: string;
  step: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  position?: number;
}

export interface ValidationWarning {
  id: string;
  step: string;
  message: string;
  position?: number;
}

interface ProtocolValidationVisualizerProps {
  validationState?: ProtocolValidationState;
  packetInfo?: {
    protocol?: string;
    srcIP?: string;
    dstIP?: string;
    length?: number;
  };
  onStepClick?: (stepId: string) => void;
}

/**
 * ProtocolValidationVisualizer: Visualizes protocol validation process
 * - Shows validation steps and their status
 * - Displays protocol-specific validation rules
 * - Tracks validation progress and errors
 * - Modular design for easy tracking and extension
 */
const ProtocolValidationVisualizer: React.FC<ProtocolValidationVisualizerProps> = ({
  validationState,
  packetInfo,
  onStepClick
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  // Default validation steps based on protocol
  const defaultSteps: ValidationStep[] = [
    { id: 'header', name: 'Header Validation', status: 'pending' },
    { id: 'syntax', name: 'Syntax Check', status: 'pending' },
    { id: 'semantics', name: 'Semantic Validation', status: 'pending' },
    { id: 'security', name: 'Security Checks', status: 'pending' }
  ];

  const steps = validationState?.validationSteps || defaultSteps;
  const protocol = validationState?.protocol || packetInfo?.protocol || 'HTTP';

  const toggleStep = (stepId: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
    onStepClick?.(stepId);
  };

  const getStatusIcon = (status: ValidationStep['status']) => {
    switch (status) {
      case 'passed':
        return (
          <svg className="status-icon status-icon--passed" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        );
      case 'failed':
        return (
          <svg className="status-icon status-icon--failed" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        );
      case 'running':
        return (
          <svg className="status-icon status-icon--running status-icon--spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 3v9" strokeLinecap="round" />
          </svg>
        );
      default:
        return (
          <svg className="status-icon status-icon--pending" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="3" opacity="0.5" />
          </svg>
        );
    }
  };

  const getStatusColor = (status: ValidationStep['status']) => {
    switch (status) {
      case 'passed': return '#22c55e';
      case 'failed': return '#ef4444';
      case 'running': return '#a855f7';
      default: return '#6b7280';
    }
  };

  return (
    <div ref={containerRef} className="protocol-validation-visualizer">
      {/* Protocol Header */}
      <div className="protocol-header">
        <div className="protocol-info">
          <span className="protocol-label">Protocol:</span>
          <span className="protocol-name">{protocol}</span>
        </div>
        {packetInfo && (
          <div className="packet-info">
            {packetInfo.srcIP && (
              <span className="packet-info-item">
                <span className="packet-info-label">Source:</span>
                <span className="packet-info-value">{packetInfo.srcIP}</span>
              </span>
            )}
            {packetInfo.dstIP && (
              <span className="packet-info-item">
                <span className="packet-info-label">Destination:</span>
                <span className="packet-info-value">{packetInfo.dstIP}</span>
              </span>
            )}
            {packetInfo.length !== undefined && (
              <span className="packet-info-item">
                <span className="packet-info-label">Length:</span>
                <span className="packet-info-value">{packetInfo.length} B</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Validation Status */}
      {validationState && (
        <div className={`validation-status validation-status--${validationState.status}`}>
          <div className="validation-status-icon">
            {validationState.status === 'valid' && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
            {validationState.status === 'invalid' && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            )}
            {validationState.status === 'validating' && (
              <svg className="status-icon--spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 3v9" strokeLinecap="round" />
              </svg>
            )}
          </div>
          <div className="validation-status-text">
            <span className="validation-status-label">Validation Status:</span>
            <span className="validation-status-value">
              {validationState.status === 'valid' ? 'Valid' : 
               validationState.status === 'invalid' ? 'Invalid' :
               validationState.status === 'validating' ? 'Validating...' : 'Idle'}
            </span>
          </div>
        </div>
      )}

      {/* Validation Steps */}
      <div className="validation-steps">
        <h3 className="validation-steps-title">Validation Steps</h3>
        <div className="validation-steps-list">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`validation-step validation-step--${step.status} ${
                expandedSteps.has(step.id) ? 'validation-step--expanded' : ''
              }`}
              onClick={() => toggleStep(step.id)}
            >
              <div className="validation-step-header">
                <div className="validation-step-status">
                  {getStatusIcon(step.status)}
                </div>
                <div className="validation-step-content">
                  <span className="validation-step-name">{step.name}</span>
                  {step.message && (
                    <span className="validation-step-message">{step.message}</span>
                  )}
                </div>
                <div className="validation-step-actions">
                  <svg 
                    className={`validation-step-expand ${expandedSteps.has(step.id) ? 'expanded' : ''}`}
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>
              {expandedSteps.has(step.id) && step.message && (
                <div className="validation-step-details">
                  <p>{step.message}</p>
                  {step.timestamp && (
                    <span className="validation-step-timestamp">
                      {new Date(step.timestamp).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Errors and Warnings */}
      {((validationState?.errors && validationState.errors.length > 0) || 
       (validationState?.warnings && validationState.warnings.length > 0)) && (
        <div className="validation-issues">
          {validationState.errors && validationState.errors.length > 0 && (
            <div className="validation-errors">
              <h4 className="validation-issues-title">Errors</h4>
              {validationState.errors.map((error) => (
                <div key={error.id} className="validation-issue validation-issue--error">
                  <span className="validation-issue-step">{error.step}:</span>
                  <span className="validation-issue-message">{error.message}</span>
                  {error.position !== undefined && (
                    <span className="validation-issue-position">@ {error.position}</span>
                  )}
                </div>
              ))}
            </div>
          )}
          {validationState.warnings && validationState.warnings.length > 0 && (
            <div className="validation-warnings">
              <h4 className="validation-issues-title">Warnings</h4>
              {validationState.warnings.map((warning) => (
                <div key={warning.id} className="validation-issue validation-issue--warning">
                  <span className="validation-issue-step">{warning.step}:</span>
                  <span className="validation-issue-message">{warning.message}</span>
                  {warning.position !== undefined && (
                    <span className="validation-issue-position">@ {warning.position}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProtocolValidationVisualizer;

