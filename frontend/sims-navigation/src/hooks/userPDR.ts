import { useEffect, useRef, useState } from "react";

const PIXELS_PER_METER = 49;

// stride tuning
const STRIDE_MIN_M = 0.45;
const STRIDE_MAX_M = 0.85;

const STRIDE_MIN_PX = STRIDE_MIN_M * PIXELS_PER_METER;
const STRIDE_MAX_PX = STRIDE_MAX_M * PIXELS_PER_METER;

const STEP_COOLDOWN_MS = 320;

// ✅ Better step detection params
const GRAVITY = 9.81;
const STEP_MAG_THRESHOLD = 1.25; // how hard the step must be
const MAG_ALPHA = 0.85; // smoothing (higher = smoother)

// ✅ heading stability controls
const HEADING_SMOOTHING = 0.05;
const HEADING_DEADZONE_DEG = 1.2;
const HEADING_MAX_TURN_DEG = 6;
const HEADING_THROTTLE_MS = 60;

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

  // ✅ smooth magnitude + peak detect
  const magSmooth = useRef(GRAVITY);
  const lastMag = useRef(GRAVITY);

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
    // STEP DETECTION (stable)
    // ======================
    const handleMotion = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity;
      if (!acc) return;

      const ax = acc.x ?? 0;
      const ay = acc.y ?? 0;
      const az = acc.z ?? 0;

      const mag = Math.sqrt(ax * ax + ay * ay + az * az);

      // smooth the magnitude
      magSmooth.current = MAG_ALPHA * magSmooth.current + (1 - MAG_ALPHA) * mag;

      // remove gravity baseline
      const magWithoutGravity = Math.abs(magSmooth.current - GRAVITY);

      const now = Date.now();
      if (now - lastStepAt.current < STEP_COOLDOWN_MS) return;

      // ✅ detect rising peak (step)
      const rising = magSmooth.current > lastMag.current;

      if (rising && magWithoutGravity > STEP_MAG_THRESHOLD) {
        lastStepAt.current = now;

        setRawPos((prev) => {
          const rad = (headingRef.current * Math.PI) / 180;

          // dynamic stride based on step intensity
          const intensity = Math.min(3, Math.max(1, magWithoutGravity));
          const stridePx = Math.min(
            STRIDE_MAX_PX,
            Math.max(STRIDE_MIN_PX, intensity * (STRIDE_MIN_PX * 1.15))
          );

          const next = {
            x: prev.x + Math.sin(rad) * stridePx,
            y: prev.y - Math.cos(rad) * stridePx,
          };

          return snapFn ? snapFn(next.x, next.y, prev) : next;
        });

        if (window.navigator.vibrate) window.navigator.vibrate(30);
      }

      lastMag.current = magSmooth.current;
    };

    // ======================
    // HEADING (stable + smooth)
    // ======================
    const handleOrientation = (e: any) => {
      let compassHeading = 0;

      if (e.webkitCompassHeading != null) {
        compassHeading = e.webkitCompassHeading;
      } else if (e.alpha != null) {
        compassHeading = 360 - e.alpha;
      } else {
        return;
      }

      const now = Date.now();
      if (now - lastHeadingUpdate.current < HEADING_THROTTLE_MS) return;
      lastHeadingUpdate.current = now;

      if (baseHeading.current === null) {
        baseHeading.current = compassHeading;
      }

      const relative = (compassHeading - baseHeading.current + 360) % 360;

      const current = headingRef.current;
      const rawDiff = ((relative - current + 540) % 360) - 180;

      if (Math.abs(rawDiff) < HEADING_DEADZONE_DEG) return;

      const clampedDiff = Math.max(
        -HEADING_MAX_TURN_DEG,
        Math.min(HEADING_MAX_TURN_DEG, rawDiff)
      );

      const smoothed = (current + clampedDiff * HEADING_SMOOTHING + 360) % 360;

      headingRef.current = smoothed;
      setHeading(smoothed);
    };

    // ✅ passive helps some browsers performance + reliability
    window.addEventListener("devicemotion", handleMotion, { passive: true });

    const win = window as any;
    const supportsAbsolute = "ondeviceorientationabsolute" in win;

    if (supportsAbsolute) {
      win.addEventListener("deviceorientationabsolute", handleOrientation, {
        passive: true,
      });
    } else {
      win.addEventListener("deviceorientation", handleOrientation, {
        passive: true,
      });
    }

    return () => {
      window.removeEventListener("devicemotion", handleMotion as any);
      if (supportsAbsolute) {
        win.removeEventListener(
          "deviceorientationabsolute",
          handleOrientation as any
        );
      } else {
        win.removeEventListener("deviceorientation", handleOrientation as any);
      }
    };
  }, [isActive, snapFn]);

  return { rawPos, heading, forceSetPos, resetHeading };
};
