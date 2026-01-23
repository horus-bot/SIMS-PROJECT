// src/utils/pathfinding.ts
import floorData from '../data/floor_1.json'; // Import your JSON directly


interface Graph { [key: string]: { node: string; weight: number }[] }

export const findShortestPath = (startNodeId: string, endNodeId: string): { path: string; distance: number } => {
  const nodes = floorData.nodes;
  const edges = floorData.edges;

  // 1. BUILD THE GRAPH (Adjacency List)
  // We treat every edge as bi-directional (undirected)
  const graph: Graph = {};
  
  edges.forEach(edge => {
    if (!graph[edge.from]) graph[edge.from] = [];
    if (!graph[edge.to]) graph[edge.to] = [];
    
    // Add connection A -> B
    graph[edge.from].push({ node: edge.to, weight: edge.weight });
    // Add connection B -> A (So you can walk back!)
    graph[edge.to].push({ node: edge.from, weight: edge.weight });
  });

  // 2. DIJKSTRA'S ALGORITHM
  const distances: { [key: string]: number } = {};
  const previous: { [key: string]: string | null } = {};
  const queue: string[] = [];

  // Initialize
  for (const nodeId in nodes) {
    if (nodeId === startNodeId) {
      distances[nodeId] = 0;
      queue.push(nodeId);
    } else {
      distances[nodeId] = Infinity;
      queue.push(nodeId);
    }
    previous[nodeId] = null;
  }

  while (queue.length > 0) {
    // Sort queue to simulate priority queue (can be optimized but fine for <1000 nodes)
    queue.sort((a, b) => distances[a] - distances[b]);
    const currentNodeId = queue.shift();

    if (!currentNodeId) break;
    if (currentNodeId === endNodeId) break; // Reached destination!

    const neighbors = graph[currentNodeId] || [];
    
    for (const neighbor of neighbors) {
      const alt = distances[currentNodeId] + neighbor.weight;
      if (alt < distances[neighbor.node]) {
        distances[neighbor.node] = alt;
        previous[neighbor.node] = currentNodeId;
      }
    }
  }

  // 3. RECONSTRUCT PATH
  const path: string[] = [];
  let u: string | null = endNodeId;
  
  // If we never reached the end, return empty path and 0 distance
  if (distances[endNodeId] === Infinity) return { path: '', distance: 0 };

  while (u) {
    path.unshift(u);
    u = previous[u];
  }

  // 4. CALCULATE TOTAL DISTANCE (1px = 1m)
  let totalDistance = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const current = nodes[path[i] as keyof typeof nodes];
    const next = nodes[path[i + 1] as keyof typeof nodes];
    const dx = next.x - current.x;
    const dy = next.y - current.y;
    totalDistance += Math.sqrt(dx * dx + dy * dy);
  }

  // 5. CONVERT IDS TO COORDINATES
  // Return an object with path string and distance
  const pathString = path.map(id => {
    const n = nodes[id as keyof typeof nodes];
    return `${n.x},${n.y}`;
  }).join(' ');

  return { path: pathString, distance: totalDistance };
};