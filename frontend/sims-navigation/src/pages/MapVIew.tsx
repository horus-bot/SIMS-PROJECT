import {
  useMemo,
  useState,
  useEffect,
  useRef,
  type CSSProperties,
} from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import gsap from "gsap";
import TestMap from "../components/map/testMap"; 
import testData from "../data/test_1.json";
import { findShortestPath } from "../utils/pathfinding";
import { usePDR } from "../hooks/usePDR";
import { applyCRFConstraints } from "../utils/mapMatching";

// Define types for the JSON data
interface DestinationData {
  node: string;
  pic: string;
}

interface TestData {
  nodes: Record<string, { x: number; y: number; type: string }>;
  destination: Record<string, DestinationData>;
  // Add other properties if needed
}

// Cast the imported JSON with proper typing
const typedTestData = testData as TestData;

const MAP_W = 4101;
const MAP_H = 3025;

// --- Styles Object (Inline CSS) ---
// Color Palettes
const lightColors = {
  primary: "#1E293B",
  primaryDark: "#0F172A",
  secondary: "#10B981",
  accent: "#3B82F6",
  background: "#F8FAFC",
  surface: "#FFFFFF",
  text: "#0F172A",
  textSecondary: "#64748B",
  lightBlue: "#E0F2FE",
  lightGreen: "#ECFDF5",
  lightPurple: "#FAF5FF",
  border: "#E2E8F0",
  glass: "rgba(255, 255, 255, 0.85)",
  glassBorder: "rgba(0,0,0,0.05)",
};

const darkColors = {
  primary: "#F1F5F9",        // Light text for dark mode
  primaryDark: "#E2E8F0",    // Slightly darker text
  secondary: "#34D399",      // Bright green
  accent: "#60A5FA",         // Bright blue
  background: "#0F172A",     // Deep dark blue/slate
  surface: "#1E293B",        // Dark surface
  text: "#F8FAFC",           // White text
  textSecondary: "#94A3B8",  // Slate text
  lightBlue: "#172554",      // Dark blue bg
  lightGreen: "#064E3B",     // Dark green bg
  lightPurple: "#581C87",    // Dark purple bg
  border: "#334155",         // Dark border
  glass: "rgba(30, 41, 59, 0.85)", // Dark glass
  glassBorder: "rgba(255,255,255,0.1)",
};

type NodeType = { x: number; y: number; type: string };

