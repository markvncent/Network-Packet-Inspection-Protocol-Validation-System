/**
 * Pattern State Diagram Visualization
 * Shows a simplified state machine diagram for pattern matching:
 * Start → Pattern Nodes → Malicious End
 */

import React, { useEffect, useState, useMemo } from 'react';
import { MatchStep, PatternMatch } from '../utils/dfaInspector';
import './PatternStateDiagram.css';

interface PatternStateDiagramProps {
  patterns: string[];
  currentStep: MatchStep | null;
  currentMatches: PatternMatch[];
  isComplete: boolean;
  isMalicious: boolean;
}

interface PatternProgress {
  pattern: string;
  matchedLength: number;
  isComplete: boolean;
}

const PatternStateDiagram: React.FC<PatternStateDiagramProps> = ({
  patterns,
  currentStep,
  currentMatches,
  isComplete,
  isMalicious
}) => {
  const [patternProgress, setPatternProgress] = useState<Map<string, PatternProgress>>(new Map());
  const [activePatterns, setActivePatterns] = useState<Set<string>>(new Set());
  const [currentState, setCurrentState] = useState<'start' | 'pattern' | 'malicious'>('start');
  const [isBlinking, setIsBlinking] = useState(false);
  const [characterHistory, setCharacterHistory] = useState<string>('');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [lastMatchedPattern, setLastMatchedPattern] = useState<string | null>(null);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  // Initialize pattern progress map
  useEffect(() => {
    const progressMap = new Map<string, PatternProgress>();
    patterns.forEach(pattern => {
      progressMap.set(pattern, {
        pattern,
        matchedLength: 0,
        isComplete: false
      });
    });
    setPatternProgress(progressMap);
    setCharacterHistory('');
  }, [patterns]);

  // Track pattern matching progress based on current step
  useEffect(() => {
    if (!currentStep) {
      // No step means we're at start or idle
      setActivePatterns(new Set());
      setCurrentState('start');
      setCharacterHistory('');
      return;
    }

    // Check if any pattern was just completed (from outputs)
    if (currentStep.outputs && currentStep.outputs.length > 0) {
      // Pattern completed - go to malicious state
      setCurrentState('malicious');
      // Track the first matched pattern as the last matched
      if (currentStep.outputs.length > 0) {
        setLastMatchedPattern(currentStep.outputs[0]);
      }
      currentStep.outputs.forEach(pattern => {
        setPatternProgress(prev => {
          const next = new Map(prev);
          const existing = next.get(pattern);
          if (existing) {
            next.set(pattern, {
              ...existing,
              matchedLength: pattern.length,
              isComplete: true
            });
          } else {
            next.set(pattern, {
              pattern,
              matchedLength: pattern.length,
              isComplete: true
            });
          }
          return next;
        });
      });
      setActivePatterns(new Set(currentStep.outputs));
      return;
    }

    // Update character history (keep last max pattern length characters)
    const maxPatternLength = Math.max(...patterns.map(p => p.length), 20);
    const char = currentStep.character.toLowerCase();
    setCharacterHistory(prev => {
      const updated = (prev + char).slice(-maxPatternLength);
      return updated;
    });

    // Check which patterns are being matched using character history
    const matchingPatterns = new Set<string>();
    
    // For each pattern, check if the character history ends with a prefix of that pattern
    patterns.forEach(pattern => {
      const progress = patternProgress.get(pattern);
      if (!progress || progress.isComplete) return;

      const patternLower = pattern.toLowerCase();
      const history = characterHistory.toLowerCase();
      
      // Check if history ends with a prefix of the pattern
      for (let len = Math.min(history.length, patternLower.length); len > 0; len--) {
        const historySuffix = history.slice(-len);
        const patternPrefix = patternLower.slice(0, len);
        
        if (historySuffix === patternPrefix) {
          // Found a match of length len
          matchingPatterns.add(pattern);
          setPatternProgress(prev => {
            const next = new Map(prev);
            const existing = next.get(pattern);
            if (existing && existing.matchedLength < len) {
              next.set(pattern, {
                ...existing,
                matchedLength: len
              });
            } else if (!existing) {
              next.set(pattern, {
                pattern,
                matchedLength: len,
                isComplete: false
              });
            }
            return next;
          });
          break;
        }
      }
      
      // If no match found and we had progress, reset it
      if (!matchingPatterns.has(pattern) && progress.matchedLength > 0) {
        // Only reset if the last character doesn't match any pattern start
        const lastChar = char;
        const patternStarts = patterns.some(p => p.toLowerCase().startsWith(lastChar));
        if (!patternStarts) {
          setPatternProgress(prev => {
            const next = new Map(prev);
            const existing = next.get(pattern);
            if (existing) {
              next.set(pattern, {
                ...existing,
                matchedLength: 0
              });
            }
            return next;
          });
        }
      }
    });

    if (matchingPatterns.size > 0) {
      setActivePatterns(matchingPatterns);
      setCurrentState('pattern');
    } else {
      // No active matches - check if we should reset to start
      const hasAnyProgress = Array.from(patternProgress.values()).some(p => p.matchedLength > 0);
      if (!hasAnyProgress) {
        setActivePatterns(new Set());
        setCurrentState('start');
      }
    }
  }, [currentStep, patterns, patternProgress]);

  // Handle completion state
  useEffect(() => {
    if (isComplete) {
      if (isMalicious || currentMatches.length > 0) {
        setCurrentState('malicious');
        // Track the last matched pattern from current matches (use the most recent one)
        if (currentMatches.length > 0) {
          // Sort by position descending to get the most recent match
          const sortedMatches = [...currentMatches].sort((a, b) => b.position - a.position);
          setLastMatchedPattern(sortedMatches[0].pattern);
        }
      } else {
        setCurrentState('start');
        setLastMatchedPattern(null);
      }
    }
  }, [isComplete, isMalicious, currentMatches]);

  // Reset last matched pattern when starting new inspection
  useEffect(() => {
    if (!currentStep && !isComplete) {
      setLastMatchedPattern(null);
    }
  }, [currentStep, isComplete]);

  // Blinking animation for start node when idle
  useEffect(() => {
    if (currentState === 'start' && !currentStep && !isComplete) {
      const interval = setInterval(() => {
        setIsBlinking(prev => !prev);
      }, 500);
      return () => clearInterval(interval);
    } else {
      setIsBlinking(false);
    }
  }, [currentState, currentStep, isComplete]);

  // Calculate layout positions
  const layout = useMemo(() => {
    const startPos = { x: 50, y: 50 };
    const maliciousPos = { x: 50, y: 250 };
    const patternNodes: Array<{ pattern: string; x: number; y: number }> = [];
    
    const cols = Math.ceil(Math.sqrt(patterns.length));
    const rows = Math.ceil(patterns.length / cols);
    const nodeSpacing = 120;
    const startX = 200;
    const startY = 50;
    
    patterns.forEach((pattern, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      patternNodes.push({
        pattern,
        x: startX + col * nodeSpacing,
        y: startY + row * nodeSpacing
      });
    });

    return { startPos, maliciousPos, patternNodes };
  }, [patterns]);

  // Calculate viewBox based on zoom level and pan offset
  const viewBox = useMemo(() => {
    const baseWidth = 600;
    const baseHeight = 350;
    const centerX = baseWidth / 2;
    const centerY = baseHeight / 2;
    const width = baseWidth / zoomLevel;
    const height = baseHeight / zoomLevel;
    const x = centerX - width / 2 + panX;
    const y = centerY - height / 2 + panY;
    return `${x} ${y} ${width} ${height}`;
  }, [zoomLevel, panX, panY]);

  // Zoom controls
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.2, 0.5));
  };

  const handleZoomReset = () => {
    setZoomLevel(1);
    setPanX(0);
    setPanY(0);
  };

  // Pan/drag handlers
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return; // Only handle left mouse button
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging || !dragStart) return;
    
    const deltaX = (e.clientX - dragStart.x) / zoomLevel;
    const deltaY = (e.clientY - dragStart.y) / zoomLevel;
    
    setPanX(prev => prev - deltaX);
    setPanY(prev => prev - deltaY);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX, y: touch.clientY });
    e.preventDefault();
  };

  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (!isDragging || !dragStart || e.touches.length !== 1) return;
    const touch = e.touches[0];
    
    const deltaX = (touch.clientX - dragStart.x) / zoomLevel;
    const deltaY = (touch.clientY - dragStart.y) / zoomLevel;
    
    setPanX(prev => prev - deltaX);
    setPanY(prev => prev - deltaY);
    setDragStart({ x: touch.clientX, y: touch.clientY });
    e.preventDefault();
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  return (
    <div className="pattern-state-diagram">
      <div className="pattern-state-diagram__header">
        <div className="pattern-state-diagram__title">
          Pattern Matching State Diagram
          <span className="pattern-state-diagram__hint">(Drag to pan)</span>
        </div>
        <div className="pattern-state-diagram__zoom-controls">
          <button 
            className="pattern-state-diagram__zoom-btn" 
            onClick={handleZoomOut}
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            −
          </button>
          <button 
            className="pattern-state-diagram__zoom-btn" 
            onClick={handleZoomReset}
            title="Reset Zoom & Pan"
            aria-label="Reset Zoom & Pan"
          >
            ⌂
          </button>
          <button 
            className="pattern-state-diagram__zoom-btn" 
            onClick={handleZoomIn}
            title="Zoom In"
            aria-label="Zoom In"
          >
            +
          </button>
          <span className="pattern-state-diagram__zoom-level">{Math.round(zoomLevel * 100)}%</span>
        </div>
      </div>
      <svg 
        className="pattern-state-diagram__svg" 
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        {/* Connections: Start → Pattern Nodes */}
        {layout.patternNodes.map(({ pattern, x, y }) => (
          <line
            key={`start-${pattern}`}
            x1={layout.startPos.x + 30}
            y1={layout.startPos.y + 20}
            x2={x}
            y2={y + 20}
            className={`pattern-state-diagram__edge ${
              activePatterns.has(pattern) ? 'pattern-state-diagram__edge--active' : ''
            }`}
            strokeWidth="2"
          />
        ))}

        {/* Connections: Pattern Nodes → Malicious End */}
        {layout.patternNodes.map(({ pattern, x, y }) => {
          const progress = patternProgress.get(pattern);
          const isPatternComplete = progress?.isComplete || false;
          return (
            <line
              key={`pattern-${pattern}-malicious`}
              x1={x + 30}
              y1={y + 20}
              x2={layout.maliciousPos.x + 30}
              y2={layout.maliciousPos.y + 20}
              className={`pattern-state-diagram__edge ${
                isPatternComplete ? 'pattern-state-diagram__edge--complete' : ''
              }`}
              strokeWidth="2"
            />
          );
        })}

        {/* Start Node */}
        <g>
          <circle
            cx={layout.startPos.x + 30}
            cy={layout.startPos.y + 20}
            r="20"
            className={`pattern-state-diagram__node pattern-state-diagram__node--start ${
              currentState === 'start' ? 'pattern-state-diagram__node--active' : ''
            } ${isBlinking ? 'pattern-state-diagram__node--blinking' : ''}`}
          />
          <text
            x={layout.startPos.x + 30}
            y={layout.startPos.y + 20}
            textAnchor="middle"
            dominantBaseline="middle"
            className="pattern-state-diagram__label"
          >
            START
          </text>
        </g>

        {/* Pattern Nodes */}
        {layout.patternNodes.map(({ pattern, x, y }) => {
          const progress = patternProgress.get(pattern);
          const isActive = activePatterns.has(pattern);
          const matchedLength = progress?.matchedLength || 0;
          const isPatternComplete = progress?.isComplete || false;
          const isLastMatched = isMalicious && lastMatchedPattern === pattern;
          
          return (
            <g key={pattern}>
              <circle
                cx={x + 30}
                cy={y + 20}
                r="20"
                className={`pattern-state-diagram__node pattern-state-diagram__node--pattern ${
                  isActive ? 'pattern-state-diagram__node--active' : ''
                } ${isPatternComplete ? 'pattern-state-diagram__node--complete' : ''} ${
                  isLastMatched ? 'pattern-state-diagram__node--last-matched' : ''
                }`}
              />
              <text
                x={x + 30}
                y={y + 20}
                textAnchor="middle"
                dominantBaseline="middle"
                className="pattern-state-diagram__label pattern-state-diagram__label--pattern"
              >
                {pattern.length > 8 ? pattern.substring(0, 6) + '..' : pattern}
              </text>
              {matchedLength > 0 && matchedLength < pattern.length && (
                <text
                  x={x + 30}
                  y={y + 45}
                  textAnchor="middle"
                  className="pattern-state-diagram__progress"
                >
                  {matchedLength}/{pattern.length}
                </text>
              )}
            </g>
          );
        })}

        {/* Malicious End Node */}
        <g>
          <circle
            cx={layout.maliciousPos.x + 30}
            cy={layout.maliciousPos.y + 20}
            r="20"
            className={`pattern-state-diagram__node pattern-state-diagram__node--malicious ${
              currentState === 'malicious' ? 'pattern-state-diagram__node--active' : ''
            }`}
          />
          <text
            x={layout.maliciousPos.x + 30}
            y={layout.maliciousPos.y + 20}
            textAnchor="middle"
            dominantBaseline="middle"
            className="pattern-state-diagram__label"
          >
            ⚠
          </text>
          <text
            x={layout.maliciousPos.x + 30}
            y={layout.maliciousPos.y + 50}
            textAnchor="middle"
            className="pattern-state-diagram__label pattern-state-diagram__label--malicious"
          >
            MALICIOUS
          </text>
        </g>
      </svg>

      {/* Status Text */}
      <div className="pattern-state-diagram__status">
        {isComplete ? (
          <span className={isMalicious ? 'pattern-state-diagram__status--malicious' : 'pattern-state-diagram__status--benign'}>
            {isMalicious ? '⚠ Malicious pattern detected!' : '✓ Benign - no malicious patterns found'}
          </span>
        ) : currentState === 'start' ? (
          <span>Scanning payload...</span>
        ) : currentState === 'pattern' ? (
          <span>Matching pattern{activePatterns.size > 1 ? 's' : ''}: {Array.from(activePatterns).join(', ')}</span>
        ) : (
          <span className="pattern-state-diagram__status--malicious">⚠ Malicious pattern matched!</span>
        )}
      </div>
    </div>
  );
};

export default PatternStateDiagram;

