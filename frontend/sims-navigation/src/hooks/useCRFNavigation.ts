import { useEffect, useState, useMemo } from "react";

type XY = { x: number; y: number };
type Node = { x: number; y: number; type: string };
type Edge = { from: string; to: string };

type Params = {
  isNavActive: boolean;
  routePath: string[]; // List of node IDs for guidance
  nodeMap: Record<string, Node>;
  edges: Edge[]; // ALL map edges to allow global free-roaming
  rawPos: XY; // The drifting PDR position
  forceSetPos: (x: number, y: number) => void;
};

/**
 * Free-Roam CRF Navigation Hook
 * Scans the ENTIRE map's corridor network. Applies a strict 0.6m hardstop
 * to prevent the user from drifting through physical walls, allowing true free-roam.
 */
export function useCRFNavigation({
  isNavActive,
  routePath,
  nodeMap,
  edges,
  rawPos,
  forceSetPos
}: Params) {
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [segmentProgress, setSegmentProgress] = useState(0.0);
  const [correctedPos, setCorrectedPos] = useState<XY>(rawPos);
  
  const [turnDetected, setTurnDetected] = useState<{
    detected: boolean; 
    nodeId: string | null;
  }>({ detected: false, nodeId: null });

  // Physics Constants
  const TUNNEL_RADIUS_M = 0.6; 
  const PX_PER_M = 12.2;
  const TUNNEL_RADIUS_PX = TUNNEL_RADIUS_M * PX_PER_M; // ~7.32 pixels

  // Reset when route changes
  useEffect(() => {
    setSegmentIndex(0);
    setSegmentProgress(0.0);
    setTurnDetected({ detected: false, nodeId: null });
    setCorrectedPos(rawPos);
  }, [routePath.length, isNavActive]);

  const currentId = routePath[segmentIndex];
  const nextId = routePath[segmentIndex + 1];
  
  const currentNode = useMemo(() => nodeMap[currentId], [currentId, nodeMap]);
  const nextNode = useMemo(() => nodeMap[nextId], [nextId, nodeMap]);

  useEffect(() => {
    if (!isNavActive) return;

    // 1. Math Helper: Project a point onto a line segment
    const getClosestPointOnSegment = (p: XY, a: XY, b: XY) => {
      const atob = { x: b.x - a.x, y: b.y - a.y };
      const atop = { x: p.x - a.x, y: p.y - a.y };
      const lenSq = atob.x * atob.x + atob.y * atob.y;
      if (lenSq === 0) return { point: a, progress: 0 };
      
      const t = Math.max(0, Math.min(1, (atop.x * atob.x + atop.y * atob.y) / lenSq));
      return { 
        point: { x: a.x + atob.x * t, y: a.y + atob.y * t },
        progress: t 
      };
    };

    // --- PART A: GLOBAL FREE-ROAM MAP CLAMPING ---
    let minMapDist = Infinity;
    let globalClosestPoint = { x: rawPos.x, y: rawPos.y };

    // Scan every single hallway in the building
    for (let i = 0; i < edges.length; i++) {
      const a = nodeMap[edges[i].from];
      const b = nodeMap[edges[i].to];
      if (!a || !b) continue;

      const { point } = getClosestPointOnSegment(rawPos, a, b);
      const d = Math.hypot(rawPos.x - point.x, rawPos.y - point.y);
      
      if (d < minMapDist) {
        minMapDist = d;
        globalClosestPoint = point;
      }
    }

    let newPos = { ...rawPos };

    // Apply the 0.6m Glass Wall Hardstop
    // We add +0.1px to prevent microscopic infinite physics loops
    if (minMapDist > TUNNEL_RADIUS_PX + 0.1) {
      const dx = rawPos.x - globalClosestPoint.x;
      const dy = rawPos.y - globalClosestPoint.y;
      
      // Pin the coordinate exactly to the edge of the 0.6m tunnel
      newPos = {
        x: globalClosestPoint.x + (dx / minMapDist) * TUNNEL_RADIUS_PX,
        y: globalClosestPoint.y + (dy / minMapDist) * TUNNEL_RADIUS_PX
      };
      
      // CRITICAL: Overwrite the sensor data so it doesn't walk through the wall
      forceSetPos(newPos.x, newPos.y); 
    }

    setCorrectedPos(newPos);

    // --- PART B: ROUTE PROGRESSION ---
    // Even if they are free-roaming, if they happen to be on the route, track their progress
    if (currentNode && nextNode) {
        const { progress } = getClosestPointOnSegment(newPos, currentNode, nextNode);
        setSegmentProgress(progress);

        const distToNextNode = Math.hypot(newPos.x - nextNode.x, newPos.y - nextNode.y);
        if (distToNextNode < (1.5 * PX_PER_M) && !turnDetected.detected) {
           if (segmentIndex < routePath.length - 2) {
               setTurnDetected({ detected: true, nodeId: nextId });
           }
        }
    }

  }, [rawPos, isNavActive, edges, nodeMap, forceSetPos, currentNode, nextNode, segmentIndex, turnDetected.detected, nextId, routePath.length]);

  const confirmTurn = () => {
    if (!turnDetected.detected || !nextId) return;
    
    setSegmentIndex(segmentIndex + 1);
    setSegmentProgress(0.0);
    setTurnDetected({ detected: false, nodeId: null });
    
    const realNext = nodeMap[nextId];
    if (realNext) {
        forceSetPos(realNext.x, realNext.y);
    }
  };

  return {
    correctedPos,
    currentNode,
    nextNode,
    segmentIndex,
    segmentProgress,
    turnDetected,
    confirmTurn
  };
}