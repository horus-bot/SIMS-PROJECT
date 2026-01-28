import { useEffect, useRef, useState } from "react";

type XY = { x: number; y: number };
type NodeMap = Record<string, { x: number; y: number; type?: string }>;

const DEADZONE = 5; // degrees tilt ignored
const SPEED_PX_PER_SEC = 140; // base speed
const MAX_STEP_PX = 14; // max movement per frame
const SMOOTHING = 0.15;

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export function useTiltRouteMover(
  initialX: number,
  initialY: number,
  isActive: boolean,
  routePath: string[],
  nodeMap: NodeMap,
  snapFn?: (x: number, y: number, prev?: XY) => XY
) {
  const [pos, setPos] = useState<XY>({ x: initialX, y: initialY });

  const segIndex = useRef(0);

  // tilt values
  const tiltForward = useRef(0); // [-1..1]
  const tiltSmooth = useRef(0);

  // reset pos
  useEffect(() => {
    setPos({ x: initialX, y: initialY });
    segIndex.current = 0;
  }, [initialX, initialY]);

  // helper: update segment index if reached next node
  const updateSegmentIfReached = (p: XY) => {
    if (!routePath || routePath.length < 2) return;

    const i = segIndex.current;
    if (i >= routePath.length - 1) return;

    const a = nodeMap[routePath[i]];
    const b = nodeMap[routePath[i + 1]];
    if (!a || !b) return;

    const distToB = Math.hypot(p.x - b.x, p.y - b.y);

    // reached next node
    if (distToB < 18) {
      segIndex.current = Math.min(segIndex.current + 1, routePath.length - 2);
    }
  };

  useEffect(() => {
    if (!isActive) return;

    // -------- Orientation Listener (Tilt Input) --------
    const onOrientation = (e: any) => {
      const beta = e.beta ?? 0; // front/back tilt (-180..180)

      // Convert tilt into forward motion intention
      let forward = beta / 30;
      forward = clamp(forward, -1, 1);

      // deadzone
      if (Math.abs(beta) < DEADZONE) forward = 0;

      tiltForward.current = forward;
    };

    const win = window as any;
    win.addEventListener("deviceorientation", onOrientation, { passive: true });

    return () => {
      win.removeEventListener("deviceorientation", onOrientation as any);
    };
  }, [isActive]);

  // -------- Animation loop (moves along route) --------
  useEffect(() => {
    if (!isActive) return;

    let raf = 0;
    let last = performance.now();

    const tick = (t: number) => {
      const dt = (t - last) / 1000;
      last = t;

      // smooth forward intention
      tiltSmooth.current =
        tiltSmooth.current * (1 - SMOOTHING) +
        tiltForward.current * SMOOTHING;

      const power = tiltSmooth.current;

      if (Math.abs(power) > 0.001 && routePath.length >= 2) {
        setPos((prev) => {
          const i = segIndex.current;

          const a = nodeMap[routePath[i]];
          const b = nodeMap[routePath[i + 1]];
          if (!a || !b) return prev;

          // segment direction unit vector
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const len = Math.hypot(dx, dy) || 1;

          const ux = dx / len;
          const uy = dy / len;

          // movement step along the segment
          let step = power * SPEED_PX_PER_SEC * dt;
          step = clamp(step, -MAX_STEP_PX, MAX_STEP_PX);

          const next = {
            x: prev.x + ux * step,
            y: prev.y + uy * step,
          };

          // snap to corridor (your wall cutting prevention)
          const snapped = snapFn ? snapFn(next.x, next.y, prev) : next;

          // auto go next node
          updateSegmentIfReached(snapped);

          return snapped;
        });
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [isActive, routePath, nodeMap, snapFn]);

  const forceSetPos = (x: number, y: number) => setPos({ x, y });

  return {
    pos,
    forceSetPos,
    segmentIndex: segIndex.current,
  };
}
