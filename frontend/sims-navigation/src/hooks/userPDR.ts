import { useEffect, useRef, useState } from "react";

const PIXELS_PER_METER = 49;

// stride tuning
const STRIDE_MIN_M = 0.45;
const STRIDE_MAX_M = 0.85;

const STRIDE_MIN_PX = STRIDE_MIN_M * PIXELS_PER_METER;
const STRIDE_MAX_PX = STRIDE_MAX_M * PIXELS_PER_METER;

const STEP_COOLDOWN_MS = 320;
const PEAK_THRESHOLD = 1.15;

const HEADING_SMOOTHING = 0.18;

type XY = { x: number; y: number };

export const usePDR = (
initialX: number, initialY: number, isActive: boolean, routePath: string[], nodeMap: Record<string, { x: number; y: number; type: string; }>, snapFn?: (x: number, y: number, prev?: XY) => XY) => {
  const [rawPos, setRawPos] = useState<XY>({ x: initialX, y: initialY });
  const [heading, setHeading] = useState(0);

  // Step detection
  const lastStepAt = useRef(0);
  const magSmooth = useRef(9.8);
  const prevMagSmooth = useRef(9.8);

  // Heading
  const headingRef = useRef(0);
  const baseHeading = useRef<number | null>(null);

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

    // STEP DETECTION
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

    // HEADING (relative + smooth)
    const handleOrientation = (e: any) => {
      let compassHeading = 0;

      if (e.webkitCompassHeading != null) {
        compassHeading = e.webkitCompassHeading;
      } else if (e.alpha != null) {
        compassHeading = 360 - e.alpha;
      } else {
        return;
      }

      if (baseHeading.current === null) {
        baseHeading.current = compassHeading; // lock start direction
      }

      const relative = (compassHeading - baseHeading.current + 360) % 360;

      const current = headingRef.current;
      const rawDiff = ((relative - current + 540) % 360) - 180;
      const smoothed = (current + rawDiff * HEADING_SMOOTHING + 360) % 360;

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
