import React from 'react';
import './StackVisualizer.css';

interface StackVisualizerProps {
  stack: string[];
  currentState?: string;
}

const StackVisualizer: React.FC<StackVisualizerProps> = ({ stack, currentState }) => {
  if (!stack || stack.length === 0) {
    return (
      <div className="stack-visualizer stack-visualizer--empty">
        <div className="stack-visualizer__label">PDA Stack</div>
        <div className="stack-visualizer__empty">Stack is empty</div>
      </div>
    );
  }

  // Reverse to show top of stack at top visually
  const displayStack = [...stack].reverse();

  return (
    <div className="stack-visualizer">
      <div className="stack-visualizer__label">
        PDA Stack {currentState && <span className="stack-visualizer__state">({currentState})</span>}
      </div>
      <div className="stack-visualizer__container">
        <div className="stack-visualizer__top-indicator">Top</div>
        <div className="stack-visualizer__stack">
          {displayStack.map((item, idx) => {
            const isTop = idx === 0;
            const isBottom = idx === displayStack.length - 1;
            return (
              <div
                key={`${item}-${idx}-${stack.length}`}
                className={`stack-item ${isTop ? 'stack-item--top' : ''} ${isBottom ? 'stack-item--bottom' : ''}`}
              >
                <div className="stack-item__content">
                  {item === '$' ? (
                    <span className="stack-item__marker">$ (bottom marker)</span>
                  ) : (
                    <span className="stack-item__value">{item}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="stack-visualizer__bottom-indicator">Bottom</div>
      </div>
      <div className="stack-visualizer__info">
        Stack size: {stack.length} {stack.length === 1 ? 'item' : 'items'}
      </div>
    </div>
  );
};

export default StackVisualizer;

