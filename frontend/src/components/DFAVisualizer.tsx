import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import './DfaVisualizer.css';

interface DFAState {
  id: string;
  isAccepting?: boolean;
}

interface DFATransition {
  from: string;
  to: string;
  input: string;
}

interface DFAData {
  states: string[];
  start: string;
  accept: string[];
  transitions: DFATransition[];
}

interface DfaVisualizerProps {
  dfaData?: DFAData;
  activeState?: string;
  highlightedPath?: string[];
  onStateClick?: (stateId: string) => void;
}

/**
 * DfaVisualizer: Interactive DFA graph visualization using d3-force
 * - Renders DFA states and transitions
 * - Visualizes active state during scanning
 * - Animates path traversal
 */
const DfaVisualizer: React.FC<DfaVisualizerProps> = ({
  dfaData,
  activeState,
  highlightedPath = [],
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
      if (ro && svgRef.current?.parentElement) ro.unobserve(svgRef.current.parentElement);
      window.removeEventListener('resize', measure);
    };
  }, []);

  useEffect(() => {
    if (!dfaData || !svgRef.current || dimensions.width === 0 || dimensions.height === 0) {
      setLoading(false);
      return;
    }

    try {
      // Prepare nodes
      const nodes = dfaData.states.map((id) => ({
        id,
        isAccepting: dfaData.accept.includes(id),
        isStart: id === dfaData.start,
        isActive: id === activeState
      }));

      // Prepare links
      const links = dfaData.transitions.map((t) => ({
        source: t.from,
        target: t.to,
        input: t.input
      }));

      const width = dimensions.width;
      const height = dimensions.height;

      // Clear previous content and set svg sizing to fit the container
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
        .force('link', d3.forceLink(links).id((d: any) => d.id).distance(100))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(40));

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
          return isHighlighted ? 'dfa-link--highlighted' : '';
        });

      // Draw link labels
      const linkLabels = g
        .selectAll('text.link-label')
        .data(links)
        .enter()
        .append('text')
        .attr('class', 'link-label')
        .attr('font-size', '12px')
        .attr('fill', '#cbd5f5')
        .attr('text-anchor', 'middle')
        .text((d: any) => d.input);

      // Draw nodes
      const node = g
        .selectAll('circle.dfa-node')
        .data(nodes)
        .enter()
        .append('circle')
        .attr('class', (d: any) => {
          let classes = 'dfa-node';
          if (d.isStart) classes += ' dfa-node--start';
          if (d.isAccepting) classes += ' dfa-node--accepting';
          if (d.isActive) classes += ' dfa-node--active';
          return classes;
        })
        .attr('r', 30)
        .attr('fill', (d: any) => {
          if (d.isActive) return '#3b82f6';
          if (d.isAccepting) return '#22c55e';
          return '#6366f1';
        })
        .attr('stroke', (d: any) => {
          if (d.isStart) return '#a855f7';
          return '#8b7aa8';
        })
        .attr('stroke-width', 2.5)
        .call(
          d3.drag<SVGCircleElement, any>()
            .on('start', dragStarted)
            .on('drag', dragged)
            .on('end', dragEnded)
        )
        .on('click', (event: any, d: any) => {
          event.stopPropagation();
          onStateClick?.(d.id);
        });

      node.append('title').text((d: any) => d.id);

      // Draw node labels
      const labels = g
        .selectAll('text.node-label')
        .data(nodes)
        .enter()
        .append('text')
        .attr('class', 'node-label')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.3em')
        .attr('font-size', '14px')
        .attr('font-weight', 'bold')
        .attr('fill', '#ffffff')
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

        labels.attr('x', (d: any) => d.x).attr('y', (d: any) => d.y);
      });

      // Zoom interaction
      const zoom = d3.zoom<SVGSVGElement, unknown>().on('zoom', (event: any) => {
        g.attr('transform', event.transform);
      });

      svg.call(zoom);

      // Pan to fit all nodes on first render
      setTimeout(() => {
        const allX = nodes.map((n: any) => n.x || 0);
        const allY = nodes.map((n: any) => n.y || 0);
        const minX = Math.min(...allX);
        const maxX = Math.max(...allX);
        const minY = Math.min(...allY);
        const maxY = Math.max(...allY);

        const padding = 60;
        const scale = Math.min(
          (width - 2 * padding) / (maxX - minX || 1),
          (height - 2 * padding) / (maxY - minY || 1)
        );

        const tx = (width - scale * (minX + maxX)) / 2;
        const ty = (height - scale * (minY + maxY)) / 2;

        svg.transition().duration(750).call(
          zoom.transform as any,
          d3.zoomIdentity.translate(tx, ty).scale(scale)
        );
      }, 100);

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
  }, [dfaData, activeState, highlightedPath, onStateClick]);

  if (loading) {
    return <div className="dfa-visualizer dfa-visualizer--loading">Loading DFA...</div>;
  }

  if (error) {
    return <div className="dfa-visualizer dfa-visualizer--error">Error: {error}</div>;
  }

  if (!dfaData) {
    return <div className="dfa-visualizer dfa-visualizer--empty">No DFA data available</div>;
  }

  return (
    <div className="dfa-visualizer">
      <div className="dfa-visualizer__legend">
        <div className="dfa-legend-item">
          <div className="dfa-legend-color" style={{ backgroundColor: '#a855f7' }}></div>
          <span>Start State</span>
        </div>
        <div className="dfa-legend-item">
          <div className="dfa-legend-color" style={{ backgroundColor: '#22c55e' }}></div>
          <span>Accepting State</span>
        </div>
        <div className="dfa-legend-item">
          <div className="dfa-legend-color" style={{ backgroundColor: '#3b82f6' }}></div>
          <span>Active State</span>
        </div>
      </div>
      <svg ref={svgRef} className="dfa-visualizer__canvas"></svg>
    </div>
  );
};

export default DfaVisualizer;
