import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import './PDAVisualizer.css';

interface PDAState {
  id: string;
  isAccepting?: boolean;
  isStart?: boolean;
}

interface PDATransition {
  from: string;
  to: string;
  input: string;
  pop?: string;
  push?: string;
}

interface PDAData {
  states: string[];
  start: string;
  accept: string[];
  transitions: PDATransition[];
  stackSymbols?: string[];
}

interface PDAVisualizerProps {
  pdaData?: PDAData;
  activeState?: string;
  highlightedPath?: string[];
  stackState?: string[];
  onStateClick?: (stateId: string) => void;
}

/**
 * PDAVisualizer: Interactive PDA graph visualization using d3-force
 * - Renders PDA states and transitions
 * - Visualizes active state during validation
 * - Shows stack operations (push/pop)
 * - Animates path traversal
 */
const PDAVisualizer: React.FC<PDAVisualizerProps> = ({
  pdaData,
  activeState,
  highlightedPath = [],
  stackState = [],
  onStateClick
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const simulationRef = useRef<d3.Simulation<any, any> | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    function measure() {
      if (!svgRef.current) return;
      const parent = svgRef.current.parentElement as HTMLElement | null;
      const w = parent?.clientWidth || svgRef.current.clientWidth || 400;
      const h = parent?.clientHeight || svgRef.current.clientHeight || 300;
      setDimensions({ width: w, height: h });
    }

    measure();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && svgRef.current?.parentElement) {
      ro = new ResizeObserver(measure);
      ro.observe(svgRef.current.parentElement);
    } else {
      window.addEventListener('resize', measure);
    }

    return () => {
      if (ro) {
        ro.disconnect();
      } else {
        window.removeEventListener('resize', measure);
      }
    };
  }, []);

  useEffect(() => {
    if (!pdaData || !svgRef.current || dimensions.width === 0 || dimensions.height === 0) {
      setLoading(false);
      return;
    }

    try {
      // Prepare nodes
      const nodes = pdaData.states.map((id) => ({
        id,
        isAccepting: pdaData.accept.includes(id),
        isStart: id === pdaData.start,
        isActive: id === activeState
      }));

      // Prepare links
      const links = pdaData.transitions.map((t) => ({
        source: t.from,
        target: t.to,
        input: t.input,
        pop: t.pop,
        push: t.push
      }));

      const width = dimensions.width;
      const height = dimensions.height;

      // Clear previous content
      d3.select(svgRef.current).selectAll('*').remove();

      // Create SVG groups
      const svg = d3.select(svgRef.current)
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet');
      const g = svg.append('g');

      // Create simulation
      const simulation = d3
        .forceSimulation(nodes as any)
        .force('link', d3.forceLink(links).id((d: any) => d.id).distance(120))
        .force('charge', d3.forceManyBody().strength(-350))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(45));

      simulationRef.current = simulation;

      // Draw links
      const link = g
        .selectAll('line')
        .data(links)
        .enter()
        .append('line')
        .attr('stroke', '#8b7aa8')
        .attr('stroke-width', 2)
        .attr('class', (d: any) => {
          const isHighlighted =
            highlightedPath.includes(d.source.id) && highlightedPath.includes(d.target.id);
          return isHighlighted ? 'pda-link--highlighted' : '';
        });

      // Draw link labels
      const linkLabels = g
        .selectAll('text.link-label')
        .data(links)
        .enter()
        .append('text')
        .attr('class', 'link-label')
        .attr('font-size', '11px')
        .attr('fill', '#cbd5f5')
        .attr('text-anchor', 'middle')
        .text((d: any) => {
          let label = d.input || 'ε';
          if (d.pop) label += `, pop:${d.pop}`;
          if (d.push) label += `, push:${d.push}`;
          return label;
        });

      // Draw nodes
      const node = g
        .selectAll('circle')
        .data(nodes)
        .enter()
        .append('circle')
        .attr('r', 25)
        .attr('fill', (d: any) => {
          if (d.isActive) return '#3b82f6';
          if (d.isAccepting) return '#22c55e';
          if (d.isStart) return '#a855f7';
          return '#4b5563';
        })
        .attr('stroke', (d: any) => {
          if (d.isStart) return '#a855f7';
          if (d.isActive) return '#3b82f6';
          return '#6b7280';
        })
        .attr('stroke-width', (d: any) => (d.isStart || d.isActive ? 3 : 2))
        .style('cursor', 'pointer')
        .on('click', (event: any, d: any) => {
          onStateClick?.(d.id);
        })
        .call(
          d3
            .drag<any, any>()
            .on('start', dragStarted)
            .on('drag', dragged)
            .on('end', dragEnded) as any
        );

      // Add pulse animation for active state
      if (activeState) {
        const activeNode = node.filter((d: any) => d.id === activeState);
        activeNode
          .append('animate')
          .attr('attributeName', 'r')
          .attr('values', '25;30;25')
          .attr('dur', '1.5s')
          .attr('repeatCount', 'indefinite');
      }

      // Draw node labels
      const nodeLabels = g
        .selectAll('text.node-label')
        .data(nodes)
        .enter()
        .append('text')
        .attr('class', 'node-label')
        .attr('font-size', '12px')
        .attr('font-weight', '600')
        .attr('fill', '#ffffff')
        .attr('text-anchor', 'middle')
        .attr('dy', '.35em')
        .text((d: any) => d.id);

      // Update positions on simulation tick
      simulation.on('tick', () => {
        link
          .attr('x1', (d: any) => d.source.x)
          .attr('y1', (d: any) => d.source.y)
          .attr('x2', (d: any) => d.target.x)
          .attr('y2', (d: any) => d.target.y);

        linkLabels
          .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
          .attr('y', (d: any) => (d.source.y + d.target.y) / 2 - 5);

        node.attr('cx', (d: any) => d.x).attr('cy', (d: any) => d.y);

        nodeLabels.attr('x', (d: any) => d.x).attr('y', (d: any) => d.y);
      });

      function dragStarted(event: any, d: any) {
        if (!event.active) simulation!.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      }

      function dragged(event: any, d: any) {
        d.fx = event.x;
        d.fy = event.y;
      }

      function dragEnded(event: any, d: any) {
        if (!event.active) simulation!.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }

      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  }, [pdaData, activeState, highlightedPath, dimensions, onStateClick]);

  if (loading) {
    return <div className="pda-visualizer pda-visualizer--loading">Loading PDA...</div>;
  }

  if (error) {
    return <div className="pda-visualizer pda-visualizer--error">Error: {error}</div>;
  }

  if (!pdaData) {
    return <div className="pda-visualizer pda-visualizer--empty">No PDA data available</div>;
  }

  return (
    <div className="pda-visualizer">
      <div className="pda-visualizer__legend">
        <div className="pda-legend-item">
          <div className="pda-legend-color" style={{ backgroundColor: '#a855f7' }}></div>
          <span>Start State</span>
        </div>
        <div className="pda-legend-item">
          <div className="pda-legend-color" style={{ backgroundColor: '#22c55e' }}></div>
          <span>Accepting State</span>
        </div>
        <div className="pda-legend-item">
          <div className="pda-legend-color" style={{ backgroundColor: '#3b82f6' }}></div>
          <span>Active State</span>
        </div>
      </div>
      {stackState.length > 0 && (
        <div className="pda-visualizer__stack">
          <span className="pda-stack-label">Stack:</span>
          <div className="pda-stack-items">
            {stackState.map((symbol, idx) => (
              <span key={idx} className="pda-stack-item">{symbol}</span>
            ))}
          </div>
        </div>
      )}
      <svg ref={svgRef} className="pda-visualizer__canvas"></svg>
    </div>
  );
};

export default PDAVisualizer;

