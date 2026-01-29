import testData from "../data/test_1.json";

const PIXELS_PER_METER = 49;
const ALLOWED_DEVIATION_M = 0.6;
const ALLOWED_DEVIATION_PX = ALLOWED_DEVIATION_M * PIXELS_PER_METER; // ~29.4px

export const applyCRFConstraints = (x: number, y: number) => {
  const nodes = testData.nodes as any;
  const edges = testData.edges;

  let minDistance = Infinity;
  let closestPointInBuilding = { x, y };

  // 1. Scan EVERY edge in the building to find the nearest "tunnel"
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

    if (dist < minDistance) {
      minDistance = dist;
      closestPointInBuilding = { x: projX, y: projY };
    }
  });

  // 2. "Tunnel" Logic:
  // If we are within 0.6m of ANY legal hallway, let the user move freely.
  if (minDistance <= ALLOWED_DEVIATION_PX) {
    return { x, y }; 
  }

  // 3. Wall Logic:
  // If they try to walk through a wall (exit the tunnel), 
  // push them back to the edge of the nearest legal hallway.
  const angle = Math.atan2(y - closestPointInBuilding.y, x - closestPointInBuilding.x);
  
  return {
    x: closestPointInBuilding.x + Math.cos(angle) * ALLOWED_DEVIATION_PX,
    y: closestPointInBuilding.y + Math.sin(angle) * ALLOWED_DEVIATION_PX
  };
};