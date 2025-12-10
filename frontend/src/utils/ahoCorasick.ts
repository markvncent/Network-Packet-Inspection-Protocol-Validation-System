/**
 * Aho-Corasick Automaton Implementation
 * Multi-pattern matching with fail links for efficient pattern detection
 */

export interface ACNode {
  id: number;
  edges: Map<string, number>;
  fail: number;
  output: string[];
}

export interface ACTrieData {
  nodes: Array<{ id: number; fail: number; output: string[] }>;
  edges: Array<{ from: number; input: string; to: number }>;
  rawNodes: ACNode[];
}

export interface PatternMatch {
  pattern: string;
  position: number;
}

export interface MatchStep {
  byte: number;
  character: string;
  nodeId: number;
  outputs: string[];
}

/**
 * Build Aho-Corasick automaton from pattern list
 */
export function buildAhoCorasick(patterns: string[]): ACTrieData {
  const nodes: ACNode[] = [{ id: 0, edges: new Map<string, number>(), fail: 0, output: [] }];

  // Build trie from patterns
  for (const pat of patterns) {
    let node = 0;
    for (const ch of pat) {
      const key = ch;
      const nxt = nodes[node].edges.get(key);
      if (nxt === undefined) {
        nodes.push({ id: nodes.length, edges: new Map<string, number>(), fail: 0, output: [] });
        const newIdx = nodes.length - 1;
        nodes[node].edges.set(key, newIdx);
        node = newIdx;
      } else {
        node = nxt;
      }
    }
    nodes[node].output.push(pat);
  }

  // Build failure links using BFS
  const q: number[] = [];
  for (const [k, v] of nodes[0].edges) {
    nodes[v].fail = 0;
    q.push(v);
  }
  
  while (q.length) {
    const r = q.shift()!;
    for (const [a, s] of nodes[r].edges) {
      q.push(s);
      let state = nodes[r].fail;
      while (state !== 0 && !nodes[state].edges.has(a)) {
        state = nodes[state].fail;
      }
      if (nodes[state].edges.has(a)) {
        nodes[s].fail = nodes[state].edges.get(a)!;
      } else {
        nodes[s].fail = 0;
      }
      nodes[s].output = nodes[s].output.concat(nodes[nodes[s].fail].output || []);
    }
  }

  // Convert to export format
  const trieNodes = nodes.map((n, idx) => ({ id: idx, fail: n.fail ?? 0, output: n.output || [] }));
  const trieEdges: Array<{ from: number; input: string; to: number }> = [];
  nodes.forEach((n, idx) => {
    for (const [k, v] of n.edges) {
      trieEdges.push({ from: idx, input: k, to: v });
    }
  });
  
  return { nodes: trieNodes, edges: trieEdges, rawNodes: nodes };
}

