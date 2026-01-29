import { useState, useEffect, useRef } from 'react';
import testData from "../data/test_1.json";
import { Kalman2D } from "../utils/kalman2d";

const PIXELS_PER_METER = 49; 
const STRIDE_METERS = 0.6; // Reduced to limit speed to ~1m/s
// const STRIDE_PX = STRIDE_METERS * PIXELS_PER_METER;
const SENSITIVITY = 0.9; 
const STEP_COOLDOWN = 600; // Keep at 600ms for ~1 step/s max
const HEADING_SMOOTHING = 0.05; // Reduced for more resistivity in direction changes 

let alpha = 0.8; 
let gravity = { x: 0, y: 0, z: 0 };

// Added initialMapAngle: 0 = Up, 90 = Right, 180 = Down, 270 = Left
export const usePDR = (initialX: number, initialY: number, isActive: boolean, initialMapAngle: number = 0, routePath: string[] = [], isPaused: boolean = false) => {
  const [rawPos, setRawPos] = useState({ x: initialX, y: initialY });
  const [heading, setHeading] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0); // m/s
  const speedResetTimer = useRef<NodeJS.Timeout | null>(null);
  
  // This ref stores the difference between physical North and Map North
  const calibrationOffset = useRef<number | null>(null);
  
  const headingRef = useRef(0);
  const lastAccel = useRef(0);
  const lastStepTime = useRef(0);
  const rawPosRef = useRef({ x: initialX, y: initialY });
  const kfRef = useRef(new Kalman2D(initialX, initialY));
  
  // Dynamic Stride Estimation
  const strideHistory = useRef<number[]>([]); 
  const currentStride = useRef(STRIDE_METERS); 

  const forceSetPos = (x: number, y: number) => {
    const newPos = { x, y };
    setRawPos(newPos);
    rawPosRef.current = newPos;
    kfRef.current.setState(x, y);
  };

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
        // Calculate step frequency (steps per second)
        const dt = (now - lastStepTime.current) / 1000; 
        
        // Dynamic Stride Estimation (Weinberg approach approximation: height * freq_factor, or just linear with freq)
        // Simplified: Stride Length = K * frequency + C
        if (dt > 0) {
             const freq = 1 / dt; 
             // 0.4 const base, 0.371 coefficient is a common estimation parameter
             const estimatedStride = 0.4 + 0.371 * freq; 
             
             strideHistory.current.push(estimatedStride);
             if (strideHistory.current.length > 5) strideHistory.current.shift();
             
             // Average for smoothness
             currentStride.current = strideHistory.current.reduce((a, b) => a + b, 0) / strideHistory.current.length;
             
             // Calculate Speed (m/s)
             const speed = currentStride.current * freq;
             setCurrentSpeed(speed);

             // Reset speed if no step for 2 seconds
             if (speedResetTimer.current) clearTimeout(speedResetTimer.current);
             speedResetTimer.current = setTimeout(() => setCurrentSpeed(0), 2000);
        }

        // Use current smoothed heading for step direction
        // This heading is already heavily biased towards the route
        const rad = (headingRef.current * Math.PI) / 180;
        
        const dynamicStridePx = currentStride.current * PIXELS_PER_METER;

        let stepX = Math.sin(rad) * dynamicStridePx;
        let stepY = -Math.cos(rad) * dynamicStridePx;

        // --- STEP WEIGHTING (Pull towards next node) ---
        const nodes = testData.nodes as any;
        let closestIdx = -1;
        let minDist = Infinity;
        routePath.forEach((nodeId, idx) => {
           const n = nodes[nodeId];
           if(n) {
               const d = Math.hypot(n.x - rawPosRef.current.x, n.y - rawPosRef.current.y);
               if(d < minDist) { minDist = d; closestIdx = idx; }
           }
        });

        if (closestIdx !== -1 && closestIdx < routePath.length - 1) {
             const nextNode = nodes[routePath[closestIdx + 1]];
             const distToNext = Math.hypot(nextNode.x - rawPosRef.current.x, nextNode.y - rawPosRef.current.y);
             if (distToNext > 0) {
                 const pullX = (nextNode.x - rawPosRef.current.x) / distToNext;
                 const pullY = (nextNode.y - rawPosRef.current.y) / distToNext;
                 
                 // Add 20% pull towards destination to step
                 const WEIGHT = 0.20; 
                 stepX = stepX * (1-WEIGHT) + (pullX * dynamicStridePx) * WEIGHT;
                 stepY = stepY * (1-WEIGHT) + (pullY * dynamicStridePx) * WEIGHT;
             }
        }

        const newX = rawPosRef.current.x + stepX;
        const newY = rawPosRef.current.y + stepY;

        // KALMAN FILTER STEP
        if (dt > 0 && dt < 2.0) { // Safety check for reasonable dt
             kfRef.current.predict(dt); 
             kfRef.current.update(newX, newY);
             
             const filtered = kfRef.current.position;
             
             setRawPos(filtered);
             rawPosRef.current = filtered;
        } else {
             // Fallback for first step or huge lags
             const newPos = { x: newX, y: newY };
             setRawPos(newPos);
             rawPosRef.current = newPos;
             kfRef.current.setState(newX, newY);
        }
        
        lastStepTime.current = now;
        if (window.navigator.vibrate) window.navigator.vibrate(40);
      }  // Added missing closing brace for the if statement
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

      const relativeHeading = (rawCompass - (calibrationOffset.current || 0) + 90 + 360) % 360;

      // Compute ideal heading towards NEXT route node
      const nodes = testData.nodes as any;
      let closestIdx = -1;
      let minDist = Infinity;
      routePath.forEach((nodeId, idx) => {
        const node = nodes[nodeId];
        if (node) {
          const dist = Math.hypot(node.x - rawPosRef.current.x, node.y - rawPosRef.current.y);
          if (dist < minDist) {
            minDist = dist;
            closestIdx = idx;
          }
        }
      });

      let targetHeading = relativeHeading; // default to magnetometer
      
      // If we have a reachable next node, align heading to the PATH segment
      if (closestIdx !== -1 && closestIdx < routePath.length - 1) {
        const nextNode = nodes[routePath[closestIdx + 1]];
        const dx = nextNode.x - rawPosRef.current.x;
        const dy = nextNode.y - rawPosRef.current.y;
        
        // Calculate angle to next node (0=Up, 90=Right)
        // dx, -dy converts screen coords (y down) to cartesian (y up) for atan2
        const idealHeading = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
        
        let error = idealHeading - relativeHeading;
        if (error > 180) error -= 360;
        if (error < -180) error += 360;
        
        // MIXING: 60% Map Path, 40% Magnetometer
        // This makes the user stick to the path direction visually
        const HEADING_WEIGHT = 0.6;
        targetHeading = (relativeHeading + error * HEADING_WEIGHT + 360) % 360;
      }

      // APPLY LOW-PASS FILTER FOR SMOOTHNESS
      setHeading(prevHeading => {
        let diff = targetHeading - prevHeading;
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
      if (speedResetTimer.current) clearTimeout(speedResetTimer.current);
    };
  }, [isActive, initialMapAngle]);

  return { rawPos, heading, forceSetPos, currentSpeed };
};