import { useEffect, useState, useMemo, useRef } from "react";

type XY = { x: number; y: number };
type Node = { x: number; y: number; type: string };

type Params = {
  isNavActive: boolean;
  routePath: string[]; // List of node IDs
  nodeMap: Record<string, Node>;
  rawPos: XY; // The drifting PDR position (from usePDR)
  heading: number; // User's phone heading (for future turn logic)
  forceSetPos: (x: number, y: number) => void; 
};

/**
 * CRF (Constrained Route Following) Navigation Hook
 * 
 * This hook acts as a "particle filter lite" or "map matcher".
 * It takes the noisy, drifting PDR position (rawPos) and purely calculates
 * the user's progress along the valid route path.
 * 
 * It projects user movement onto the current path segment.
 */
export function useCRFNavigation({
  isNavActive,
  routePath,
  nodeMap,
  rawPos,
  heading,
   forceSetPos
}: Params) {
  // We track which segment of the route we are on
  // index 0 means: segment from routePath[0] to routePath[1]
  const [segmentIndex, setSegmentIndex] = useState(0);
  
  // Progress along that segment (0.0 to 1.0)
  // 0.0 = at start node, 1.0 = at end node
  const [segmentProgress, setSegmentProgress] = useState(0.0);
  
  // Turn Detection
  const [turnDetected, setTurnDetected] = useState<{
      detected: boolean; 
      nodeId: string | null;
  }>({ detected: false, nodeId: null });

  // We need to track the *previous* rawPos to calculate delta movement
  const prevRawPos = useRef<XY>(rawPos);

  // Reset when route changes
  useEffect(() => {
    setSegmentIndex(0);
    setSegmentProgress(0.0);
    setTurnDetected({ detected: false, nodeId: null });
    prevRawPos.current = rawPos;
  }, [routePath.length, isNavActive]);

  // Derived: Current & Next Node
  const currentId = routePath[segmentIndex];
  const nextId = routePath[segmentIndex + 1];
  
  const currentNode = useMemo(() => nodeMap[currentId], [currentId, nodeMap]);
  const nextNode = useMemo(() => nodeMap[nextId], [nextId, nodeMap]);

  // Derived: The actual coordinate to show on map (Snapping)
  const correctedPos = useMemo(() => {
    if (!currentNode) return rawPos; // Fallback
    if (!nextNode) return { x: currentNode.x, y: currentNode.y }; // End of route

    // Interpolate
    const dx = nextNode.x - currentNode.x;
    const dy = nextNode.y - currentNode.y;
    
    return {
      x: currentNode.x + dx * segmentProgress,
      y: currentNode.y + dy * segmentProgress,
    };
  }, [currentNode, nextNode, segmentProgress, rawPos]);

  // Main Logic: Update progress based on PDR movement
  useEffect(() => {
    if (!isNavActive || !currentNode || !nextNode) {
      prevRawPos.current = rawPos;
      return;
    }

    // 1. Calculate how much the "raw" PDR dot moved
    // We treat rawPos as a "local delta generator"
    const dxRaw = rawPos.x - prevRawPos.current.x;
    const dyRaw = rawPos.y - prevRawPos.current.y;
    prevRawPos.current = rawPos; // Update for next frame

    // If no movement, do nothing
    if (Math.abs(dxRaw) < 0.1 && Math.abs(dyRaw) < 0.1) return;

    // 2. Define the vector of the current corridor/segment
    const segDx = nextNode.x - currentNode.x;
    const segDy = nextNode.y - currentNode.y;
    const segLen = Math.hypot(segDx, segDy);
    
    if (segLen === 0) return; 

    // 3. Project movement
    const dirX = segDx / segLen;
    const dirY = segDy / segLen;

    // Standard projection (movement parallel to path)
    const moveProj = dxRaw * dirX + dyRaw * dirY;

    // 4. Update progress
    // moveProj is in pixels. Convert to ratio (0..1)
    let progressChange = moveProj / segLen;

    // CORNER FIX: If we are near the end (>70%) and the user moves ORTHOGONALLY 
    // towards the *next* segment direction, we should count that as progress too?
    // Actually, simpler: just allow entering the "proximity zone" of the next node.
    setSegmentProgress(old => {
      let newVal = old + progressChange;
      if (newVal < 0) newVal = 0;
      return newVal;
    });

  }, [rawPos, isNavActive, currentNode, nextNode]);

  // Auto-advance Logic: Proximity based check
  useEffect(() => {
    if (!nextNode) {
        if(segmentProgress >= 1) setSegmentProgress(1); // Cap at end
        return;
    }

    // Check Euclidean distance from our theoretical position to the next node
    const pxTraveled = segmentProgress * Math.hypot(nextNode.x - currentNode.x, nextNode.y - currentNode.y);
    const totalLen = Math.hypot(nextNode.x - currentNode.x, nextNode.y - currentNode.y);
    const distRem = totalLen - pxTraveled;

    // Threshold: 1.5m = ~75px
    // Trigger if close, BUT do not auto advance. Ask for confirmation if it's a turn.
    if ((distRem < 75 || segmentProgress >= 0.95) && !turnDetected.detected) {
       if (segmentIndex < routePath.length - 2) {
           setTurnDetected({ detected: true, nodeId: nextId });
       } else {
         // Reached very end
         if (segmentProgress > 1) setSegmentProgress(1.0);
       }
    }
  }, [segmentProgress, segmentIndex, routePath.length, nextId, nextNode, currentNode, turnDetected.detected]);

  // Public function to confirm turn
  const confirmTurn = () => {
    if (!turnDetected.detected) return;
    
    // Move to next segment
    const nextIdx = segmentIndex + 1;
    
    setSegmentIndex(nextIdx);
    setSegmentProgress(0.0);
    setTurnDetected({ detected: false, nodeId: null });
    
    // Snap PDR drift
    const realNext = nodeMap[routePath[nextIdx]];
    if (realNext) {
        forceSetPos(realNext.x, realNext.y);
        prevRawPos.current = { x: realNext.x, y: realNext.y };
    }
  };

  return {
    correctedPos,
    currentNode,
    nextNode,
    segmentIndex,
    segmentProgress, // 0..1
    turnDetected,
    confirmTurn
  };
}
