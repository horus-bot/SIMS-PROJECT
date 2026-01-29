import testData from "../data/test_1.json";

const PIXELS_PER_METER = 49;
const ALLOWED_DEVIATION_M = 0.6;
const ALLOWED_DEVIATION_PX = ALLOWED_DEVIATION_M * PIXELS_PER_METER; // ~29.4px

export const applyCRFConstraints = (x: number, y: number, routePath: string[] = []) => {
  const nodes = testData.nodes as any;
  const edges = testData.edges;

  let minDistanceAll = Infinity;
  let closestPointAll = { x, y };

  let minDistanceRoute = Infinity;
  let closestPointRoute = { x, y };

  // Get route edges
  const routeEdges: { from: string; to: string; }[] = [];
  for (let i = 0; i < routePath.length - 1; i++) {
    routeEdges.push({ from: routePath[i], to: routePath[i + 1] });
  }

  // Scan ALL edges
  edges.forEach((edge) => {
    const p1 = nodes[edge.from];
    const p2 = nodes[edge.to];
    if (!p1 || !p2) return;

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const l2 = dx * dx + dy * dy;
    if (l2 === 0) return;

    let t = ((x - p1.x) * dx + (y - p1.y) * dy) / l2;
    t = Math.max(0, Math.min(1, t));

    const projX = p1.x + t * dx;
    const projY = p1.y + t * dy;
    const dist = Math.hypot(x - projX, y - projY);

    if (dist < minDistanceAll) {
      minDistanceAll = dist;
      closestPointAll = { x: projX, y: projY };
    }

    // Check if this edge is in route
    const isRouteEdge = routeEdges.some(re => (re.from === edge.from && re.to === edge.to) || (re.from === edge.to && re.to === edge.from));
    if (isRouteEdge && dist < minDistanceRoute) {
      minDistanceRoute = dist;
      closestPointRoute = { x: projX, y: projY };
    }
  });

  // Return object with metadata
  // Favor route: if route distance <= 2.5x all distance (slightly looser), use route
  // Otherwise, user has genuinely DEVIATED to another valid path.
  
  if (minDistanceRoute !== Infinity && minDistanceRoute <= minDistanceAll * 2.5) {
    return { ...closestPointRoute, isOnRoute: true };
  } else {
    // If closestPointAll is basically the same as input, it means no edge was close? 
    // But typically minDistanceAll will be finite if map has edges.
    return { ...closestPointAll, isOnRoute: false };
  }
};