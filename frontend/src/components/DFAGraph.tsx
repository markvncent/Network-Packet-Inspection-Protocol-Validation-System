/**
 * DFA Graph Component: Visual representation of DFA states and transitions
 * Uses ReactFlow for interactive graph rendering
 */

import React, { useMemo, useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import { DFA } from '../utils/dfa';

interface DFAGraphProps {
  dfa: DFA;
  activeState?: string;
  highlightedPath?: string[];
  isAccepting?: boolean;
}

/**
 * Node styling function based on state type
 */
const getNodeStyle = (
  state: string,
  isActive: boolean,
  isAccepting: boolean,
  isDeadState: boolean
) => {
  let backgroundColor = '#ffffff';
  let borderColor = '#999999';
  let borderWidth = '2px';
  let boxShadow = 'none';

  if (isDeadState) {
    backgroundColor = '#fecaca';
    borderColor = '#dc2626';
  } else if (isAccepting) {
    backgroundColor = '#d1fae5';
    borderColor = '#059669';
    borderWidth = '3px';
  } else {
    backgroundColor = '#ffffff';
    borderColor = '#6b7280';
  }

  if (isActive) {
    backgroundColor = '#86efac';
    borderColor = '#16a34a';
    borderWidth = '3px';
    boxShadow = '0 0 0 4px rgba(22, 163, 74, 0.3)';
  }

  return {
    background: backgroundColor,
    border: `${borderWidth} solid ${borderColor}`,
    borderRadius: '50%',
    padding: '10px',
    fontSize: '13px',
    fontWeight: '600',
    width: '70px',
    height: '70px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow,
    transition: 'all 0.3s ease'
  };
};

/**
 * DFAGraph Component
 * Renders interactive DFA visualization with state highlighting
 */
export const DFAGraph: React.FC<DFAGraphProps> = ({
  dfa,
  activeState = dfa.start,
  highlightedPath = [],
  isAccepting = false
}) => {
  // Generate nodes from DFA states
  const nodes: Node[] = useMemo(() => {
    const isPathHighlighted = highlightedPath.length > 0;
    
    return dfa.states.map((state, index) => {
      const isActive = state === activeState;
      const isInPath = isPathHighlighted && highlightedPath.includes(state);
      const stateIsAccepting = dfa.accept.includes(state);
      const isDeadState = state === 'dead';

      // Calculate positions in a circle layout
      const angle = (index / dfa.states.length) * 2 * Math.PI;
      const radius = 200;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      return {
        id: state,
        position: { x, y },
        data: {
          label: state.replace(/_/g, '\n')
        },
        style: getNodeStyle(
          state,
          isActive || isInPath,
          stateIsAccepting,
          isDeadState
        ),
        connectable: false
      };
    });
  }, [dfa, activeState, highlightedPath]);

  // Generate edges from DFA transitions
  const edges: Edge[] = useMemo(() => {
    const edgeList: Edge[] = [];
    let edgeId = 0;

    for (const state of dfa.states) {
      const transitions = dfa.transition[state];
      if (!transitions) continue;

      for (const [symbol, nextState] of Object.entries(transitions)) {
        edgeList.push({
          id: `edge-${edgeId++}`,
          source: state,
          target: nextState,
          label: symbol,
          markerEnd: { type: MarkerType.ArrowClosed },
          animated: activeState === state && highlightedPath.includes(nextState),
          style: {
            stroke: activeState === state && highlightedPath.includes(nextState) 
              ? '#059669' 
              : '#d1d5db',
            strokeWidth: activeState === state && highlightedPath.includes(nextState)
              ? 2.5
              : 1.5
          },
          labelStyle: {
            background: '#ffffff',
            padding: '4px 8px',
            fontSize: '11px',
            fontWeight: '600',
            borderRadius: '4px',
            border: '1px solid #e5e7eb'
          }
        });
      }
    }

    return edgeList;
  }, [dfa, activeState, highlightedPath]);

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '500px' }}>
      <ReactFlow nodes={nodes} edges={edges} fitView>
        <Background color="#e5e7eb" gap={12} size={1} />
        <Controls />
      </ReactFlow>
    </div>
  );
};

export default DFAGraph;
