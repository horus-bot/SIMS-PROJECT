import { useEffect, useMemo, useState } from "react";

export type NodeType = { x: number; y: number; type: string };

type Params = {
  isNavActive: boolean;
  routePath: string[]; // ✅ ONLY shortest-path nodes
  nodeMap: Record<string, NodeType>; // ✅ all nodes for coord lookup
  rawPos: { x: number; y: number };
  forceSetPos: (x: number, y: number) => void;
  setIsFollowing: (v: boolean) => void;
  arriveThresholdPx?: number;
  forwardThresholdT?: number;
};

export function useNodeLockedNavigation({
  isNavActive,
  routePath,
  nodeMap,
  rawPos,
  forceSetPos,
  setIsFollowing,
  arriveThresholdPx = 35,
  forwardThresholdT = 0.92,
}: Params) {
  const [currentNodeIndex, setCurrentNodeIndex] = useState(0);

  // ✅ Reset index when route changes (shortest path changes)
  useEffect(() => {
    setCurrentNodeIndex(0);
  }, [routePath.join("|")]);

  // ✅ Safety reset when route empty
  useEffect(() => {
    if (routePath.length === 0) setCurrentNodeIndex(0);
  }, [routePath.length]);

  // ✅ Use ONLY routePath nodes for nav
  const currentNodeId = routePath[currentNodeIndex] ?? null;
  const nextNodeId =
    currentNodeIndex < routePath.length - 1
      ? routePath[currentNodeIndex + 1]
      : null;

  // ✅ Node-locked position shown on map
  const nodeLockedPos = useMemo(() => {
    if (!currentNodeId) return rawPos;
    const n = nodeMap[currentNodeId];
    return n ? { x: n.x, y: n.y } : rawPos;
  }, [currentNodeId, nodeMap, rawPos]);

  // ✅ Route direction angle (current -> next)
  const routeFacingAngle = useMemo(() => {
    if (!currentNodeId || !nextNodeId) return 0;
    const curr = nodeMap[currentNodeId];
    const next = nodeMap[nextNodeId];
    if (!curr || !next) return 0;
    return (Math.atan2(next.y - curr.y, next.x - curr.x) * 180) / Math.PI;
  }, [currentNodeId, nextNodeId, nodeMap]);

  // ✅ Auto-advance to next node when rawPos reaches the next segment end
  useEffect(() => {
    if (!isNavActive) return;
    if (routePath.length < 2) return;
    if (currentNodeIndex >= routePath.length - 1) return;
    if (!currentNodeId || !nextNodeId) return;

    const curr = nodeMap[currentNodeId];
    const next = nodeMap[nextNodeId];
    if (!curr || !next) return;

    // Distance to next node
    const distToNext = Math.hypot(rawPos.x - next.x, rawPos.y - next.y);

    // Projection progress t on segment curr->next
    const dx = next.x - curr.x;
    const dy = next.y - curr.y;
    const segLen2 = dx * dx + dy * dy;
    if (segLen2 === 0) return;

    const t = ((rawPos.x - curr.x) * dx + (rawPos.y - curr.y) * dy) / segLen2;

    // ✅ Arrive condition: close enough OR forward enough
    const arrived = distToNext < arriveThresholdPx || t >= forwardThresholdT;

    if (arrived) {
      const newIndex = currentNodeIndex + 1;
      setCurrentNodeIndex(newIndex);

      // Snap exactly to next route node (node-only movement)
      forceSetPos(next.x, next.y);

      // keep camera centered
      setIsFollowing(true);
    }
  }, [
    isNavActive,
    routePath,
    nodeMap,
    rawPos.x,
    rawPos.y,
    currentNodeIndex,
    currentNodeId,
    nextNodeId,
    arriveThresholdPx,
    forwardThresholdT,
    forceSetPos,
    setIsFollowing,
  ]);

  // Manual helper (optional, can be used for debugging)
  const goNextNode = () => {
    if (currentNodeIndex >= routePath.length - 1) return;
    const nextIdx = currentNodeIndex + 1;
    const id = routePath[nextIdx];
    const n = nodeMap[id];
    if (!n) return;

    setCurrentNodeIndex(nextIdx);
    forceSetPos(n.x, n.y);
    setIsFollowing(true);
  };

  return {
    currentNodeIndex,
    currentNodeId,
    nextNodeId,
    nodeLockedPos,
    routeFacingAngle,
    goNextNode,
  };
}
