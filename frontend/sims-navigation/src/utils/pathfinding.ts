interface Node {
  x: number;
  y: number;
  type: string;
}

interface Edge {
  from: string;
  to: string;
}

interface Neighbor {
  node: string;
  weight: number;
}

type Graph = Record<string, Neighbor[]>;

/**
 * Finds the shortest path between two nodes using Dijkstra's algorithm.
 * 
 * @param startNodeId - The ID of the starting node.
 * @param endNodeId - The ID of the target node.
 * @param nodes - A map of node IDs to their coordinates and types.
 * @param edges - An array of edges connecting the nodes.
 * @returns An array of node IDs representing the shortest path.
 */
export const findShortestPath = (
  startNodeId: string, 
  endNodeId: string, 
  nodes: Record<string, Node>,
  edges: Edge[]
): string[] => {
  if (!nodes[startNodeId] || !nodes[endNodeId]) return [];

  const graph: Graph = {};

  // Build undirected graph with distance weights
  edges.forEach((edge) => {
    const fromNode = nodes[edge.from];
    const toNode = nodes[edge.to];

    if (!fromNode || !toNode) return;

    const dx = toNode.x - fromNode.x;
    const dy = toNode.y - fromNode.y;
    const weight = Math.sqrt(dx * dx + dy * dy);

    if (!graph[edge.from]) graph[edge.from] = [];
    if (!graph[edge.to]) graph[edge.to] = [];

    graph[edge.from].push({ node: edge.to, weight });
    graph[edge.to].push({ node: edge.from, weight });
  });

  const distances: Record<string, number> = {};
  const previous: Record<string, string | null> = {};
  const queue: string[] = [];

  for (const nodeId in nodes) {
    distances[nodeId] = nodeId === startNodeId ? 0 : Infinity;
    previous[nodeId] = null;
    queue.push(nodeId);
  }

  while (queue.length > 0) {
    // Sort queue by distance (basic priority queue behavior)
    queue.sort((a, b) => distances[a] - distances[b]);
    const currentNodeId = queue.shift();
    if (!currentNodeId || distances[currentNodeId] === Infinity) break;

    if (currentNodeId === endNodeId) break;

    const neighbors = graph[currentNodeId] || [];

    for (const neighbor of neighbors) {
      const alt = distances[currentNodeId] + neighbor.weight;
      if (alt < distances[neighbor.node]) {
        distances[neighbor.node] = alt;
        previous[neighbor.node] = currentNodeId;
      }
    }
  }

  // Reconstruct path
  if (distances[endNodeId] === Infinity) return [];

  const pathIds: string[] = [];
  let u: string | null = endNodeId;

  while (u) {
    pathIds.unshift(u);
    u = previous[u];
  }

  return pathIds;
};
