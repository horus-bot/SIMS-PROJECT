import React, { useRef, useState, useCallback, useEffect } from 'react';

interface NodeType { x: number; y: number; type: string; }
interface FloorData {
  meta?: { building: string; floor: string; floorName: string; svg: string };
  nodes: Record<string, NodeType>;
  edges?: Array<{ from: string; to: string }>;
  destinations: Record<string, { node: string; pic: string }>;
}

interface PinPickupMapProps {
  floorData: FloorData;
  floorId: string;
  onConfirm: (nodeId: string, nodeName: string) => void;
  onClose: () => void;
}

// --- Constants ---
const SNAP_THRESHOLD_PX = 60;
const WARN_THRESHOLD_PX = 150;
const INITIAL_ZOOM = 0.28;   // readable on most phones
const MAX_ZOOM = 1.4;
const MIN_ZOOM = 0.06;

type PinState = 'idle' | 'snapped' | 'warning' | 'far';

const PinPickupMap: React.FC<PinPickupMapProps> = ({ floorData, floorId, onConfirm, onClose }) => {
  const svgUrl = floorData.meta?.svg || `/${floorId}.svg`;

  // Camera offset — the map moves, pin stays fixed at center
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(INITIAL_ZOOM);
  const [pinState, setPinState] = useState<PinState>('idle');
  const [nearestNode, setNearestNode] = useState<{ id: string; name: string; dist: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pinBounce, setPinBounce] = useState(false);

  const viewportRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const lastPinch = useRef<number | null>(null);
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Build destination name lookup: nodeId -> destination name
  const nodeToDestName = React.useMemo(() => {
    const map: Record<string, string> = {};
    Object.entries(floorData.destinations).forEach(([name, info]) => {
      map[info.node] = name;
    });
    return map;
  }, [floorData]);

  // Pre-compute random animated edges (stable, computed once at mount)
  const animatedEdges = React.useMemo(() => {
    const edges = (floorData.edges || []) as Array<{from:string;to:string}>;
    if (edges.length === 0) return [];
    // Pick 6-8 random indices (deterministic via index math, no Math.random at render time)
    const count = Math.min(8, Math.max(4, Math.floor(edges.length * 0.05) + 4));
    const selected: Array<{
      edge: {from:string;to:string};
      reversed: boolean;
      duration: number;
      delay: number;
    }> = [];
    const step = Math.max(1, Math.floor(edges.length / count));
    for (let i = 0; i < count && i * step < edges.length; i++) {
      // Use prime-offset spread for visual variety
      const idx = (i * step + i * 7) % edges.length;
      selected.push({
        edge: edges[idx],
        // Direction: alternate reversed/normal irregularly
        reversed: (i * 3 + 1) % 2 === 0,
        // Duration: 7-13s range, each different
        duration: 7 + (i * 1.7) % 6,
        // Delay: 0-5s staggered
        delay: (i * 0.9) % 5,
      });
    }
    return selected;
  }, [floorData.edges]);

  // Get viewport center in SVG coords (the point under the pin)
  const getPinSvgCoord = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return { x: 0, y: 0 };
    const vpCx = vp.clientWidth / 2;
    const vpCy = vp.clientHeight / 2;
    // SVG coord = (screenCoord - offset) / zoom
    return {
      x: (vpCx - offset.x) / zoom,
      y: (vpCy - offset.y) / zoom,
    };
  }, [offset, zoom]);

  // Find the nearest node to the pin SVG coords
  const evaluatePin = useCallback(() => {
    const pinCoord = getPinSvgCoord();
    const entries = Object.entries(floorData.nodes);
    if (entries.length === 0) return;

    // Use reduce to find nearest — TypeScript can narrow types correctly through reduce
    const nearest = entries.reduce<{ id: string; dist: number }>(
      (best, [id, node]) => {
        const d = Math.hypot(node.x - pinCoord.x, node.y - pinCoord.y);
        return d < best.dist ? { id, dist: d } : best;
      },
      { id: entries[0][0], dist: Math.hypot(entries[0][1].x - pinCoord.x, entries[0][1].y - pinCoord.y) }
    );

    const destName = nodeToDestName[nearest.id] || nearest.id;
    setNearestNode({ id: nearest.id, name: destName, dist: nearest.dist });

    if (nearest.dist <= SNAP_THRESHOLD_PX) {
      setPinState('snapped');
    } else if (nearest.dist <= WARN_THRESHOLD_PX) {
      setPinState('warning');
    } else {
      setPinState('far');
    }
  }, [getPinSvgCoord, floorData.nodes, nodeToDestName]);

  // Debounce pin evaluation on every pan/zoom
  const evalTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedEval = useCallback(() => {
    if (evalTimeoutRef.current) clearTimeout(evalTimeoutRef.current);
    evalTimeoutRef.current = setTimeout(evaluatePin, 80);
  }, [evaluatePin]);

  // Initial centering: center on first node or center of SVG
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const vpCx = vp.clientWidth / 2;
    const vpCy = vp.clientHeight / 2;
    // Center on the centroid of all nodes so the map starts over the actual graph
    const nodeVals = Object.values(floorData.nodes);
    if (nodeVals.length > 0) {
      const cx = nodeVals.reduce((s, n) => s + n.x, 0) / nodeVals.length;
      const cy = nodeVals.reduce((s, n) => s + n.y, 0) / nodeVals.length;
      setOffset({ x: vpCx - cx * INITIAL_ZOOM, y: vpCy - cy * INITIAL_ZOOM });
    } else {
      setOffset({ x: vpCx - 600 * INITIAL_ZOOM, y: vpCy - 500 * INITIAL_ZOOM });
    }
    setTimeout(evaluatePin, 200);
  }, []);

  // --- Pointer handlers ---
  const handlePointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      isDragging.current = true;
      lastPointer.current = { x: e.clientX, y: e.clientY };
    }
    // Bounce pin on touch
    setPinBounce(true);
    setTimeout(() => setPinBounce(false), 300);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2) {
      // Pinch to zoom
      const pts = Array.from(pointers.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (lastPinch.current !== null) {
        const ratio = dist / lastPinch.current;
        setZoom(z => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z * ratio)));
        debouncedEval();
      }
      lastPinch.current = dist;
      return;
    }

    lastPinch.current = null;

    if (!isDragging.current || pointers.current.size !== 1) return;
    const dx = e.clientX - lastPointer.current.x;
    const dy = e.clientY - lastPointer.current.y;
    setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    lastPointer.current = { x: e.clientX, y: e.clientY };
    debouncedEval();
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    (e.target as Element).releasePointerCapture(e.pointerId);
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) {
      isDragging.current = false;
      lastPinch.current = null;
      evaluatePin(); // Final eval on release
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    setZoom(z => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z * factor)));
    debouncedEval();
  };

  // Show toast
  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };

  // Confirm the pin position
  const handleConfirm = () => {
    if (!nearestNode) return;

    if (pinState === 'far') {
      showToast("📍 You seem too far from any corridor. Please move the pin to a nearby hallway or scan a QR code near you for precise location.");
      return;
    }

    if (pinState === 'warning') {
      showToast("⚠️ Pin placed near a corridor — snapping to the nearest path. Make sure you're actually in this area.");
    }

    onConfirm(nearestNode.id, nearestNode.name);
  };

  // Pin color & label based on state
  const pinColor = pinState === 'snapped' ? '#22c55e' : pinState === 'warning' ? '#f59e0b' : '#ef4444';
  const pinLabel =
    pinState === 'snapped' ? `📌 ${nearestNode?.name || 'On Path'}` :
    pinState === 'warning' ? `⚠️ Near: ${nearestNode?.name || 'path'}` :
    pinState === 'far' ? '❌ Too far from any path' : 'Pan map to set location';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 3000,
      display: 'flex', flexDirection: 'column',
      background: '#0f172a', fontFamily: "'Inter', system-ui, sans-serif"
    }}>
      {/* ── Header ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        padding: '16px 20px 12px',
        background: 'linear-gradient(to bottom, rgba(15,23,42,0.95) 80%, transparent)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={onClose} style={{
          width: 40, height: 40, borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)', border: 'none',
          color: 'white', fontSize: 20, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(8px)',
        }}>←</button>
        <div>
          <div style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>Set Your Location</div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 }}>
            Pan the map so the pin marks where you are
          </div>
        </div>
      </div>

      {/* ── Map Viewport ── */}
      <div
        ref={viewportRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        style={{
          flex: 1, position: 'relative', overflow: 'hidden',
          touchAction: 'none', cursor: isDragging.current ? 'grabbing' : 'grab',
          userSelect: 'none',
        }}
      >
        {/* The scrollable map layer */}
        <div style={{
          position: 'absolute',
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          willChange: 'transform',
        }}>
          <img
            src={svgUrl}
            alt="Floor Map"
            draggable={false}
            style={{ display: 'block', maxWidth: 'none', pointerEvents: 'none' }}
          />
          {/* Corridor paths + animated light — no raw node dots shown to user */}
          <svg
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}
          >
            <defs>
              {/* Animated travelling-light effect */}
              <style>{`
                @keyframes travelLight {
                  0%   { stroke-dashoffset: 300; }
                  100% { stroke-dashoffset: 0; }
                }
              `}</style>
            </defs>

            {/* ── LAYER 1: All edges as faint corridor network (full map paths) ── */}
            {floorData.edges && Array.isArray(floorData.edges) &&
              (floorData.edges as Array<{from:string;to:string}>).map((edge, i) => {
                const fromNode = floorData.nodes[edge.from];
                const toNode   = floorData.nodes[edge.to];
                if (!fromNode || !toNode) return null;
                return (
                  <line key={`path-${i}`}
                    x1={fromNode.x} y1={fromNode.y}
                    x2={toNode.x}   y2={toNode.y}
                    stroke="rgba(147,197,253,0.22)"
                    strokeWidth={4}
                    strokeLinecap="round"
                  />
                );
              })
            }

            {/* ── LAYER 2: Random slow travelling lights on selected edges only ── */}
            {animatedEdges.map((item, i) => {
              const fromNode = floorData.nodes[item.edge.from];
              const toNode   = floorData.nodes[item.edge.to];
              if (!fromNode || !toNode) return null;
              const len = Math.hypot(toNode.x - fromNode.x, toNode.y - fromNode.y);
              // Reversed direction: swap endpoints
              const [x1,y1,x2,y2] = item.reversed
                ? [toNode.x, toNode.y, fromNode.x, fromNode.y]
                : [fromNode.x, fromNode.y, toNode.x, toNode.y];
              return (
                <line key={`light-${i}`}
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="rgba(255,255,255,0.72)"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeDasharray={`8 ${Math.max(len + 20, 60)}`}
                  style={{
                    animation: `travelLight ${item.duration}s linear infinite`,
                    animationDelay: `${item.delay}s`,
                  }}
                />
              );
            })}

            {/* Destination labels only — no node dots */}
            {Object.entries(floorData.destinations).map(([name, info]) => {
              const node = floorData.nodes[info.node];
              if (!node) return null;
              return (
                <g key={name}>
                  {/* Small pin dot */}
                  <circle cx={node.x} cy={node.y} r={5}
                    fill="#a78bfa" stroke="white" strokeWidth={1.5} />
                  {/* Room name label */}
                  <text
                    x={node.x} y={node.y - 10}
                    textAnchor="middle"
                    fill="white"
                    fontSize={10}
                    fontWeight="600"
                    fontFamily="Inter, system-ui, sans-serif"
                    paintOrder="stroke"
                    stroke="rgba(15,23,42,0.9)"
                    strokeWidth={3}
                    strokeLinejoin="round"
                  >
                    {name.length > 14 ? name.slice(0, 13) + '…' : name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* ── Fixed center pin (always at viewport center) ── */}
        <div style={{
          position: 'absolute',
          left: '50%', top: '50%',
          transform: `translate(-50%, -100%) ${pinBounce ? 'translateY(-8px)' : ''}`,
          transition: pinBounce ? 'transform 0.15s ease-out' : 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
          pointerEvents: 'none', zIndex: 20,
        }}>
          {/* Shadow under pin */}
          <div style={{
            position: 'absolute', bottom: -2, left: '50%',
            transform: 'translateX(-50%)',
            width: 20, height: 6,
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '50%',
            filter: 'blur(3px)',
          }} />
          {/* Pin SVG */}
          <svg width="40" height="52" viewBox="0 0 40 52" fill="none">
            <circle cx="20" cy="20" r="18" fill={pinColor} stroke="white" strokeWidth="3" />
            <circle cx="20" cy="20" r="8" fill="white" opacity={0.8} />
            <path d="M20 36 L20 52" stroke={pinColor} strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>

        {/* Crosshair rings (pulse on re-evaluation) */}
        <div style={{
          position: 'absolute', left: '50%', top: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none', zIndex: 19,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            border: `2px solid ${pinColor}`,
            opacity: 0.3,
            animation: 'pulse 2s ease-in-out infinite',
          }} />
        </div>
      </div>

      {/* ── Bottom Panel ── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
        padding: '20px 20px 32px',
        background: 'linear-gradient(to top, rgba(15,23,42,0.98) 70%, transparent)',
      }}>
        {/* Status label */}
        <div style={{
          background: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(12px)',
          border: `1px solid ${pinColor}40`,
          borderRadius: 16,
          padding: '12px 16px',
          marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: pinColor,
            flexShrink: 0,
            boxShadow: `0 0 8px ${pinColor}`,
          }} />
          <span style={{ color: 'white', fontSize: 14, fontWeight: 500 }}>{pinLabel}</span>
        </div>

        {/* Warning hint */}
        {pinState === 'far' && (
          <div style={{
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 12,
            padding: '10px 14px',
            marginBottom: 16,
            color: '#fca5a5',
            fontSize: 13,
            lineHeight: 1.5,
          }}>
            Your pin is far from any corridor. Please pan the map closer to a hallway or pathway, or scan a QR code nearby for an accurate location fix.
          </div>
        )}

        {/* Confirm button */}
        <button
          onClick={handleConfirm}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: 16,
            border: 'none',
            background: pinState === 'far'
              ? 'rgba(255,255,255,0.1)'
              : `linear-gradient(135deg, ${pinColor}, ${pinColor}cc)`,
            color: 'white',
            fontWeight: 700,
            fontSize: 16,
            cursor: pinState === 'far' ? 'not-allowed' : 'pointer',
            boxShadow: pinState !== 'far' ? `0 4px 20px ${pinColor}50` : 'none',
            transition: 'all 0.3s ease',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <span>📍</span>
          <span>
            {pinState === 'snapped' ? `Confirm — I'm here` :
             pinState === 'warning' ? 'Set Location (approximate)' :
             pinState === 'far' ? 'Move pin closer to a path' :
             'Pan map to place pin'}
          </span>
        </button>
      </div>

      {/* ── Toast Notification ── */}
      {toast && (
        <div style={{
          position: 'absolute', top: 80, left: 20, right: 20, zIndex: 200,
          background: 'rgba(15,23,42,0.95)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 16,
          padding: '14px 16px',
          color: 'white',
          fontSize: 14,
          lineHeight: 1.5,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          animation: 'slideDown 0.3s ease',
        }}>
          {toast}
        </div>
      )}

      {/* ── Keyframe styles ── */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.6); opacity: 0.05; }
        }
        @keyframes slideDown {
          from { transform: translateY(-10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default PinPickupMap;
