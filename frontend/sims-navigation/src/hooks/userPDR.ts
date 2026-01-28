import { useEffect, useRef, useState, useMemo } from "react";

const PIXELS_PER_METER = 49;

// Stride tuning (Industry average: ~0.76m for men, ~0.67m for women)
// We use a dynamic range based on step intensity
const STRIDE_MIN_M = 0.60; 
const STRIDE_MAX_M = 0.85;

const STRIDE_MIN_PX = STRIDE_MIN_M * PIXELS_PER_METER;
const STRIDE_MAX_PX = STRIDE_MAX_M * PIXELS_PER_METER;

const STEP_COOLDOWN_MS = 350; // Debounce steps

// Sensitivity: Lower = more sensitive. 
// 1.35 reduces false steps (User Request)
const GRAVITY = 9.81;
const STEP_MAG_THRESHOLD = 1.35; 
const MAG_ALPHA = 0.85; // smoothing

// Heading controls
const HEADING_SMOOTHING = 0.15; // Increased smoothing for stability
const HEADING_DEADZONE_DEG = 2.0;
const HEADING_THROTTLE_MS = 50;

type XY = { x: number; y: number };
type Node = { x: number; y: number; type: string };

export const usePDR = (
  initialX: number,
  initialY: number,
  isActive: boolean,
  routePath: string[],
  nodeMap: Record<string, Node>,
  snapFn?: (x: number, y: number, prev?: XY) => XY
) => {
  const [rawPos, setRawPos] = useState<XY>({ x: initialX, y: initialY });
  const [heading, setHeading] = useState(0);

  // Step detection refs
  const lastStepAt = useRef(0);
  const magSmooth = useRef(GRAVITY);
  const lastMag = useRef(GRAVITY);

  // Heading refs
  const headingRef = useRef(0);
  const offsetHeading = useRef<number>(0);
  const lastHeadingUpdate = useRef(0);
  const isAligned = useRef(false);

  // Calculate Initial Route Direction (to align compass)
  const initialRouteAzimuth = useMemo(() => {
    if (routePath.length < 2) return 0;
    const startId = routePath[0];
    const nextId = routePath[1];
    const n1 = nodeMap[startId];
    const n2 = nodeMap[nextId];
    if (!n1 || !n2) return 0;
    
    // Vector from Start -> Next
    const dx = n2.x - n1.x;
    const dy = n2.y - n1.y;
    
    // Map Angle (0=Right, 90=Down)
    const rad = Math.atan2(dy, dx);
    const deg = (rad * 180) / Math.PI;
    
    // Convert to PDR Azimuth (0=Up/North, 90=Right/East)
    // Map 0 (Right) -> PDR 90
    // Map 90 (Down) -> PDR 180
    // Formula: PDR = Map + 90
    return (deg + 90 + 360) % 360; 
  }, [routePath, nodeMap]);

  // Reset pos when origin changes
  useEffect(() => {
    setRawPos({ x: initialX, y: initialY });
    isAligned.current = false;
  }, [initialX, initialY]);

  const forceSetPos = (x: number, y: number) => setRawPos({ x, y });

  const resetHeading = () => {
    isAligned.current = false;
  };

  useEffect(() => {
    if (!isActive) return;

    // ======================
    // MOTION (Steps)
    // ======================
    const handleMotion = (e: DeviceMotionEvent) => {
      // Use userAcceleration if available (removes gravity automatically)
      // Otherwise fallback to accelerationIncludingGravity
      let mag = 0;
      
      if (e.acceleration && e.acceleration.x != null) {
          const ax = e.acceleration.x ?? 0;
          const ay = e.acceleration.y ?? 0;
          const az = e.acceleration.z ?? 0;
          mag = Math.sqrt(ax * ax + ay * ay + az * az);
          // With userAcceleration, no gravity baseline needed, but signal is often noisier
          // We'll treat it similarly but without subtracting 9.81
      } else if (e.accelerationIncludingGravity) {
          const acc = e.accelerationIncludingGravity;
          const ax = acc.x ?? 0;
          const ay = acc.y ?? 0;
          const az = acc.z ?? 0;
          mag = Math.sqrt(ax * ax + ay * ay + az * az);
          // Apply gravity baseline removal below
      }

      // Smooth magnitude
      magSmooth.current = MAG_ALPHA * magSmooth.current + (1 - MAG_ALPHA) * mag;
      
      // Determine intensity (remove gravity if using includingGravity)
      let intensity = Math.abs(magSmooth.current - GRAVITY);
      if (e.acceleration && e.acceleration.x != null) {
        intensity = magSmooth.current; // userAcc already removed gravity
      }

      const now = Date.now();
      if (now - lastStepAt.current < STEP_COOLDOWN_MS) return;

      // Peak detection
      const rising = magSmooth.current > lastMag.current;

      if (rising && intensity > STEP_MAG_THRESHOLD) {
        lastStepAt.current = now;

        setRawPos((prev) => {
          // Move in direction of current heading
          const rad = (headingRef.current * Math.PI) / 180;

          // Dynamic stride
          const strideFactor = Math.min(1.5, Math.max(0.8, intensity / 2));
          const stridePx = Math.min(STRIDE_MAX_PX, Math.max(STRIDE_MIN_PX, STRIDE_MIN_PX * strideFactor));

          // PDR Coordinate Move: 
          // Heading 0 (North) -> y decreases
          // Heading 90 (East) -> x increases
          const next = {
            x: prev.x + Math.sin(rad) * stridePx,
            y: prev.y - Math.cos(rad) * stridePx,
          };

          return snapFn ? snapFn(next.x, next.y, prev) : next;
        });
      }
      lastMag.current = magSmooth.current;
    };

    // ======================
    // ORIENTATION (Heading)
    // ======================
    const handleOrientation = (e: any) => {
      let rawCompass = 0;

      if (e.webkitCompassHeading != null) {
        // iOS
        rawCompass = e.webkitCompassHeading;
      } else if (e.alpha != null) {
        // Android (relative or absolute)
        // REVERSED per user request (User says "moving right shows left")
        // Previously: 360 - e.alpha
        // Now: e.alpha (Assumes e.alpha increases CW on this device)
        rawCompass = e.alpha; 
      } else {
        return;
      }

      // Auto-align on first sample
      if (!isAligned.current) {
         // We want: rawCompass + offset = initialRouteAzimuth
         // So: offset = initialRouteAzimuth - rawCompass
         offsetHeading.current = initialRouteAzimuth - rawCompass;
         isAligned.current = true;
      }

      const now = Date.now();
      if (now - lastHeadingUpdate.current < HEADING_THROTTLE_MS) return;
      lastHeadingUpdate.current = now;

      // Apply Offset + User Tweak (+45 degrees)
      const calibratedHeading = (rawCompass + offsetHeading.current + 45 + 360) % 360;

      // Smoothing
      const current = headingRef.current;
      let diff = calibratedHeading - current;
      // Handle wrap-around (e.g. 359 -> 1)
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;

      if (Math.abs(diff) < HEADING_DEADZONE_DEG) return;

      const smoothed = (current + diff * HEADING_SMOOTHING + 360) % 360;

      headingRef.current = smoothed;
      setHeading(smoothed);
    };

    // Listeners
    window.addEventListener("devicemotion", handleMotion, { passive: true });
    
    // Try deviceorientationabsolute for Android chrome
    const win = window as any;
    if ("ondeviceorientationabsolute" in win) {
      win.addEventListener("deviceorientationabsolute", handleOrientation, { passive: true });
    } else {
      win.addEventListener("deviceorientation", handleOrientation, { passive: true });
    }

    return () => {
      window.removeEventListener("devicemotion", handleMotion as any);
      if ("ondeviceorientationabsolute" in win) {
        win.removeEventListener("deviceorientationabsolute", handleOrientation as any);
      } else {
        win.removeEventListener("deviceorientation", handleOrientation as any);
      }
    };
  }, [isActive, snapFn, initialRouteAzimuth]);

  return { rawPos, heading, forceSetPos, resetHeading };
};
