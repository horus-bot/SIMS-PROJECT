type XY = { x: number; y: number };
type NodeMap = Record<string, XY>;

const MAX_SNAP_DISTANCE = 35; // reduce to 25 if still crossing

// Snap a point to the closest segment of the ROUTE ONLY
export function snapToRoute(
  x: number,
  y: number,
  routePath: string[],
  nodes: NodeMap,
  prev?: XY
): XY {
  if (!routePath || routePath.length < 2) return { x, y };

  let best = { x, y };
  let bestDist = Infinity;

  for (let i = 0; i < routePath.length - 1; i++) {
    const a = nodes[routePath[i]];
    const b = nodes[routePath[i + 1]];
    if (!a || !b) continue;

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l2 = dx * dx + dy * dy;
    if (l2 === 0) continue;

    // project point on segment
    let t = ((x - a.x) * dx + (y - a.y) * dy) / l2;
    t = Math.max(0, Math.min(1, t));

    const px = a.x + t * dx;
    const py = a.y + t * dy;

    const dist = Math.hypot(x - px, y - py);

    if (dist < bestDist) {
      bestDist = dist;
      best = { x: px, y: py };
    }
  }

  // Reject movement if far away from route corridor
  if (bestDist > MAX_SNAP_DISTANCE) {
    return prev ?? { x, y };
  }

  return best;
}
