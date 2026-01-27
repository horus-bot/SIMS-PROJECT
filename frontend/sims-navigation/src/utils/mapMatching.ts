import testData from "../data/test_1.json";

export const applyCRFConstraints = (x: number, y: number) => {
  let minDistance = Infinity;
  let snapped = { x, y };
  const nodes = testData.nodes as any;
  const MAX_SNAP = 60; // Max snap distance in pixels

  testData.edges.forEach((edge) => {
    const start = nodes[edge.from];
    const end = nodes[edge.to];
    if (!start || !end) return;

    // Linear Projection: Find the closest point on the line segment (hallway)
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const l2 = dx * dx + dy * dy;
    if (l2 === 0) return;

    let t = ((x - start.x) * dx + (y - start.y) * dy) / l2;
    t = Math.max(0, Math.min(1, t)); // Constrain to hallway length

    const projX = start.x + t * dx;
    const projY = start.y + t * dy;
    const dist = Math.sqrt((x - projX) ** 2 + (y - projY) ** 2);

    if (dist < minDistance) {
      minDistance = dist;
      snapped = { x: projX, y: projY };
    }
  });

  // Only snap if within threshold
  return minDistance < MAX_SNAP ? snapped : { x, y };
};