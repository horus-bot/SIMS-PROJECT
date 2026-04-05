import { useState, useEffect, useRef } from 'react';
import { Kalman2D } from "../utils/kalman2d";

const PIXELS_PER_METER = 12.2; 
const STRIDE_METERS = 0.6; 
const SENSITIVITY = 0.9; 
const STEP_COOLDOWN = 600; 

const HEADING_SMOOTHING = 0.05; 
const HEADING_DEADZONE_DEG = 2.5; 
const HEADING_MAX_TURN_RATE_DEG_PER_SEC = 90;

let alpha = 0.8; 
let gravity = { x: 0, y: 0, z: 0 };

export const usePDR = (
  initialX: number,
  initialY: number,
  isActive: boolean,
  initialMapAngle: number = 0,
  routePath: string[] = [],
  isPaused: boolean = false,
  nodesMap: Record<string, { x: number; y: number; type?: string }> = {},
) => {
  // ✅ Safeguard initialization against NaN
  const startX = isNaN(initialX) ? 0 : initialX;
  const startY = isNaN(initialY) ? 0 : initialY;

  const [rawPos, setRawPos] = useState({ x: startX, y: startY });
  const [heading, setHeading] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0); 
  const speedResetTimer = useRef<NodeJS.Timeout | null>(null);
  
  const calibrationOffset = useRef<number | null>(null);
  
  const headingRef = useRef(0);
  const lastHeadingTs = useRef<number>(Date.now());
  const lastAccel = useRef(0);
  // ✅ Prevent NaN explosion on the first step by initializing with Date.now()
  const lastStepTime = useRef(Date.now()); 
  const rawPosRef = useRef({ x: startX, y: startY });
  const kfRef = useRef(new Kalman2D(startX, startY));
  
  const strideHistory = useRef<number[]>([]); 
  const currentStride = useRef(STRIDE_METERS); 

  const forceSetPos = (x: number, y: number) => {
    if (isNaN(x) || isNaN(y)) return;
    const newPos = { x, y };
    setRawPos(newPos);
    rawPosRef.current = newPos;
    kfRef.current.setState(x, y);
  };

  useEffect(() => {
    if (routePath.length < 2) return;
    const startNode = nodesMap[routePath[0]];
    const nextNode = nodesMap[routePath[1]];
    if (!startNode || !nextNode) return;

    const dx = nextNode.x - startNode.x;
    const dy = nextNode.y - startNode.y;
    const initialRouteHeading = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;

    headingRef.current = initialRouteHeading;
    setHeading(initialRouteHeading);
  }, [routePath, nodesMap]);

  useEffect(() => {
    if (!isActive || isPaused) {
      if (!isActive) calibrationOffset.current = null;
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
        const rawDt = (now - lastStepTime.current) / 1000; 
        const dt = Math.min(rawDt, 2.0); // Safety cap
        
        if (dt > 0) {
             const freq = 1 / dt; 
             const estimatedStride = 0.4 + 0.371 * freq; 
             
             strideHistory.current.push(estimatedStride);
             if (strideHistory.current.length > 5) strideHistory.current.shift();
             
             currentStride.current = strideHistory.current.reduce((a, b) => a + b, 0) / strideHistory.current.length;
             const speed = currentStride.current * freq;
             setCurrentSpeed(speed);

             if (speedResetTimer.current) clearTimeout(speedResetTimer.current);
             speedResetTimer.current = setTimeout(() => setCurrentSpeed(0), 2000);
        }

        const rad = (headingRef.current * Math.PI) / 180;
        const dynamicStridePx = currentStride.current * PIXELS_PER_METER;

        let stepX = Math.sin(rad) * dynamicStridePx;
        let stepY = -Math.cos(rad) * dynamicStridePx;

        // Position Freedom: 0.0 weighting
        const WEIGHT = 0.0; 
        stepX = stepX * (1-WEIGHT);
        stepY = stepY * (1-WEIGHT);

        const newX = rawPosRef.current.x + stepX;
        const newY = rawPosRef.current.y + stepY;

        // ✅ CRITICAL NaN SAFEGUARD: Do not corrupt the map position
        if (!isNaN(newX) && !isNaN(newY)) {
          if (dt > 0 && dt < 2.0) { 
               kfRef.current.predict(dt); 
               kfRef.current.update(newX, newY);
               
               const filtered = kfRef.current.position;
               if (!isNaN(filtered.x) && !isNaN(filtered.y)) {
                   setRawPos(filtered);
                   rawPosRef.current = filtered;
               }
          } else {
               const newPos = { x: newX, y: newY };
               setRawPos(newPos);
               rawPosRef.current = newPos;
               kfRef.current.setState(newX, newY);
          }
        }
        
        lastStepTime.current = now;
      } 
    };

    const handleOrientation = (e: any) => {
      let rawCompass = 0;
      if (e.webkitCompassHeading !== undefined) {
        rawCompass = e.webkitCompassHeading;
      } else if (e.alpha !== null) {
        rawCompass = 360 - e.alpha;
      }

      if (calibrationOffset.current === null && rawCompass !== 0) {
        calibrationOffset.current = rawCompass - initialMapAngle;
      }

      // Compass Freedom: target heading relies purely on hardware
      const targetHeading = (rawCompass - (calibrationOffset.current || 0) + 90 + 360) % 360;

      setHeading(prevHeading => {
        const nowTs = Date.now();
        const dt = Math.max(0.016, (nowTs - lastHeadingTs.current) / 1000);
        lastHeadingTs.current = nowTs;

        let diff = targetHeading - prevHeading;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;

        if (Math.abs(diff) < HEADING_DEADZONE_DEG) {
          headingRef.current = prevHeading;
          return prevHeading;
        }

        const desiredStep = diff * HEADING_SMOOTHING;
        const maxStep = HEADING_MAX_TURN_RATE_DEG_PER_SEC * dt;
        const boundedStep = Math.max(-maxStep, Math.min(maxStep, desiredStep));

        const smoothed = (prevHeading + boundedStep + 360) % 360;
        
        // Final NaN check
        if (isNaN(smoothed)) return prevHeading;
        
        headingRef.current = smoothed; 
        return smoothed;
      });
    };

    window.addEventListener('devicemotion', handleMotion);
    window.addEventListener('deviceorientation', handleOrientation);

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
      window.removeEventListener('deviceorientation', handleOrientation);
      if (speedResetTimer.current) clearTimeout(speedResetTimer.current);
    };
  }, [isActive, isPaused, initialMapAngle, routePath, nodesMap]);

  return { rawPos, heading, forceSetPos, currentSpeed };
};