import { useEffect, useRef, useState } from "react";

const PIXELS_PER_METER = 49;

// stride tuning
const STRIDE_MIN_M = 0.45;
const STRIDE_MAX_M = 0.85;

const STRIDE_MIN_PX = STRIDE_MIN_M * PIXELS_PER_METER;
const STRIDE_MAX_PX = STRIDE_MAX_M * PIXELS_PER_METER;

const STEP_COOLDOWN_MS = 320;
const PEAK_THRESHOLD = 1.15;

// ✅ heading stability controls
const HEADING_SMOOTHING = 0.05; // smaller = more stable
const HEADING_DEADZONE_DEG = 1.2; // ignore tiny jitter
const HEADING_MAX_TURN_DEG = 6; // max turn per update
const HEADING_THROTTLE_MS = 60; // reduce heading update spam

type XY = { x: number; y: number };

export const usePDR = (
  initialX: number,
  initialY: number,
  isActive: boolean,
  _routePath: string[],
  _nodeMap: Record<string, { x: number; y: number; type: string }>,
  snapFn?: (x: number, y: number, prev?: XY) => XY
) => {
  const [rawPos, setRawPos] = useState<XY>({ x: initialX, y: initialY });
  const [heading, setHeading] = useState(0);

  // Step detection
  const lastStepAt = useRef(0);
  const magSmooth = useRef(9.8);
  const prevMagSmooth = useRef(9.8);

  // Heading
  const headingRef = useRef(0);
  const baseHeading = useRef<number | null>(null);
  const lastHeadingUpdate = useRef(0);

  // Reset pos when origin changes
  useEffect(() => {
    setRawPos({ x: initialX, y: initialY });
  }, [initialX, initialY]);

  const forceSetPos = (x: number, y: number) => setRawPos({ x, y });

  const resetHeading = () => {
    baseHeading.current = null;
  };

  useEffect(() => {
    if (!isActive) return;

    // ======================
    // STEP DETECTION
    // ======================
    const handleMotion = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity;
      if (!acc) return;

      const ax = acc.x || 0;
      const ay = acc.y || 0;
      const az = acc.z || 0;

      const mag = Math.sqrt(ax * ax + ay * ay + az * az);

      prevMagSmooth.current = magSmooth.current;
      magSmooth.current = magSmooth.current * 0.8 + mag * 0.2;

      const diff = magSmooth.current - prevMagSmooth.current;

      const now = Date.now();
      if (now - lastStepAt.current < STEP_COOLDOWN_MS) return;

      if (diff > PEAK_THRESHOLD) {
        lastStepAt.current = now;

        setRawPos((prev) => {
          const rad = (headingRef.current * Math.PI) / 180;

          // dynamic stride
          const stridePx = Math.min(
            STRIDE_MAX_PX,
            Math.max(STRIDE_MIN_PX, diff * 22)
          );

          const next = {
            x: prev.x + Math.sin(rad) * stridePx,
            y: prev.y - Math.cos(rad) * stridePx,
          };

          // ✅ snap / reject step (prevents wall cutting)
          return snapFn ? snapFn(next.x, next.y, prev) : next;
        });

        if (window.navigator.vibrate) window.navigator.vibrate(30);
      }
    };

    // ======================
    // HEADING (stable + smooth)
    // ======================
    const handleOrientation = (e: any) => {
      let compassHeading = 0;

      // iOS Safari
      if (e.webkitCompassHeading != null) {
        compassHeading = e.webkitCompassHeading;
      }
      // Android / others
      else if (e.alpha != null) {
        compassHeading = 360 - e.alpha;
      } else {
        return;
      }

      // ✅ throttle heading updates (reduces jitter spam)
      const now = Date.now();
      if (now - lastHeadingUpdate.current < HEADING_THROTTLE_MS) return;
      lastHeadingUpdate.current = now;

      // ✅ lock starting direction
      if (baseHeading.current === null) {
        baseHeading.current = compassHeading;
      }

      // ✅ correct relative heading (NO +180)
      const relative = (compassHeading - baseHeading.current + 360) % 360;

      const current = headingRef.current;

      // shortest rotation direction
      const rawDiff = ((relative - current + 540) % 360) - 180;

      // ✅ deadzone: ignore tiny shakes
      if (Math.abs(rawDiff) < HEADING_DEADZONE_DEG) return;

      // ✅ clamp: limit max turn speed per update
      const clampedDiff = Math.max(
        -HEADING_MAX_TURN_DEG,
        Math.min(HEADING_MAX_TURN_DEG, rawDiff)
      );

      // ✅ smoothing
      const smoothed = (current + clampedDiff * HEADING_SMOOTHING + 360) % 360;

      headingRef.current = smoothed;
      setHeading(smoothed);
    };

    window.addEventListener("devicemotion", handleMotion);

    const win = window as any;
    const supportsAbsolute = "ondeviceorientationabsolute" in win;

    if (supportsAbsolute) {
      win.addEventListener("deviceorientationabsolute", handleOrientation);
    } else {
      win.addEventListener("deviceorientation", handleOrientation);
    }

    return () => {
      window.removeEventListener("devicemotion", handleMotion);
      if (supportsAbsolute) {
        win.removeEventListener("deviceorientationabsolute", handleOrientation);
      } else {
        win.removeEventListener("deviceorientation", handleOrientation);
      }
    };
  }, [isActive, snapFn]);

  return { rawPos, heading, forceSetPos, resetHeading };
};
