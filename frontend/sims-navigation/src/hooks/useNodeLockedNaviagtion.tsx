import { useEffect, useMemo, useState } from "react";

export type NodeType = { x: number; y: number; type: string };

type Params = {
  isNavActive: boolean;
  routePath: string[]; 
  nodeMap: Record<string, NodeType>; 
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
  arriveThresholdPx = 3, 
  forwardThresholdT = 0.92,
}: Params) {
  const [currentNodeIndex, setCurrentNodeIndex] = useState(0);
  const [snappedNodeId, setSnappedNodeId] = useState<string | null>(null);

  useEffect(() => {
    setCurrentNodeIndex(0);
    setSnappedNodeId(routePath[0] ?? null);
  }, [routePath.join("|")]);

  useEffect(() => {
    if (routePath.length === 0) setCurrentNodeIndex(0);
  }, [routePath.length]);

  // ✅ FREE-ROAM: Find absolute closest node with 30px anti-zigzag buffer
  useEffect(() => {
    if (!isNavActive || !nodeMap || Object.keys(nodeMap).length === 0) return;

    let minDist = Infinity;
    let bestId: string | null = null;
    
    // Ensure rawPos is valid before math
    if (isNaN(rawPos.x) || isNaN(rawPos.y)) return;

    for (const id in nodeMap) {
      const n = nodeMap[id];
      const dist = Math.hypot(rawPos.x - n.x, rawPos.y - n.y);
      if (dist < minDist) {
        minDist = dist;
        bestId = id;
      }
    }

    setSnappedNodeId(current => {
        if (!current) return bestId;
        if (current === bestId) return current;
        
        const currentActiveNode = nodeMap[current];
        if (currentActiveNode) {
            const distToCurrent = Math.hypot(rawPos.x - currentActiveNode.x, rawPos.y - currentActiveNode.y);
            // Require new node to be significantly closer to switch (Stops the zig-zag)
            if (minDist < distToCurrent - 30) {
                return bestId;
            }
            return current;
        }
        return bestId;
    });
  }, [rawPos.x, rawPos.y, nodeMap, isNavActive]);

  const currentNodeId = routePath[currentNodeIndex] ?? null;
  const nextNodeId = currentNodeIndex < routePath.length - 1 ? routePath[currentNodeIndex + 1] : null;

  // ✅ Node-locked position is safely drawn at the globally snapped node
  const nodeLockedPos = useMemo(() => {
    if (!snappedNodeId) return rawPos;
    const n = nodeMap[snappedNodeId];
    return n ? { x: n.x, y: n.y } : rawPos;
  }, [snappedNodeId, nodeMap, rawPos]);

  // ✅ INFINITE LOOP TETHER DELETED HERE. The engine is now completely free to roam.

  // If user freely roams back onto a later segment of the route, update instructions
  useEffect(() => {
    if (!isNavActive || !snappedNodeId) return;
    const idxOnRoute = routePath.indexOf(snappedNodeId);
    if (idxOnRoute !== -1 && idxOnRoute >= currentNodeIndex) {
      setCurrentNodeIndex(idxOnRoute);
      setIsFollowing(true);
    }
  }, [snappedNodeId, isNavActive, routePath, currentNodeIndex, setIsFollowing]);

  const routeFacingAngle = useMemo(() => {
    if (!currentNodeId || !nextNodeId) return 0;
    const curr = nodeMap[currentNodeId];
    const next = nodeMap[nextNodeId];
    if (!curr || !next) return 0;
    return (Math.atan2(next.y - curr.y, next.x - curr.x) * 180) / Math.PI;
  }, [currentNodeId, nextNodeId, nodeMap]);

  useEffect(() => {
    if (!isNavActive) return;
    if (routePath.length < 2) return;
    if (currentNodeIndex >= routePath.length - 1) return;
    if (!currentNodeId || !nextNodeId) return;

    const curr = nodeMap[currentNodeId];
    const next = nodeMap[nextNodeId];
    if (!curr || !next) return;

    if (isNaN(rawPos.x) || isNaN(rawPos.y)) return;

    const distToNext = Math.hypot(rawPos.x - next.x, rawPos.y - next.y);
    const dx = next.x - curr.x;
    const dy = next.y - curr.y;
    const segLen2 = dx * dx + dy * dy;
    if (segLen2 === 0) return;

    const t = ((rawPos.x - curr.x) * dx + (rawPos.y - curr.y) * dy) / segLen2;
    const arrived = distToNext < arriveThresholdPx || t >= forwardThresholdT;

    if (arrived) {
      const newIndex = currentNodeIndex + 1;
      setCurrentNodeIndex(newIndex);
      forceSetPos(next.x, next.y);
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
    snappedNodeId 
  };
}