import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import './AcTrieVisualizer.css';

interface TrieNode {
  id: number;
  fail: number;
  output: string[];
}

interface TrieEdge {
  from: number;
  input: string;
  to: number;
}

interface ACTrieData {
  nodes: TrieNode[];
  edges: TrieEdge[];
}

interface AcTrieVisualizerProps {
  trieData?: ACTrieData;
  highlightedNodeId?: number;
  animatedEdges?: Array<{ from: number; to: number }>;
}

/**
 * AcTrieVisualizer: Renders Aho-Corasick trie with fail links and outputs
 * - Displays trie structure with labeled edges
 * - Shows fail links between nodes
 * - Animates pattern matching process
 */
const AcTrieVisualizer: React.FC<AcTrieVisualizerProps> = ({
  trieData,
  highlightedNodeId,
  animatedEdges = []
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!trieData || !svgRef.current) {
      setLoading(false);
      return;
    }

    try {
      const width = svgRef.current.clientWidth;
      const height = svgRef.current.clientHeight;

      // Build graph structure from nodes and edges
      const nodeMap = new Map(trieData.nodes.map((n) => [n.id, n]));
      const nodeArray = Array.from(nodeMap.values());

      // Clear previous content
      d3.select(svgRef.current).selectAll('*').remove();

      const svg = d3.select(svgRef.current);
      const g = svg.append('g');

      // Create a tree layout (simple hierarchy based on BFS)
      const treeData = buildTreeHierarchy(nodeArray, trieData.edges);

      // Calculate positions using d3-hierarchy
      const root = d3.hierarchy(treeData);
      const treeLayout = d3
        .tree<any>()
        .size([width * 0.9, height * 0.9]);
      treeLayout(root);

      // Adjust node positions to center
      root.descendants().forEach((node: any) => {
        node.x = (node.x || 0) + width * 0.05;
        node.y = (node.y || 0) + height * 0.05;
      });

      // Draw fail links first (dashed lines)
      const failLinks = g
        .selectAll('line.fail-link')
        .data(nodeArray.filter((n) => n.fail !== n.id && n.fail !== 0))
        .enter()
        .append('line')
        .attr('class', 'fail-link')
        .attr('x1', (d: TrieNode) => {
          const desc = root.descendants().find((x: any) => x.data.id === d.id);
          return desc ? desc.x : 0;
        })
        .attr('y1', (d: TrieNode) => {
          const desc = root.descendants().find((x: any) => x.data.id === d.id);
          return desc ? desc.y : 0;
        })
        .attr('x2', (d: TrieNode) => {
          const failNode = nodeMap.get(d.fail);
          const desc = root.descendants().find((x: any) => x.data.id === failNode?.id);
          return desc ? desc.x : 0;
        })
        .attr('y2', (d: TrieNode) => {
          const failNode = nodeMap.get(d.fail);
          const desc = root.descendants().find((x: any) => x.data.id === failNode?.id);
          return desc ? desc.y : 0;
        });

      // Draw trie edges
      const treeEdges = g
        .selectAll('line.tree-edge')
        .data(root.links() as any[])
        .enter()
        .append('line')
        .attr('class', (d: any) => {
          const isAnimated = animatedEdges.some(
            (e) => (e.from === d.source.data.id && e.to === d.target.data.id) ||
                   (e.from === d.target.data.id && e.to === d.source.data.id)
          );
          return isAnimated ? 'tree-edge tree-edge--animated' : 'tree-edge';
        })
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      // Draw edge labels (input characters)
      const edgeLabels = g
        .selectAll('text.edge-label')
        .data(root.links() as any[])
        .enter()
        .append('text')
        .attr('class', 'edge-label')
        .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
        .attr('y', (d: any) => (d.source.y + d.target.y) / 2 - 5)
        .text((d: any) => {
          const edge = trieData.edges.find(
            (e) => e.from === d.source.data.id && e.to === d.target.data.id
          );
          return edge ? edge.input : '';
        });

      // Draw nodes
      const nodes = g
        .selectAll('circle.trie-node')
        .data(root.descendants() as any[])
        .enter()
        .append('circle')
        .attr('class', (d: any) => {
          let classes = 'trie-node';
          if (d.data.id === 0) classes += ' trie-node--root';
          if (d.data.output.length > 0) classes += ' trie-node--output';
          if (d.data.id === highlightedNodeId) classes += ' trie-node--highlighted';
          return classes;
        })
        .attr('cx', (d: any) => d.x)
        .attr('cy', (d: any) => d.y)
        .attr('r', 20)
        .attr('fill', (d: any) => {
          if (d.data.id === highlightedNodeId) return '#3b82f6';
          if (d.data.output.length > 0) return '#22c55e';
          return '#6366f1';
        });

      // Draw node labels
      const nodeLabels = g
        .selectAll('text.node-label')
        .data(root.descendants() as any[])
        .enter()
        .append('text')
        .attr('class', 'node-label')
        .attr('x', (d: any) => d.x)
        .attr('y', (d: any) => d.y)
        .text((d: any) => d.data.id);

      // Draw output labels for nodes with patterns
      const outputLabels = g
        .selectAll('text.output-label')
        .data(root.descendants().filter((d: any) => d.data.output.length > 0) as any[])
        .enter()
        .append('text')
        .attr('class', 'output-label')
        .attr('x', (d: any) => d.x)
        .attr('y', (d: any) => d.y + 35)
        .text((d: any) => d.data.output.join(','));

      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  }, [trieData, highlightedNodeId, animatedEdges]);

  function buildTreeHierarchy(nodes: TrieNode[], edges: TrieEdge[]): any {
    const root = nodes.find((n) => n.id === 0) || nodes[0];
    const visited = new Set<number>();

    function buildNode(nodeId: number): any {
      if (visited.has(nodeId)) {
        return null;
      }
      visited.add(nodeId);

      const node = nodes.find((n) => n.id === nodeId)!;
      const children: any[] = [];

      for (const edge of edges) {
        if (edge.from === nodeId) {
          const child = buildNode(edge.to);
          if (child) {
            children.push(child);
          }
        }
      }

      return {
        id: node.id,
        output: node.output,
        fail: node.fail,
        children
      };
    }

    return buildNode(root.id);
  }

  if (loading) {
    return <div className="ac-trie-visualizer ac-trie-visualizer--loading">Loading Trie...</div>;
  }

  if (error) {
    return <div className="ac-trie-visualizer ac-trie-visualizer--error">Error: {error}</div>;
  }

  if (!trieData) {
    return <div className="ac-trie-visualizer ac-trie-visualizer--empty">No trie data available</div>;
  }

  return (
    <div className="ac-trie-visualizer">
      <div className="ac-trie-visualizer__legend">
        <div className="ac-legend-item">
          <div className="ac-legend-color" style={{ backgroundColor: '#6366f1' }}></div>
          <span>Regular Node</span>
        </div>
        <div className="ac-legend-item">
          <div className="ac-legend-color" style={{ backgroundColor: '#22c55e' }}></div>
          <span>Output Node</span>
        </div>
        <div className="ac-legend-item">
          <div className="ac-legend-color ac-legend-dashed"></div>
          <span>Fail Link</span>
        </div>
      </div>
      <svg ref={svgRef} className="ac-trie-visualizer__canvas"></svg>
    </div>
  );
};

export default AcTrieVisualizer;