// Hover Button Helper
const ControlButton = ({ label, children, onClick, style }: { label: string, children: React.ReactNode, onClick: () => void, style?: React.CSSProperties }) => {
    const [hover, setHover] = useState(false);
    return (
        <div 
            style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
        >
            <span style={{
                ...style,
                backgroundColor: "transparent", 
                boxShadow: "none", 
                border: "none",
                width: "auto", height: "auto",
                // Helper label styles
                background: "rgba(0,0,0,0.7)", color: "white", padding: "4px 8px", borderRadius: "6px",
                opacity: hover ? 1 : 0,
                transform: hover ? 'translateX(0px)' : 'translateX(10px)',
                transition: 'all 0.2s ease-out',
                visibility: hover ? 'visible' : 'hidden',
                marginRight: '12px', pointerEvents: 'none', fontSize: '12px'
            }}>{label}</span>
            
            <button 
                onClick={onClick}
                style={{
                    ...style,
                    transform: hover ? 'scale(1.1)' : 'scale(1)',
                    transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}
            >
                {children}
            </button>
        </div>
    );
};

// Location Confirmation Card Component
const LocationConfirmCard = ({ room, image, onConfirm, onReject }: { 
    room: string; 
    image: string; 
    onConfirm: () => void; 
    onReject: () => void; 
}) => {
    const onRejectRef = useRef(onReject);
    onRejectRef.current = onReject;

    // Auto-dismiss after 3s - Fixed Dependency
    useEffect(() => {
        const timer = setTimeout(() => {
            if (onRejectRef.current) onRejectRef.current();
        }, 3000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div 
            style={{
                position: 'absolute',
                bottom: '120px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '90%',
                maxWidth: '380px',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(12px)',
                borderRadius: '20px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                padding: '16px',
                zIndex: 2000,
                border: '1px solid rgba(255,255,255,0.5)',
                overflow: 'hidden'
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <img
                    src={image}
                    alt={room}
                    style={{
                        width: '70px',
                        height: '70px',
                        borderRadius: '16px',
                        objectFit: 'cover',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                />

                <div style={{ marginLeft: '16px', flex: 1 }}>
                    <p style={{
                        color: '#6B7280',
                        fontSize: '12px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        margin: '0 0 4px 0',
                        display: 'flex', alignItems: 'center', gap: '4px'
                    }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        Check Location
                    </p>
                    <p style={{
                        fontSize: '18px',
                        fontWeight: 700,
                        margin: 0,
                        color: '#111827',
                        lineHeight: 1.2
                    }}>
                        {room}
                    </p>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px', position: 'relative', zIndex: 2 }}>
                <button
                    onClick={onReject}
                    style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '12px',
                        backgroundColor: 'rgba(243, 244, 246, 0.8)',
                        color: '#374151',
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '14px'
                    }}
                >
                    Not Here (3s)
                </button>

                <button
                    onClick={onConfirm}
                    style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '12px',
                        backgroundColor: '#10B981',
                        color: 'white',
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '14px',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    Yes, I'm here
                </button>
            </div>
            
            {/* Progress Bar */}
            <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                height: '4px',
                width: '100%',
                background: '#E5E7EB'
            }}>
                <div style={{
                    height: '100%',
                    background: '#10B981',
                    animation: 'countdown 3s linear forwards',
                    width: '100%'
                }} />
                <style>{`
                    @keyframes countdown {
                        from { width: 100%; }
                        to { width: 0%; }
                    }
                `}</style>
            </div>
        </div>
    );
};

// Turn Confirmation Card Component
const TurnConfirmCard = ({ onConfirm, onReject }: { 
    onConfirm: () => void; 
    onReject: () => void; 
}) => {
    const onRejectRef = useRef(onReject);
    onRejectRef.current = onReject;

    useEffect(() => {
        const timer = setTimeout(() => {
            if (onRejectRef.current) onRejectRef.current();
        }, 3000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div 
            style={{
                position: 'absolute',
                bottom: '120px', 
                left: '50%',
                transform: 'translateX(-50%)',
                width: '90%',
                maxWidth: '360px',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(12px)',
                borderRadius: '20px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                padding: '16px',
                zIndex: 2000,
                border: '1px solid rgba(255,255,255,0.5)',
                overflow: 'hidden'
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px',
                    color: 'white',
                    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
                }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="white" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg>
                </div>

                <div style={{ marginLeft: '16px', flex: 1 }}>
                    <p style={{
                        color: '#6B7280',
                        fontSize: '12px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        margin: '0 0 4px 0',
                        display: 'flex', alignItems: 'center', gap: '4px'
                    }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
                        Check Point
                    </p>
                    <p style={{
                        fontSize: '18px',
                        fontWeight: 700,
                        margin: 0,
                        color: '#111827',
                        lineHeight: 1.2
                    }}>
                        At the Corner?
                    </p>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px', position: 'relative', zIndex: 2 }}>
                <button
                    onClick={onConfirm}
                    style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '12px',
                        backgroundColor: '#F59E0B',
                        color: 'white',
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
                        fontSize: '16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                    }}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    Yes, Align Me
                </button>
            </div>
            
             {/* Progress Bar */}
             <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                height: '4px',
                width: '100%',
                background: '#E5E7EB'
            }}>
                <div style={{
                    height: '100%',
                    background: '#F59E0B',
                    animation: 'countdown 3s linear forwards',
                    width: '100%'
                }} />
            </div>
        </div>
    );
};

const MapView = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isNavActive, setIsNavActive] = useState(false);
  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  // Derived Colors & Styles
  const colors = isDarkMode ? darkColors : lightColors;

  const styles = useMemo(() => ({
    container: {
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      width: "100%",
      background: colors.background,
      color: colors.text,
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      overflow: "auto",
      position: "relative" as const,
      inset: "initial",
    } as CSSProperties,
    header: {
      background: colors.glass,
      backdropFilter: "blur(12px)",
      padding: "16px 20px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
      zIndex: 30,
      flexShrink: 0,
      borderBottom: `1px solid ${colors.glassBorder}`,
    },
    mapSection: {
      position: "absolute" as const,
      top: 0, left: 0, right: 0, bottom: 0,
      width: "100%", height: "100%",
      backgroundColor: isDarkMode ? "#020617" : "#F1F5F9", 
      overflow: "hidden",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 0,
    },
    menuSection: {
      position: "absolute" as const,
      bottom: "20px", left: "20px", right: "20px",
      backgroundColor: colors.surface, 
      borderRadius: "24px",
      display: "flex", alignItems: "center", justifyContent: "space-between", 
      padding: "16px", gap: "12px",
      zIndex: 100,
      boxShadow: isDarkMode ? "0 10px 40px rgba(0,0,0,0.5)" : "0 10px 40px rgba(0,0,0,0.15)",
      border: `1px solid ${colors.border}`,
    },
    stepBtnPrimary: {
      flex: 2, height: "50px", borderRadius: "25px", border: "none",
      fontSize: "16px", fontWeight: 700, cursor: "pointer",
      display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
      backgroundColor: colors.accent,
      color: "#FFFFFF",
      boxShadow: `0 4px 12px ${isDarkMode ? 'rgba(96, 165, 250, 0.4)' : 'rgba(37, 99, 235, 0.3)'}`,
      transition: "transform 0.1s ease",
    },
    stepBtnSecondary: {
      width: "50px", height: "50px", flex: "none", borderRadius: "25px",
      border: `1px solid ${colors.border}`,
      fontSize: "24px", fontWeight: 600, cursor: "pointer",
      display: "flex", alignItems: "center", justifyContent: "center",
      backgroundColor: isDarkMode ? colors.background : "#F9FAFB",
      color: colors.textSecondary,
      boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
      transition: "all 0.2s ease",
    },
    viewport: {
      width: "100%", height: "100%", position: "relative" as const, overflow: "hidden",
      background: isDarkMode ? "radial-gradient(circle at 50% 50%, #1e293b 0%, #0f172a 100%)" : "radial-gradient(circle at 50% 50%, #ffffff 0%, #f1f5f9 60%, #e2e8f0 100%)",
      perspective: "1200px",
    },
    map3DWrapper: {
      width: "100%", height: "100%", transformStyle: "preserve-3d" as const, willChange: "transform",
    },
    camera: {
      position: "absolute" as const, inset: 0, transformOrigin: "0 0", willChange: "transform",
    },
    controlLabel: {
      backgroundColor: colors.glass,
      color: colors.text,
      padding: "4px 8px", borderRadius: "6px", fontSize: "12px",
      fontWeight: 600, backdropFilter: "blur(4px)",
      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      whiteSpace: "nowrap", pointerEvents: "none",
      border: `1px solid ${colors.glassBorder}`,
    },
  }), [colors, isDarkMode]);

  const rawOrigin = searchParams.get("origin");
  const rawDest = searchParams.get("dest");

  const destinations = useMemo(() => 
    Object.fromEntries(Object.entries(typedTestData.destination).map(([key, val]) => [key, val.node])) as Record<string, string>,
    []
  );
  const originId = destinations[rawOrigin || ""] || rawOrigin;
  const destId = destinations[rawDest || ""] || rawDest;

  const nodeMap = useMemo(() => typedTestData.nodes as Record<string, NodeType>, []);

  // Destination Markers
  const destinationMarkers = useMemo(() => {
    return Object.entries(destinations).map(([name, id]) => {
      const node = nodeMap[id];
      if (!node) return null;
      return { name, x: node.x, y: node.y, id, pic: typedTestData.destination[name]?.pic };
    }).filter((item): item is {name: string, x: number, y: number, id: string, pic: string} => item !== null);
  }, [destinations, nodeMap]);

  // Starting Coordinates
  const startNode = useMemo(() => nodeMap[originId || ""] || { x: 785, y: 924 }, [originId, nodeMap]);

  // Dijkstra Route calculation
  const routePath = useMemo(() => {
    if (!originId || !destId) return [];
    return findShortestPath(originId, destId, nodeMap);
  }, [originId, destId, nodeMap]);

  // Reset path when route changes
  useEffect(() => {
    setActualPath([]);
    setIsDeviated(false);
  }, [routePath]);

  // Route points for deviation check
  const routePoints = useMemo(() => {
    return routePath.map(id => nodeMap[id]).filter(n => n);
  }, [routePath, nodeMap]);

  // States for actual path and deviation
  const [actualPath, setActualPath] = useState<{x: number, y: number}[]>([]);
  const [isDeviated, setIsDeviated] = useState(false);
  
  // --- MANUAL STEP NAVIGATION ---
  const [stepIndex, setStepIndex] = useState(0);
  
  // Reset step index when route changes
  useEffect(() => {
    setStepIndex(0);
  }, [routePath]);

  // 1. PDR HOOK
  const [isPaused, setIsPaused] = useState(false);
  const { rawPos, heading, forceSetPos, currentSpeed } = usePDR(startNode.x, startNode.y, isNavActive, 0, routePath, isPaused);

  const handleNextStep = () => {
    if (routePath.length === 0) return;
    const nextIndex = Math.min(stepIndex + 1, routePath.length - 1);
    setStepIndex(nextIndex);
    const nodeId = routePath[nextIndex];
    if (nodeId && nodeMap[nodeId]) {
        forceSetPos(nodeMap[nodeId].x, nodeMap[nodeId].y);
    }
  };

  const handlePrevStep = () => {
    if (routePath.length === 0) return;
    const prevIndex = Math.max(stepIndex - 1, 0);
    setStepIndex(prevIndex);
    const nodeId = routePath[prevIndex];
    if (nodeId && nodeMap[nodeId]) {
        forceSetPos(nodeMap[nodeId].x, nodeMap[nodeId].y);
    }
  };


  // Turn Detection Logic
  const [showTurnPopup, setShowTurnPopup] = useState(false);
  const [pendingTurnNode, setPendingTurnNode] = useState<{id: string, x: number, y: number} | null>(null);
  const checkedTurns = useRef<Set<string>>(new Set());

  // Location Confirmation
  const [locationToConfirm, setLocationToConfirm] = useState<{name: string, pic: string} | null>(null);
  const shownDestinations = useRef<Set<string>>(new Set());

  // Destination Image Modal
  const [selectedDestination, setSelectedDestination] = useState<{name: string, pic: string} | null>(null);

  const turnNodes = useMemo(() => {
    const turns: string[] = [];
    if (routePath.length < 3) return turns;
    for (let i = 1; i < routePath.length - 1; i++) {
        const prev = nodeMap[routePath[i - 1]];
        const curr = nodeMap[routePath[i]];
        const next = nodeMap[routePath[i + 1]];
        if (!prev || !curr || !next) continue;

        const angle1 = Math.atan2(curr.y - prev.y, curr.x - prev.x);
        const angle2 = Math.atan2(next.y - curr.y, next.x - curr.x);
        let diff = Math.abs(angle1 - angle2);
        if (diff > Math.PI) diff = 2 * Math.PI - diff;
        if (diff > 0.6) turns.push(routePath[i]);
    }
    return turns;
  }, [routePath, nodeMap]);

  // 2. GLOBAL TUNNEL CONSTRAINTS
  const snapResult = useMemo(() => {
    return applyCRFConstraints(rawPos.x, rawPos.y, routePath);
  }, [rawPos, routePath]);
  
  const snappedPos = { x: snapResult.x, y: snapResult.y };

  // --- NAVIGATION STATE CALCULATION ---
  const navState = useMemo(() => {
    if (!routePath.length) return { turnType: 'straight', distToTurn: 0, totalRem: 0 };
    let turnType = 'straight';
    let distToTurn = 0;
    let currentIdx = 0;
    let minD = Infinity;
    routePath.forEach((id, idx) => {
       const n = nodeMap[id];
       const d = Math.hypot(snappedPos.x - n.x, snappedPos.y - n.y);
       if (d < minD) { minD = d; currentIdx = idx; }
    });
    for (let i = currentIdx; i < routePath.length - 1; i++) {
       const curr = nodeMap[routePath[i]];
       const next = nodeMap[routePath[i+1]];
       const after = routePath[i+2] ? nodeMap[routePath[i+2]] : null;
       distToTurn += Math.hypot(curr.x - next.x, curr.y - next.y);
       if (after) {
          const angle1 = Math.atan2(next.y - curr.y, next.x - curr.x);
          const angle2 = Math.atan2(after.y - next.y, after.x - next.x);
          let diff = angle2 - angle1;
          while (diff <= -Math.PI) diff += 2*Math.PI;
          while (diff > Math.PI) diff -= 2*Math.PI;
          if (Math.abs(diff) > 0.5) { turnType = diff > 0 ? 'right' : 'left'; break; }
       }
    }
    if (currentIdx >= routePath.length - 1) turnType = 'finish';
    let totalRem = 0;
    for(let i=currentIdx; i<routePath.length-1; i++){
        const n1 = nodeMap[routePath[i]];
        const n2 = nodeMap[routePath[i+1]];
        totalRem += Math.hypot(n1.x - n2.x, n1.y - n2.y);
    }
    const PIXELS_PER_METER = 50; 
    return {
       turnType,
       distToTurn: Math.max(0, distToTurn / PIXELS_PER_METER),
       totalRem: Math.max(0, totalRem / PIXELS_PER_METER)
    };
  }, [snappedPos, routePath, nodeMap]);

  // --- TTS INSTRUCTION ---
  const [isMuted, setIsMuted] = useState(false);
  const lastSpokenInstruction = useRef<string | null>(null);

  useEffect(() => {
    const synth = window.speechSynthesis;
    if (isMuted) {
        if (synth) synth.cancel();
        return;
    }

    if (!isNavActive) return;

    const { turnType, distToTurn } = navState;
    
    // Reset memory when far from next action to allow repeating for next similar turn
    if (distToTurn > 30) {
        lastSpokenInstruction.current = null;
        return;
    }

    if (!synth) return;

    const speak = (text: string) => {
        if (lastSpokenInstruction.current === text) return;
        
        synth.cancel(); 
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0; 
        synth.speak(utterance);
        lastSpokenInstruction.current = text;
    };

    // 1. Arrival Logic
    if (turnType === 'finish') {
        if (distToTurn < 8) speak("You have arrived");
        else if (distToTurn < 20 && distToTurn > 10) speak("Destination is ahead in 15 meters");
        return;
    }

    // 2. Turn Logic - Dynamic Updates
    // We quantize the distance to avoid "Turn left in 18.23 meters" 
    // but give updates every ~5 meters when close, and ~10 meters when further away.
    
    // Only announce turns when within 40 meters
    if (distToTurn <= 40) {
        let quantizedDist = 0;
        
        if (distToTurn > 20) {
            // Above 20m, round to nearest 10m (e.g., 30m, 40m)
            quantizedDist = Math.round(distToTurn / 10) * 10;
        } else {
            // Below 20m, round to nearest 5m (e.g., 20m, 15m, 10m, 5m)
            quantizedDist = Math.round(distToTurn / 5) * 5;
        }

        // Avoid announcing "0 meters" if we are practically there (handled by <6m logic previously, but let's be safe)
        if (quantizedDist === 0) quantizedDist = 5; 

        const instructions = [
            `In ${quantizedDist} meters, turn ${turnType}`,
            `Turn ${turnType} in ${quantizedDist} meters`,
            `Upcoming ${turnType} turn in ${quantizedDist} meters`
        ];
        
        // Simple rotation or random selection for "dynamic" feel
        // We use the quantizedDist as a seed to pick a consistent phrase for that specific distance
        // so it doesn't flip-flop randomly between recalcs.
        const phraseIndex = quantizedDist % instructions.length;
        speak(instructions[phraseIndex]);
    }

  }, [navState, isNavActive, isMuted]);

  useEffect(() => { if (isNavActive) setIsDeviated(!snapResult.isOnRoute); }, [snapResult, isNavActive]);

  useEffect(() => {
    if (!isNavActive || isPaused) return;
    for (const nodeId of turnNodes) {
        if (checkedTurns.current.has(nodeId)) continue;
        const node = nodeMap[nodeId];
        const dist = Math.hypot(snappedPos.x - node.x, snappedPos.y - node.y);
        if (dist < 80 && isDeviated) {
            setIsPaused(true);
            setPendingTurnNode({ id: nodeId, ...node });
            setShowTurnPopup(true);
            checkedTurns.current.add(nodeId);
            break; 
        }
    }
  }, [snappedPos, isNavActive, isPaused, turnNodes, nodeMap, isDeviated]);

  const handleConfirmTurn = () => {
    if (pendingTurnNode) forceSetPos(pendingTurnNode.x, pendingTurnNode.y);
    setShowTurnPopup(false);
    setIsPaused(false);
    setPendingTurnNode(null);
  };

  const handleSkipTurn = () => { setShowTurnPopup(false); setIsPaused(false); setPendingTurnNode(null); };

  useEffect(() => {
    if (!isNavActive || routePoints.length < 2) return;
    setActualPath(prev => {
      const last = prev[prev.length - 1];
      if (!last || Math.hypot(snappedPos.x - last.x, snappedPos.y - last.y) > 10) return [...prev, snappedPos];
      return prev;
    });
  }, [snappedPos, isNavActive, routePoints]);

  // Reset shown destinations when navigation starts
  useEffect(() => {
    if (isNavActive) {
      shownDestinations.current.clear();
    }
  }, [isNavActive]);

  // Location Confirmation Logic
  useEffect(() => {
    if (!isNavActive || locationToConfirm) return; // Don't show if already showing or not navigating

    const nearbyDestinations = destinationMarkers.filter(dest => {
      const dist = Math.hypot(snappedPos.x - dest.x, snappedPos.y - dest.y);
      return dist < 150 && dest.pic && !shownDestinations.current.has(dest.name); // Within 150 units, has image, and not shown before
    });

    if (nearbyDestinations.length > 0) {
      // Show the closest one
      const closest = nearbyDestinations.reduce((prev, curr) => {
        const prevDist = Math.hypot(snappedPos.x - prev.x, snappedPos.y - prev.y);
        const currDist = Math.hypot(snappedPos.x - curr.x, snappedPos.y - curr.y);
        return currDist < prevDist ? curr : prev;
      });

      setLocationToConfirm({ name: closest.name, pic: closest.pic });
      shownDestinations.current.add(closest.name); // Mark as shown
    }
  }, [snappedPos, isNavActive, destinationMarkers, locationToConfirm]);



  const handleConfirmLocation = () => {
    if (locationToConfirm) {
      // Find the destination node and reposition
      const destNode = destinationMarkers.find(d => d.name === locationToConfirm.name);
      if (destNode) {
        forceSetPos(destNode.x, destNode.y);
      }
    }
    setLocationToConfirm(null);
  };

  const handleRejectLocation = () => {
    setLocationToConfirm(null);
  };

  const handleReroute = () => {
    let minD = Infinity; let closestId = "";
    Object.entries(nodeMap).forEach(([id, node]) => {
        const d = Math.hypot(snappedPos.x - node.x, snappedPos.y - node.y);
        if (d < minD) { minD = d; closestId = id; }
    });
    if (closestId) navigate(`/map?origin=${closestId}&dest=${destId}`);
  };
  
  const startNavigation = async () => {
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const res = await (DeviceMotionEvent as any).requestPermission();
        if (res === 'granted') setIsNavActive(true);
      } catch (e) { console.error("Sensor permission denied", e); }
    } else { setIsNavActive(true); }
    setActualPath([]); setIsDeviated(false);
  };

  // ============================================
  //   GSAP OPTIMIZED INTERACTIVE MAP LOGIC
  // ============================================

  // Refs for State (Mutable, No Re-renders)
  const camState = useRef({ x: 0, y: 0, zoom: 0.8, bearing: 0, pitch: 45 });

  // DOM Refs
  const viewportRef = useRef<HTMLDivElement>(null);
  const map3DRef = useRef<HTMLDivElement>(null);
  const cameraLayerRef = useRef<HTMLDivElement>(null);
  const compassRef = useRef<HTMLDivElement>(null);

  // Logic Refs
  const [autoFollow, setAutoFollow] = useState(true);
  
  // Gesture Refs
  const lastPointer = useRef<{x: number, y: number} | null>(null);
  const pointers = useRef<Map<number, {x: number, y: number}>>(new Map());
  const initialGestureState = useRef<{dist: number, angle: number, bearing: number} | null>(null);

  // Initialize GSAP Setters for performance
  useEffect(() => {
      if(map3DRef.current) gsap.set(map3DRef.current, { rotateX: 45, rotateZ: 0 });
      if(cameraLayerRef.current) gsap.set(cameraLayerRef.current, { x: 0, y: 0, scale: 0.8 });
  }, []);

  // Sync AutoFollow with GSAP
  useEffect(() => {
    if (!autoFollow || !viewportRef.current) return;
    
    const vp = viewportRef.current;
    const cx = vp.clientWidth / 2;
    const cy = vp.clientHeight / 2;
    const { zoom } = camState.current;

    const targetX = cx - snappedPos.x * zoom;
    const targetY = cy - snappedPos.y * zoom;

    const clamped = clampCamera(targetX, targetY, zoom);

    gsap.to(cameraLayerRef.current, {
        x: clamped.x,
        y: clamped.y,
        duration: 0.5,
        ease: "power2.out",
        onUpdate: () => {
             // Keep internal ref sync if needed, but for auto-follow we trust the tween target
        },
        onComplete: () => {
            camState.current.x = clamped.x;
            camState.current.y = clamped.y;
        }
    });

  }, [snappedPos, autoFollow]);


  // Clamp Helper
  const clampCamera = (nextX: number, nextY: number, nextZoom: number) => {
    const vp = viewportRef.current;
    if (!vp) return { x: nextX, y: nextY, z: nextZoom };
    
    const vpW = vp.clientWidth;
    const vpH = vp.clientHeight;
    
    const minZoomW = vpW / MAP_W;
    const minZoomH = vpH / MAP_H;
    const minZoom = Math.max(minZoomW, minZoomH); // Ensure longest side covers
    const safeZoom = Math.max(nextZoom, minZoom);
    
    const minX = vpW - (MAP_W * safeZoom);
    const maxX = 0;
    const minY = vpH - (MAP_H * safeZoom);
    const maxY = 0;
    
    let resultX = nextX;
    if (minX > maxX) resultX = (vpW - MAP_W * safeZoom) / 2;
    else resultX = Math.min(maxX, Math.max(minX, nextX));
    
    let resultY = nextY;
    if (minY > maxY) resultY = (vpH - MAP_H * safeZoom) / 2;
    else resultY = Math.min(maxY, Math.max(minY, nextY));
    
    return { x: resultX, y: resultY, z: safeZoom };
  };

  // --- INTERACTION HANDLERS ---

  const handlePointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    
    setAutoFollow(false);
    gsap.killTweensOf(cameraLayerRef.current); // Stop auto-follow animation
    
    camState.current.x = gsap.getProperty(cameraLayerRef.current, "x") as number;
    camState.current.y = gsap.getProperty(cameraLayerRef.current, "y") as number;

    if (pointers.current.size === 1) {
        lastPointer.current = { x: e.clientX, y: e.clientY };
    } else if (pointers.current.size === 2) {
        const pts = Array.from(pointers.current.values());
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        const angle = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
        initialGestureState.current = { dist, angle, bearing: camState.current.bearing };
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const pts = Array.from(pointers.current.values());

    // 1. PAN (1 Finger)
    if (pointers.current.size === 1 && lastPointer.current) {
        const dx = e.clientX - lastPointer.current.x;
        const dy = e.clientY - lastPointer.current.y;
        
        const rad = (camState.current.bearing * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const rDx = dx * cos + dy * sin;
        const rDy = dy * cos - dx * sin;

        const nextX = camState.current.x + rDx;
        const nextY = camState.current.y + rDy;
        const clamped = clampCamera(nextX, nextY, camState.current.zoom);
        
        gsap.set(cameraLayerRef.current, { x: clamped.x, y: clamped.y });
        
        camState.current.x = clamped.x;
        camState.current.y = clamped.y;
        
        lastPointer.current = { x: e.clientX, y: e.clientY };
    }
    // 2. ROTATE (2 Fingers)
    else if (pointers.current.size === 2 && initialGestureState.current) {
        const angle = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
        const rotationDelta = (angle - initialGestureState.current.angle) * (180 / Math.PI);
        const newBearing = initialGestureState.current.bearing + rotationDelta;

        gsap.set(map3DRef.current, { rotateZ: newBearing });
        gsap.set(compassRef.current, { rotation: newBearing });
        camState.current.bearing = newBearing;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    (e.target as Element).releasePointerCapture(e.pointerId);
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) initialGestureState.current = null;
    if (pointers.current.size === 1) {
        const p = Array.from(pointers.current.values())[0];
        lastPointer.current = { x: p.x, y: p.y };
    }
  };

  // --- BUTTON ACTIONS ---

  const handleRecenter = () => {
    const vp = viewportRef.current;
    if (!vp) return;
    setAutoFollow(true); 
    camState.current.bearing = 0;
    camState.current.pitch = 45;
    gsap.to(map3DRef.current, { rotateZ: 0, rotateX: 45, duration: 0.8, ease: "power2.inOut" });
    gsap.to(compassRef.current, { rotation: 0, duration: 0.8 });
  };
  
  const resetCompass = () => {
      camState.current.bearing = 0;
      camState.current.pitch = 45;
      gsap.to(map3DRef.current, { rotateZ: 0, rotateX: 45, duration: 0.6, ease: "back.out(1.2)" });
      gsap.to(compassRef.current, { rotation: 0, duration: 0.6, ease: "back.out(1.2)" });
  };

  const handleZoom = (direction: 'in' | 'out') => {
    setAutoFollow(false);
    const { zoom, x, y } = camState.current;
    let newZoom = direction === 'in' ? zoom * 1.35 : zoom / 1.35;
    const clamped = clampCamera(x, y, newZoom);
    
    gsap.to(cameraLayerRef.current, {
        scale: clamped.z,
        x: clamped.x,
        y: clamped.y,
        duration: 0.4,
        ease: "power2.out"
    });
    
    camState.current.zoom = clamped.z;
    camState.current.x = clamped.x;
    camState.current.y = clamped.y;
  };

  if (!originId || !destId) return <div style={{color: 'white', padding: '20px'}}>Invalid Route</div>;

  return (
    <div style={styles.container}>
      {/* Back Button / Exit */}
      <button 
        onClick={() => navigate('/')}
        style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            backgroundColor: 'white',
            border: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#374151',
            cursor: 'pointer',
            zIndex: 100, // Top level
        }}
      >
        ←
      </button>

      <div style={styles.mapSection}>
        {isNavActive && (
          <>
          </>
        )}
        <div 
            ref={viewportRef} 
            style={styles.viewport}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onPointerCancel={handlePointerUp}
        >
          <div ref={map3DRef} style={styles.map3DWrapper}>
            <div ref={cameraLayerRef} style={styles.camera}>
                <TestMap routePath={routePath} actualPath={actualPath} isDeviated={isDeviated} isDarkMode={isDarkMode} />
                <div style={{
                  position: "absolute",
                  left: snappedPos.x,
                  top: snappedPos.y,
                  transform: `translate(-50%, -50%) rotate(${heading}deg)`,
                  transition: 'transform 0.2s linear', 
                  zIndex: 30,
                  pointerEvents: "none",
                  filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.2))",
                }}>
                    <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                       <defs>
                         <radialGradient id="vision" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(60 60) rotate(-90) scale(60 60)">
                            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.4"/>
                            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0"/>
                         </radialGradient>
                         <linearGradient id="arrowGrad" x1="60" y1="20" x2="60" y2="100" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#F59E0B" />
                            <stop offset="1" stopColor="#D97706" /> 
                         </linearGradient>
                       </defs>
                       <path d="M60 60 L20 10 Q 60 -10 100 10 Z" fill="url(#vision)"/>
                       <path d="M60 20 L85 90 L60 75 L35 90 L60 20 Z" fill="url(#arrowGrad)" stroke="white" strokeWidth="3" strokeLinejoin="round" />
                       <circle cx="60" cy="70" r="6" fill="white" />
                    </svg>
                </div>
                
                {/* Floating Destination Labels */}
                {destinationMarkers.map((dest) => {
                    const dist = Math.hypot(snappedPos.x - dest.x, snappedPos.y - dest.y);
                    const isNear = dist < 250; 
                    
                    return (
                        <div key={dest.name} 
                             onClick={() => dest.pic && setSelectedDestination({name: dest.name, pic: dest.pic})}
                             style={{
                            position: "absolute",
                            left: dest.x,
                            top: dest.y,
                            transform: `translate(-50%, -100%) scale(${isNear ? 1.2 : 1})`,
                            marginTop: "-25px",
                            background: isNear ? colors.accent : "rgba(255, 255, 255, 0.9)",
                            color: isNear ? "white" : colors.primary,
                            padding: "6px 12px",
                            borderRadius: "12px",
                            boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
                            fontSize: isNear ? "14px" : "12px",
                            fontWeight: 700,
                            pointerEvents: "auto",
                            cursor: dest.pic ? "pointer" : "default",
                            zIndex: isNear ? 45 : 40,
                            whiteSpace: "nowrap",
                            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            opacity: 0.9,
                            border: `2px solid ${isNear ? "white" : colors.secondary}`,
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            // Ensure it's readable by rotating counter to map rotation if needed, 
                            // but currently map rotates the layer, so labels rotate with it.
                            // To keep text upright, we would need to rotate it back:
                            // transform: `translate(-50%, -100%) rotate(${-heading}deg) ...`
                            // But here 'heading' is user heading. 
                            // The map rotation is controlled by map3DRef / camState.current.bearing.
                            // If user wants labels to always be upright, we'd need access to the current map rotation state.
                            // However, simplified approach is fine for now.
                        }}>
                           <span>📍</span> {dest.name}
                        </div>
                    );
                })}
            </div>
          </div>
          
          <div style={{ position: "absolute", top: "100px", right: "20px", display: 'flex', flexDirection: 'column', gap: '12px', zIndex: 200, alignItems: 'flex-end' }}>
            
            {/* Dark Mode Toggle */}
            <ControlButton 
                label={isDarkMode ? "Light Mode" : "Dark Mode"} 
                onClick={() => setIsDarkMode(!isDarkMode)}
                style={{
                   width: "50px", height: "50px", borderRadius: "16px",
                   backgroundColor: isDarkMode ? "#334155" : "rgba(255, 255, 255, 0.9)",
                   color: isDarkMode ? "#FCD34D" : "#475569", // Yellow moon or slate sun
                   backdropFilter: "blur(8px)", border: `1px solid ${isDarkMode ? "rgba(255,255,255,0.1)" : colors.border}`,
                   fontSize: "22px", display: "flex", alignItems: "center", justifyContent: "center",
                   cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
                }}
            >
               {isDarkMode ? "🌙" : "☀️"}
            </ControlButton>
            
            {/* Speed & Distance Buttons (Only when navigating) */}
            {isNavActive && (
              <>
                 <div style={{
                    width: "50px", height: "50px", borderRadius: "16px",
                    backgroundColor: "rgba(255, 255, 255, 0.9)", color: colors.primary,
                    backdropFilter: "blur(8px)", border: `1px solid ${colors.secondary}`,
                    fontSize: "10px", fontWeight: "bold", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    pointerEvents: "none"
                 }}>
                    <div style={{fontSize: "16px"}}>🏃</div>
                    <div>{(currentSpeed * 3.6).toFixed(1)}</div>
                 </div>

                 <div style={{
                    width: "50px", height: "50px", borderRadius: "16px",
                    backgroundColor: "rgba(255, 255, 255, 0.9)", color: colors.primary,
                    backdropFilter: "blur(8px)", border: `1px solid ${colors.secondary}`,
                    fontSize: "10px", fontWeight: "bold", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    pointerEvents: "none"
                 }}>
                    <div style={{fontSize: "16px"}}>📍</div>
                    <div>{navState.totalRem.toFixed(0)}m</div>
                 </div>
              </>
            )}

            <ControlButton 
                label="Recenter" 
                onClick={handleRecenter}
                style={{
                   width: "50px", height: "50px", borderRadius: "16px",
                   backgroundColor: autoFollow ? colors.accent : "rgba(255, 255, 255, 0.9)",
                   color: autoFollow ? "white" : colors.primary,
                   backdropFilter: "blur(8px)", border: `1px solid ${colors.secondary}`,
                   fontSize: "24px", display: "flex", alignItems: "center", justifyContent: "center",
                   cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
                }}
            >
               ⌖
            </ControlButton>

            <ControlButton 
                label="Zoom In" 
                onClick={() => handleZoom('in')}
                style={{
                   width: "50px", height: "50px", borderRadius: "16px",
                   backgroundColor: "rgba(255, 255, 255, 0.9)", color: colors.primary,
                   backdropFilter: "blur(8px)", border: `1px solid ${colors.secondary}`,
                   fontSize: "24px", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center",
                   cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
                }}
            >
               +
            </ControlButton>

            <ControlButton 
                label="Zoom Out" 
                onClick={() => handleZoom('out')}
                style={{
                   width: "50px", height: "50px", borderRadius: "16px",
                   backgroundColor: "rgba(255, 255, 255, 0.9)", color: colors.primary,
                   backdropFilter: "blur(8px)", border: `1px solid ${colors.secondary}`,
                   fontSize: "24px", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center",
                   cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
                }}
            >
               −
            </ControlButton>

            <ControlButton 
                label={isMuted ? "Unmute Voice" : "Mute Voice"} 
                onClick={() => setIsMuted(!isMuted)}
                style={{
                   width: "50px", height: "50px", borderRadius: "16px",
                   backgroundColor: isMuted ? "#EF4444" : "rgba(255, 255, 255, 0.9)",
                   color: isMuted ? "white" : colors.primary,
                   backdropFilter: "blur(8px)", border: `1px solid ${colors.secondary}`,
                   fontSize: "20px", display: "flex", alignItems: "center", justifyContent: "center",
                   cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
                }}
            >
               {isMuted ? (
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                   <path d="M3 9V15H7L12 20V4L7 9H3Z" fill="currentColor"/>
                   <line x1="16" y1="8" x2="20" y2="12" stroke="currentColor" strokeWidth="2"/>
                   <line x1="20" y1="8" x2="16" y2="12" stroke="currentColor" strokeWidth="2"/>
                 </svg>
               ) : (
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                   <path d="M3 9V15H7L12 20V4L7 9H3Z" fill="currentColor"/>
                   <path d="M16 9C16.5523 9 17 9.44772 17 10V14C17 14.5523 16.5523 15 16 15" stroke="currentColor" strokeWidth="2"/>
                   <path d="M19 7C20.1046 7 21 7.89543 21 9V15C21 16.1046 20.1046 17 19 17" stroke="currentColor" strokeWidth="2"/>
                 </svg>
               )}
            </ControlButton>

            {/* Turn Instruction - Below Icons */}
            {isNavActive && (
              <div style={{ marginTop: '10px', marginRight: '30px', width: '260px' }}>
                <div style={{
                   backgroundColor: "rgba(255, 255, 255, 0.95)",
                   backdropFilter: "blur(16px)",
                   borderRadius: "24px",
                   padding: "10px",
                   paddingRight: "24px",
                   boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
                   display: "flex",
                   alignItems: "center",
                   gap: "16px",
                   border: "1px solid rgba(255,255,255,0.6)"
                }}>
                   {/* Icon Container */}
                   <div style={{
                      width: "56px", 
                      height: "56px", 
                      borderRadius: "18px", 
                      background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center",
                      color: "white",
                      fontSize: "28px",
                      boxShadow: "0 4px 12px rgba(16, 185, 129, 0.25)",
                      flexShrink: 0
                   }}>
                      {navState.turnType === 'left' ? '↰' : navState.turnType === 'right' ? '↱' : navState.turnType === 'finish' ? '🏁' : '↑'}
                   </div>
                   
                   {/* Text Info */}
                   <div style={{display: "flex", flexDirection: "column", gap: "2px"}}>
                      <span style={{fontSize: "18px", fontWeight: 700, color: colors.primary, lineHeight: 1.2}}>
                         {navState.turnType === 'left' ? 'Turn Left' : navState.turnType === 'right' ? 'Turn Right' : navState.turnType === 'finish' ? 'Destination' : 'Go Straight'}
                      </span>
                      <span style={{fontSize: "14px", color: colors.textSecondary, fontWeight: 500}}>
                         in <span style={{color: colors.primary, fontWeight: 700}}>{navState.distToTurn.toFixed(0)}</span> meters
                      </span>
                   </div>
                </div>
              </div>
            )}
          </div>
        </div>


        {/* Floating Destination Image Modal */}
        {selectedDestination && (
          <div 
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 2000,
            }}
            onClick={() => setSelectedDestination(null)}
          >
            <div 
              style={{
                backgroundColor: "white",
                padding: "20px",
                borderRadius: "12px",
                maxWidth: "90vw",
                maxHeight: "90vh",
                position: "relative",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setSelectedDestination(null)}
                style={{
                  position: "absolute",
                  top: "10px",
                  right: "10px",
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
              <h3 style={{ marginTop: 0, marginBottom: "10px" }}>{selectedDestination.name}</h3>
              <img 
                src={`/${selectedDestination.pic}`} 
                alt={selectedDestination.name} 
                style={{ 
                  maxWidth: "100%", 
                  maxHeight: "70vh", 
                  borderRadius: "8px" 
                }} 
              />
            </div>
          </div>
        )}
      </div>

      {/* POPUP OVERLAYS - Moved outside mapSection to sit above everything */}
      
      {locationToConfirm && (
        <LocationConfirmCard
            room={locationToConfirm.name}
            image={`/${locationToConfirm.pic}`}
            onConfirm={handleConfirmLocation}
            onReject={handleRejectLocation}
        />
      )}

      {showTurnPopup && isPaused && (
        <TurnConfirmCard
            onConfirm={handleConfirmTurn}
            onReject={handleSkipTurn}
        />
      )}

      {isDeviated && (
        <div style={{
            position: "absolute", top: "100px", left: "50%", transform: "translateX(-50%)", 
            background: "#EF4444", color: "white", padding: "12px 24px", 
            borderRadius: "30px", fontWeight: "bold", zIndex: 2000,
            boxShadow: "0 4px 12px rgba(239, 68, 68, 0.4)",
            display: "flex", alignItems: "center", gap: "10px"
        }}>
            <span>⚠️ Off Route!</span>
            <button 
              onClick={handleReroute}
              style={{ background: "white", color: "#EF4444", border: "none", padding: "6px 14px", borderRadius: "16px", fontWeight: "bold" }}
            >
              Reroute ⟳
            </button>
        </div>
      )}
      
      {/* Footer Menu */}
      <div style={styles.menuSection}>
        {/* Manual Control (Prev) */}
        <button style={styles.stepBtnSecondary} onClick={handlePrevStep} aria-label="Previous Step">
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>

        {/* Center Toggle: Start Live vs Stop */}
        {!isNavActive ? (
          <button 
            style={styles.stepBtnPrimary} 
            onClick={startNavigation}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
            <span>Start Live Tracking</span>
          </button>
        ) : (
          <button 
            style={{...styles.stepBtnPrimary, backgroundColor: "#FFF1F2", color: "#E11D48", boxShadow: "none", border: "1px solid #FECDD3"}} 
            onClick={() => setIsNavActive(false)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> 
            <span>Exit Navigation</span>
          </button>
        )}

        {/* Manual Control (Next) */}
        <button 
            style={styles.stepBtnSecondary} 
            onClick={handleNextStep}
            aria-label="Next Step"
        >
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>
    </div>
  );
};

export default MapView;