import { useState, useEffect, useRef } from 'react';

// SCALE CALIBRATION: 1m = 49px
const PIXELS_PER_METER = 49; 
const STRIDE_METERS = 0.7; 
const STRIDE_PX = STRIDE_METERS * PIXELS_PER_METER; // ~34.3px
const SENSITIVITY = 4.5; 

export const usePDR = (
  initialX: number,
  initialY: number,
  isActive: boolean,
  snapFn?: (x: number, y: number) => { x: number; y: number }
) => {
  const [rawPos, setRawPos] = useState({ x: initialX, y: initialY });
  const [heading, setHeading] = useState(0);
  const lastAccel = useRef(0);
  const headingRef = useRef(0);

  // ✅ IMPORTANT: update start position when initial changes
  useEffect(() => {
    setRawPos({ x: initialX, y: initialY });
  }, [initialX, initialY]);

  const forceSetPos = (x: number, y: number) => setRawPos({ x, y });

  useEffect(() => {
    if (!isActive) return;

    const handleMotion = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity;
      if (!acc) return;

      const mag = Math.sqrt((acc.x || 0) ** 2 + (acc.y || 0) ** 2 + (acc.z || 0) ** 2);
      const delta = Math.abs(mag - lastAccel.current);
      lastAccel.current = mag;

      if (delta > SENSITIVITY) {
        setRawPos(prev => {
          const rad = (headingRef.current * Math.PI) / 180;

          const next = {
            x: prev.x + Math.sin(rad) * STRIDE_PX,
            y: prev.y - Math.cos(rad) * STRIDE_PX,
          };

          // ✅ CRF snap happens HERE
          return snapFn ? snapFn(next.x, next.y) : next;
        });

        if (window.navigator.vibrate) window.navigator.vibrate(40);
      }
    };

    const handleOrientation = (e: any) => {
      let compassHeading = 0;
      if (e.webkitCompassHeading) compassHeading = e.webkitCompassHeading;
      else if (e.alpha !== null) compassHeading = 360 - e.alpha;

      setHeading(compassHeading);
      headingRef.current = compassHeading;
    };

    window.addEventListener("devicemotion", handleMotion);

    const win = window as any;
    const supportsAbsolute = "ondeviceorientationabsolute" in win;

    if (supportsAbsolute) win.addEventListener("deviceorientationabsolute", handleOrientation);
    else win.addEventListener("deviceorientation", handleOrientation);

    return () => {
      window.removeEventListener("devicemotion", handleMotion);
      if (supportsAbsolute) win.removeEventListener("deviceorientationabsolute", handleOrientation);
      else win.removeEventListener("deviceorientation", handleOrientation);
    };
  }, [isActive, snapFn]);

  return { rawPos, heading, forceSetPos };
};