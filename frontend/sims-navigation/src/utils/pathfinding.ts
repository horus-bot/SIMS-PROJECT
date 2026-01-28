import testData from "../data/test_1.json";

interface Graph {
  [key: string]: { node: string; weight: number }[];
}

export const findShortestPath = (
startNodeId: string, endNodeId: string, _nodeMap: Record<string, { x: number; y: number; type: string; }>): string[] => {
  const nodes = testData.nodes as Record<string, { x: number; y: number; type: string }>;
  const edges = testData.edges as { from: string; to: string }[];

  const graph: Graph = {};

  // ✅ build graph (undirected) with computed weights
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
    // Basic priority queue
    queue.sort((a, b) => distances[a] - distances[b]);
    const currentNodeId = queue.shift();
    if (!currentNodeId) break;

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

  // ✅ no path
  if (distances[endNodeId] === Infinity) return [];

  // ✅ reconstruct path nodes
  const pathIds: string[] = [];
  let u: string | null = endNodeId;

  while (u) {
    pathIds.unshift(u);
    u = previous[u];
  }

  return pathIds;
};
