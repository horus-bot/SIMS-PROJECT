import { useState, useEffect, useRef } from 'react';

// SCALE CALIBRATION: 1m = 49px
const PIXELS_PER_METER = 49; 
const STRIDE_METERS = 0.7; 
const STRIDE_PX = STRIDE_METERS * PIXELS_PER_METER; // ~34.3px
const SENSITIVITY = 4.5; 

export const usePDR = (initialX: number, initialY: number, isActive: boolean) => {
  const [rawPos, setRawPos] = useState({ x: initialX, y: initialY });
  const [heading, setHeading] = useState(0);
  const lastAccel = useRef(0);

  // We use a ref for heading inside the motion handler to prevent 
  // the effect from re-running (and flickering) every single time you turn 1 degree.
  const headingRef = useRef(0);

  const forceSetPos = (x: number, y: number) => setRawPos({ x, y });

  useEffect(() => {
    if (!isActive) return;

    // --- MOTION HANDLING (Walking) ---
    const handleMotion = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity;
      if (!acc) return;

      const mag = Math.sqrt((acc.x || 0) ** 2 + (acc.y || 0) ** 2 + (acc.z || 0) ** 2);
      const delta = Math.abs(mag - lastAccel.current);
      lastAccel.current = mag;

      if (delta > SENSITIVITY) {
        setRawPos(prev => {
          const rad = (headingRef.current * Math.PI) / 180;
          return {
            x: prev.x + Math.sin(rad) * STRIDE_PX,
            y: prev.y - Math.cos(rad) * STRIDE_PX 
          };
        });
        if (window.navigator.vibrate) window.navigator.vibrate(40);
      }
    };

    // --- ORIENTATION HANDLING (Rotating) ---
    const handleOrientation = (e: any) => {
      let compassHeading = 0;

      if (e.webkitCompassHeading) {
        compassHeading = e.webkitCompassHeading;
      } else if (e.alpha !== null) {
        compassHeading = 360 - e.alpha;
      }

      setHeading(compassHeading);
      headingRef.current = compassHeading; // Sync ref for motion handler
    };

    // Listen for motion
    window.addEventListener('devicemotion', handleMotion);

    // ✅ FIXED: Using 'as any' to prevent the "EventListener on type never" TS error
    const win = window as any;
    const supportsAbsolute = 'ondeviceorientationabsolute' in win;

    if (supportsAbsolute) {
      win.addEventListener('deviceorientationabsolute', handleOrientation);
    } else {
      win.addEventListener('deviceorientation', handleOrientation);
    }

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
      if (supportsAbsolute) {
        win.removeEventListener('deviceorientationabsolute', handleOrientation);
      } else {
        win.removeEventListener('deviceorientation', handleOrientation);
      }
    };
  }, [isActive]); // Only re-run if nav is toggled on/off

  return { rawPos, heading, forceSetPos };
};