import { useMemo, useState, useEffect, useRef, type CSSProperties } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import CampusMap from '../components/map/floor1';
import floorData from '../data/floor_1.json';
import { findShortestPath } from '../utils/pathfinding';


type Destination = typeof floorData.destinations[keyof typeof floorData.destinations];


const getDestinationData = (id: string | null): Destination | null => {
  return id ? floorData.destinations[id as keyof typeof floorData.destinations] : null;
};

const calculatePath = (originData: Destination | null, destData: Destination | null) => {
  if (!originData || !destData) return { path: '', distance: 0 };

  const pathResult = findShortestPath(originData.nearest_node, destData.nearest_node);
  // Stitch: Origin -> Path -> Dest
  const fullPath = `${originData.x},${originData.y} ${pathResult.path} ${destData.x},${destData.y}`;

  return { path: fullPath, distance: pathResult.distance };
};

// --- Styles Object (Inline CSS) ---
// Color Palette
const colors = {
  primary: '#1E293B', // Slate 800 - Professional dark
  primaryDark: '#0F172A',
  secondary: '#10B981', // Emerald 500
  accent: '#3B82F6', // Blue 500
  background: '#F8FAFC', // Slate 50
  surface: '#FFFFFF',
  text: '#1E293B',
  textSecondary: '#64748B',
  lightBlue: '#F0F9FF',
  lightGreen: '#ECFDF5',
  lightPurple: '#FAF5FF',
};

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '100%',
    background: colors.primary,
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    overflow: 'hidden',
    position: 'fixed', // Prevent scroll bounce on mobile
    inset: 0,
  },
  header: {
    background: colors.surface,
    padding: '16px 20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    zIndex: 30,
    flexShrink: 0,
    borderBottom: `1px solid ${colors.primary}`,
  },
  headerTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: colors.primaryDark,
    margin: 0,
    lineHeight: 1.2,
  },
  headerSubtitle: {
    fontSize: '14px',
    color: colors.secondary,
    marginTop: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  mapSection: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
    backgroundColor: colors.background,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapWrapper: {
    // Let the SVG determine the size, but constrained by viewport
    width: '100%',
    height: '100%',
    maxWidth: '100%',
    maxHeight: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'grab',
    touchAction: 'none',
  },
  mapWrapperActive: {
    cursor: 'grabbing',
  } as CSSProperties,
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: '24px',
    borderTopRightRadius: '24px',
    padding: '24px 20px 32px 20px',
    boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
    zIndex: 30,
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    borderTop: `4px solid ${colors.primary}`,
    maxHeight: '40vh',
    overflowY: 'auto',
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  distanceBadge: {
    background: colors.accent,
    color: colors.surface,
    padding: '6px 14px',
    borderRadius: '20px',
    fontWeight: 700,
    fontSize: '14px',
    boxShadow: `0 2px 6px rgba(245, 158, 11, 0.3)`,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    whiteSpace: 'nowrap',
  },
  locationsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: colors.lightGreen,
    padding: '16px',
    borderRadius: '16px',
    border: `1px solid ${colors.secondary}`,
  },
  locationNode: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: colors.secondary,
    fontWeight: 600,
  },
  value: {
    fontSize: '15px',
    fontWeight: 600,
    color: colors.text,
    lineHeight: 1.3,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '120px',
  },
  arrowIcon: {
    color: colors.primary,
    fontSize: '18px',
  },
  actionsRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1.5fr',
    gap: '12px',
    marginTop: '4px',
  },
  btnSecondary: {
    padding: '14px',
    borderRadius: '14px',
    border: `1px solid ${colors.secondary}`,
    backgroundColor: colors.lightGreen,
    color: '#065F46',
    fontWeight: 600,
    fontSize: '15px',
    cursor: 'pointer',
    textAlign: 'center',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s',
  },
  btnPrimary: {
    padding: '14px',
    borderRadius: '14px',
    border: 'none',
    background: colors.primary,
    color: colors.surface,
    fontWeight: 700,
    fontSize: '15px',
    cursor: 'pointer',
    textAlign: 'center',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0 4px 12px rgba(228, 192, 109, 0.3)`,
    transition: 'transform 0.1s',
  },
  floorPill: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    backgroundColor: colors.primary,
    padding: '8px 16px',
    borderRadius: '50px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    fontWeight: 700,
    color: colors.surface,
    fontSize: '14px',
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  zoomControls: {
    position: 'absolute',
    bottom: '240px',
    right: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    zIndex: 10,
  },
  zoomBtn: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    backgroundColor: colors.surface,
    border: `1px solid ${colors.secondary}`,
    color: colors.text,
    fontSize: '20px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    transition: 'background-color 0.2s, transform 0.1s',
  },
};

// --- Components ---

const MapView = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const originId = searchParams.get('origin');
  const destId = searchParams.get('dest');

  const originData = getDestinationData(originId);
  const destData = getDestinationData(destId);

  const { path: graphPathString, distance } = useMemo(
    () => calculatePath(originData, destData),
    [originData, destData]
  );

  // --- INTERACTIVE MAP STATE ---
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 1400, h: 1000 });
  const [isDragging, setIsDragging] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });

  // 1. Initial Fit Bounds
  useEffect(() => {
    if (!graphPathString) {
      setViewBox({ x: 0, y: 0, w: 1000, h: 1000 });
      return;
    }
    const points = graphPathString.split(' ').map(p => p.split(',').map(Number));
    const xs = points.map(p => p[0]);
    const ys = points.map(p => p[1]);
    
    // Bounds
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    
    // Context Padding
    const padding = 80; 
    
    // Min Size (Zoom Cap)
    const contentWidth = Math.max(maxX - minX, 300); 
    const contentHeight = Math.max(maxY - minY, 300);

    let viewX = minX + (maxX - minX)/2 - contentWidth/2 - padding;
    let viewY = minY + (maxY - minY)/2 - contentHeight/2 - padding;
    let viewW = contentWidth + 2 * padding;
    let viewH = contentHeight + 2 * padding;

    // --- Aspect Ratio Correction (Fill Screen) ---
    // This ensures no "letterboxing" bars appear
    const screenAspect = window.innerWidth / (window.innerHeight - 60); // Subtract approx header height
    const contentAspect = viewW / viewH;

    if (screenAspect > contentAspect) {
      // Screen is wider than content -> increase width
      const newW = viewH * screenAspect;
      viewX -= (newW - viewW) / 2;
      viewW = newW;
    } else {
      // Screen is taller than content -> increase height
      const newH = viewW / screenAspect;
      viewY -= (newH - viewH) / 2;
      viewH = newH;
    }

    setViewBox({ x: viewX, y: viewY, w: viewW, h: viewH });
  }, [graphPathString]);


  // 2. Pan Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    lastPos.current = { x: e.clientX, y: e.clientY };
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    
    // Sensitivity Factor (SVG units per Screen pixel)
    // Approximate based on typical screen width
    const scale = viewBox.w / (window.innerWidth || 1000); 

    setViewBox(prev => ({
        ...prev,
        x: prev.x - dx * scale,
        y: prev.y - dy * scale
    }));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as Element).releasePointerCapture(e.pointerId);
  };


  // 3. Zoom Handlers
  const handleZoom = (factor: number) => {
    setViewBox(prev => {
      const newW = prev.w * factor;
      const newH = prev.h * factor;
      return {
        x: prev.x + (prev.w - newW) / 2, // Center zoom
        y: prev.y + (prev.h - newH) / 2,
        w: newW,
        h: newH
      };
    });
  };

  const resetZoom = () => {
     // Re-trigger effect or just hard reset
     setViewBox({ x: 0, y: 0, w: 1400, h: 1000 });
  };

  if (!originData || !destData) {
    return (
      <div style={{ ...styles.container, alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#6B7280' }}>Invalid Route Parameters</p>
        <button onClick={() => navigate('/navigation')} style={{ ...styles.btnSecondary, marginTop: '20px', width: 'auto', padding: '10px 24px' }}>
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* <style> removed */}
      <Header />
      
      {/* Dynamic Styles for Map Animation */}
      <style>
        {`
          @keyframes dash-animation {
            to {
              stroke-dashoffset: -20;
            }
          }
          .route-line {
            stroke-dasharray: 10, 10;
            animation: dash-animation 1s linear infinite;
          }
        `}
      </style>
      
      <div style={styles.mapSection}>
        {/* Floor Indicator Floating on Map */}
        <div style={styles.floorPill}>
          <span>Floor 1</span>
        </div>

        {/* Zoom Controls */}
        <div style={styles.zoomControls}>
          <button style={styles.zoomBtn} onClick={() => handleZoom(0.8)} title="Zoom In">+</button>
          <button style={styles.zoomBtn} onClick={() => handleZoom(1.25)} title="Zoom Out">−</button>
          <button style={{...styles.zoomBtn, fontSize: '14px'}} onClick={resetZoom} title="Reset View">⟲</button>
        </div>

        <div 
          style={styles.mapWrapper}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <CampusMap viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}>
            {/* 1. The Route Line (With Halo and Animation) */}
            {graphPathString && (
              <>
                {/* Halo/Glow */}
                <polyline
                  points={graphPathString}
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.3"
                />
                {/* Main Animated Line */}
                <polyline
                  points={graphPathString}
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="route-line"
                  style={{ 
                    filter: 'drop-shadow(0px 2px 4px rgba(37, 99, 235, 0.3))'
                  }}
                />
              </>
            )}

            {/* 2. Start Marker (Pulse Blue) */}
            <g transform={`translate(${originData.x}, ${originData.y})`}>
              <circle r="16" fill="rgba(59, 130, 246, 0.2)">
                <animate attributeName="r" values="16;24;16" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.2;0;0.2" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle r="8" fill="#3B82F6" stroke="#FFFFFF" strokeWidth="3" />
            </g>

            {/* 3. Destination Marker (Pin) */}
            <g transform={`translate(${destData.x}, ${destData.y})`}>
              <path 
                d="M0,-32 C-12,-32 -20,-22 -20,-10 C-20,8 0,32 0,32 C0,32 20,8 20,-10 C20,-22 12,-32 0,-32 Z" 
                fill="#EF4444" 
                stroke="#FFFFFF" 
                strokeWidth="3" 
                style={{ filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.2))' }}
              />
              <circle cy="-10" r="6" fill="#FFFFFF" />
            </g>
          </CampusMap>
        </div>
      </div>

      <BottomSheet 
        originName={originData.name} 
        destName={destData.name} 
        distance={distance} 
        onCancel={() => navigate('/navigation')}
        onChangeRoute={() => navigate('/navigation')}
      />
    </div>
  );
};

const Header = () => (
  <header style={styles.header}>
    <h1 style={styles.headerTitle}>Navigation Active</h1>
    <div style={styles.headerSubtitle}>
      <span style={{color: '#22C55E'}}>●</span> Live Guidance
    </div>
  </header>
);

interface BottomSheetProps {
  originName: string;
  destName: string;
  distance: number;
  onCancel: () => void;
  onChangeRoute: () => void;
}

const BottomSheet = ({ originName, destName, distance, onCancel, onChangeRoute }: BottomSheetProps) => (
  <div style={styles.bottomSheet}>
    {/* Drag Handle Visual */}
    <div style={{ width: '40px', height: '4px', backgroundColor: '#E5E7EB', borderRadius: '2px', margin: '-8px auto 8px auto' }} />

    {/* Header Row with Distance */}
    <div style={styles.infoRow}>
      <span style={{ fontSize: '18px', fontWeight: 800, color: '#111827' }}>Route Details</span>
      
      <div style={{ display: 'flex', gap: '8px' }}>
        <div style={styles.distanceBadge}>
          <span>⏱️</span> {Math.ceil(distance / 80)} min
        </div>
        <div style={{...styles.distanceBadge, background: '#3B82F6', boxShadow: '0 2px 6px rgba(59, 130, 246, 0.3)' }}>
          <span>👟</span> {Math.round(distance)}m
        </div>
      </div>
    </div>

    {/* From -> To Grid */}
    <div style={styles.locationsGrid}>
      <div style={styles.locationNode}>
        <span style={styles.label}>From</span>
        <span style={{...styles.value, maxWidth: '100px'}} title={originName}>{originName}</span>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <span style={styles.arrowIcon}>➝</span>
      </div>

      <div style={{...styles.locationNode, textAlign: 'right', alignItems: 'flex-end'}}>
        <span style={styles.label}>To</span>
        <span style={{...styles.value, color: '#F59E0B', maxWidth: '100px'}} title={destName}>{destName}</span>
      </div>
    </div>

    {/* Buttons */}
    <div style={styles.actionsRow}>
      <button 
        onClick={onCancel}
        style={styles.btnSecondary}
      >
        Exit
      </button>
      <button 
        onClick={onChangeRoute}
        style={styles.btnPrimary}
      >
        Change Route
      </button>
    </div>
  </div>
);

export default MapView;