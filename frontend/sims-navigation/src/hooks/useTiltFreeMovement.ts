import { useEffect, useRef, useState } from "react";

type XY = { x: number; y: number };

const DEADZONE_DEG = 10; // ✅ HIGH resistance (ignore small tilt)
const MAX_TILT_DEG = 25; // ✅ clamp tilt range
const SMOOTHING = 0.08; // ✅ heavy smoothing (slow response)

const MAX_SPEED_PX_PER_SEC = 55; // ✅ VERY slow
const FRICTION = 0.86; // ✅ strong resistance / inertia damping
const MAX_STEP_PX = 6; // ✅ max movement per frame (prevents sudden jump)

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function applyDeadzone(val: number, dz: number) {
  if (Math.abs(val) <= dz) return 0;

  // remap (so movement starts smoothly after deadzone)
  const sign = Math.sign(val);
  const mag = Math.abs(val) - dz;
  return sign * mag;
}

export function useTiltFreeMovement(
  initialX: number,
  initialY: number,
  isActive: boolean
) {
  const [pos, setPos] = useState<XY>({ x: initialX, y: initialY });

  // raw tilt
  const rawForward = useRef(0); // beta
  const rawSide = useRef(0); // gamma

  // smoothed tilt
  const smoothForward = useRef(0);
  const smoothSide = useRef(0);

  // velocity (px/sec)
  const vel = useRef({ x: 0, y: 0 });

  // reset pos when origin changes
  useEffect(() => {
    setPos({ x: initialX, y: initialY });
    vel.current = { x: 0, y: 0 };
  }, [initialX, initialY]);

  // listen to phone tilt
  useEffect(() => {
    if (!isActive) return;

    const onOrientation = (e: any) => {
      // beta: front/back (-180..180)
      // gamma: left/right (-90..90)
      let beta = e.beta ?? 0;
      let gamma = e.gamma ?? 0;

      // clamp tilt to avoid insane values
      beta = clamp(beta, -MAX_TILT_DEG, MAX_TILT_DEG);
      gamma = clamp(gamma, -MAX_TILT_DEG, MAX_TILT_DEG);

      rawForward.current = beta;
      rawSide.current = gamma;
    };

    window.addEventListener("deviceorientation", onOrientation, {
      passive: true,
    });

    return () => {
      window.removeEventListener("deviceorientation", onOrientation as any);
    };
  }, [isActive]);

  // animation loop
  useEffect(() => {
    if (!isActive) return;

    let raf = 0;
    let last = performance.now();

    const tick = (t: number) => {
      const dt = (t - last) / 1000;
      last = t;

      // smooth tilt heavily (high resistance feel)
      smoothForward.current =
        smoothForward.current * (1 - SMOOTHING) + rawForward.current * SMOOTHING;

      smoothSide.current =
        smoothSide.current * (1 - SMOOTHING) + rawSide.current * SMOOTHING;

      // apply deadzone (high resistance)
      const f = applyDeadzone(smoothForward.current, DEADZONE_DEG);
      const s = applyDeadzone(smoothSide.current, DEADZONE_DEG);

      // normalize to [-1..1]
      const forwardNorm = clamp(f / (MAX_TILT_DEG - DEADZONE_DEG), -1, 1);
      const sideNorm = clamp(s / (MAX_TILT_DEG - DEADZONE_DEG), -1, 1);

      // convert tilt into target velocity (px/sec)
      const targetVx = sideNorm * MAX_SPEED_PX_PER_SEC;
      const targetVy = -forwardNorm * MAX_SPEED_PX_PER_SEC;

      // add friction / resistance (smooth velocity changes)
      vel.current.x = vel.current.x * FRICTION + targetVx * (1 - FRICTION);
      vel.current.y = vel.current.y * FRICTION + targetVy * (1 - FRICTION);

      // movement step per frame (clamped)
      let stepX = vel.current.x * dt;
      let stepY = vel.current.y * dt;

      stepX = clamp(stepX, -MAX_STEP_PX, MAX_STEP_PX);
      stepY = clamp(stepY, -MAX_STEP_PX, MAX_STEP_PX);

      if (Math.abs(stepX) > 0.001 || Math.abs(stepY) > 0.001) {
        setPos((prev) => ({
          x: prev.x + stepX,
          y: prev.y + stepY,
        }));
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isActive]);

  const forceSetPos = (x: number, y: number) => setPos({ x, y });

  return { pos, forceSetPos };
}
