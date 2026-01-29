import { useState, useEffect, useRef } from 'react';

const PIXELS_PER_METER = 49; 
const STRIDE_METERS = 0.7; 
const STRIDE_PX = STRIDE_METERS * PIXELS_PER_METER; 
const SENSITIVITY = 0.9; 
const STEP_COOLDOWN = 600; 
const HEADING_SMOOTHING = 0.15; 

let alpha = 0.8; 
let gravity = { x: 0, y: 0, z: 0 };

// Added initialMapAngle: 0 = Up, 90 = Right, 180 = Down, 270 = Left
export const usePDR = (initialX: number, initialY: number, isActive: boolean, initialMapAngle: number = 0) => {
  const [rawPos, setRawPos] = useState({ x: initialX, y: initialY });
  const [heading, setHeading] = useState(0);
  
  // This ref stores the difference between physical North and Map North
  const calibrationOffset = useRef<number | null>(null);
  
  const headingRef = useRef(0);
  const lastAccel = useRef(0);
  const lastStepTime = useRef(0);
  const rawPosRef = useRef({ x: initialX, y: initialY });

  const forceSetPos = (x: number, y: number) => {
    const newPos = { x, y };
    setRawPos(newPos);
    rawPosRef.current = newPos;
  };

  useEffect(() => {
    if (!isActive) {
      calibrationOffset.current = null;
      return;
    }

    const handleMotion = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity;
      if (!acc) return;

      gravity.x = alpha * gravity.x + (1 - alpha) * (acc.x || 0);
      gravity.y = alpha * gravity.y + (1 - alpha) * (acc.y || 0);
      gravity.z = alpha * gravity.z + (1 - alpha) * (acc.z || 0);

      const linearAcc = {
        x: (acc.x || 0) - gravity.x,
        y: (acc.y || 0) - gravity.y,
        z: (acc.z || 0) - gravity.z
      };
      
      const mag = Math.sqrt(linearAcc.x**2 + linearAcc.y**2 + linearAcc.z**2);
      const delta = Math.abs(mag - lastAccel.current);
      lastAccel.current = mag;

      const now = Date.now();
      if (delta > SENSITIVITY && (now - lastStepTime.current > STEP_COOLDOWN)) {
        // RADIAN CALCULATION
        const rad = (headingRef.current * Math.PI) / 180;
        
        const newX = rawPosRef.current.x + Math.sin(rad) * STRIDE_PX;
        const newY = rawPosRef.current.y - Math.cos(rad) * STRIDE_PX;

        const newPos = { x: newX, y: newY };
        setRawPos(newPos);
        rawPosRef.current = newPos;
        
        lastStepTime.current = now;
        if (window.navigator.vibrate) window.navigator.vibrate(40);
      }
    };

    const handleOrientation = (e: any) => {
      let rawCompass = 0;
      if (e.webkitCompassHeading !== undefined) {
        rawCompass = e.webkitCompassHeading;
      } else if (e.alpha !== null) {
        rawCompass = 360 - e.alpha;
      }

      // --- POC ALIGNMENT LOGIC ---
      if (calibrationOffset.current === null && rawCompass !== 0) {
        // Calculate the fixed offset between the device and the map
        calibrationOffset.current = rawCompass - initialMapAngle;
      }

      const relativeHeading = (rawCompass - (calibrationOffset.current || 0) + 360) % 360;

      // APPLY LOW-PASS FILTER FOR SMOOTHNESS
      setHeading(prevHeading => {
        let diff = relativeHeading - prevHeading;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;

        const smoothed = (prevHeading + diff * HEADING_SMOOTHING + 360) % 360;
        headingRef.current = smoothed; 
        return smoothed;
      });
    };

    window.addEventListener('devicemotion', handleMotion);
    window.addEventListener('deviceorientation', handleOrientation);

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [isActive, initialMapAngle]);

  return { rawPos, heading, forceSetPos };
};