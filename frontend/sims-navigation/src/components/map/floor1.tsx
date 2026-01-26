// src/components/Map/CampusMap.tsx
import React from 'react';

interface CampusMapProps {
  children?: React.ReactNode;
  className?: string;
  viewBox?: string;
}

const CampusMap: React.FC<CampusMapProps> = ({ children, className = '', viewBox = '0 0 1400 1000' }) => {
  return (
    <svg
      viewBox={viewBox}
      xmlns="http://www.w3.org/2000/svg"
      className={`block w-full h-full ${className}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ transition: 'all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)', background: '#F8FAFC' }}
    >
      {/* 1. DEFINITIONS & STYLES */}
      <defs>
        <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E2E8F0" strokeWidth="1"/>
        </pattern>
        <style>
          {`
            /* --- BASE LAYERS --- */
            .bg-grid { fill: url(#grid-pattern); }
            
            /* --- NAVIGATION SURFACES --- */
            .walkable { fill: #FFFFFF; stroke: #CBD5E1; stroke-width: 1; }
            .atrium-floor { fill: #F1F5F9; stroke: #CBD5E1; stroke-width: 1; }
            
            /* --- ZONES (Modern Clean) --- */
            .zone-academic { fill: #E0F2FE; stroke: #7DD3FC; stroke-width: 2; } /* Sky Blue */
            .zone-admin    { fill: #F0FDF4; stroke: #86EFAC; stroke-width: 2; } /* Green */
            .zone-labs     { fill: #F5F3FF; stroke: #A78BFA; stroke-width: 2; } /* Violet */
            .zone-service  { fill: #F1F5F9; stroke: #94A3B8; stroke-width: 2; } /* Slate */
            
            /* --- VERTICAL & OBSTACLES --- */
            .core { fill: #475569; stroke: #334155; stroke-width: 0; }
            .pillar { fill: #1E293B; }
            
            /* --- TEXT --- */
            .label-room { font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 600; fill: #475569; text-anchor: middle; dominant-baseline: middle; pointer-events: none; }
            .label-zone { font-family: 'Inter', sans-serif; font-size: 10px; font-weight: 700; fill: #94A3B8; text-anchor: middle; text-transform: uppercase; letter-spacing: 1px; }
            
            /* --- DOORS --- */
            .door-gap { stroke: #FFFFFF; stroke-width: 8; stroke-linecap: round; }
          `}
        </style>
      </defs>

      {/* 2. BACKGROUND & GRID */}
      <rect width="1400" height="1000" fill="#F8FAFC" />
      <rect width="1400" height="1000" className="bg-grid" />

      {/* 3. NAVIGATION MESH (Walkable Areas) */}
      <g id="nav-mesh">
        <rect x="100" y="380" width="500" height="80" className="walkable" />
        <rect x="800" y="380" width="500" height="80" className="walkable" />
        <rect x="100" y="780" width="800" height="80" className="walkable" />
        <rect x="660" y="680" width="80" height="120" className="walkable" />
        <circle cx="700" cy="500" r="200" className="atrium-floor" />
        <polygon points="600,380 600,460 650,500 650,380" className="walkable" />
        <polygon points="800,380 800,460 750,500 750,380" className="walkable" />
        <path d="M 1250 460 L 1250 860 L 900 860 L 900 820 L 1210 820 L 1210 460 Z" className="walkable" />
      </g>

      {/* 4. WING A (Academic) */}
      <g id="wing-a">
        <rect x="100" y="220" width="120" height="160" className="zone-academic" />
        <text x="160" y="300" className="label-room">MAC LAB</text>
        <line x1="140" y1="380" x2="180" y2="380" className="door-gap"/>

        <rect x="230" y="220" width="120" height="160" className="zone-academic" />
        <text x="290" y="300" className="label-room">RT LAB</text>
        <line x1="270" y1="380" x2="310" y2="380" className="door-gap"/>

        <rect x="360" y="250" width="100" height="130" className="zone-academic" />
        <text x="410" y="315" className="label-room">CLASS A1</text>
        <line x1="390" y1="380" x2="430" y2="380" className="door-gap"/>

        <rect x="470" y="250" width="100" height="130" className="zone-academic" />
        <text x="520" y="315" className="label-room">CLASS A2</text>
        <line x1="500" y1="380" x2="540" y2="380" className="door-gap"/>

        <rect x="100" y="460" width="120" height="130" className="zone-academic" />
        <text x="160" y="525" className="label-room">CLASS A3</text>
        <line x1="140" y1="460" x2="180" y2="460" className="door-gap"/>

        <rect x="230" y="460" width="200" height="130" className="zone-academic" />
        <text x="330" y="525" className="label-room">TEACHERS</text>
        <line x1="310" y1="460" x2="350" y2="460" className="door-gap"/>
        
        <rect x="440" y="460" width="130" height="130" className="zone-academic" />
        <text x="505" y="525" className="label-room">HOD</text>
        <line x1="480" y1="460" x2="520" y2="460" className="door-gap"/>
      </g>

      {/* 5. WING B (Admin) */}
      <g id="wing-b">
        <rect x="830" y="250" width="100" height="130" className="zone-admin" />
        <text x="880" y="315" className="label-room">WAITING</text>
        <line x1="860" y1="380" x2="900" y2="380" className="door-gap"/>

        <rect x="940" y="250" width="120" height="130" className="zone-admin" />
        <text x="1000" y="315" className="label-room">CONF. HALL</text>
        <line x1="980" y1="380" x2="1020" y2="380" className="door-gap"/>

        <rect x="1070" y="250" width="100" height="130" className="zone-admin" />
        <text x="1120" y="315" className="label-room">REGISTRAR</text>
        <line x1="1090" y1="380" x2="1140" y2="380" className="door-gap"/>

        <rect x="1180" y="250" width="120" height="130" className="zone-admin" />
        <text x="1240" y="315" className="label-room">DEAN</text>
        <line x1="1200" y1="380" x2="1240" y2="380" className="door-gap"/>

        <rect x="830" y="460" width="120" height="120" className="zone-service" />
        <text x="890" y="520" className="label-room">SERVER</text>
        <line x1="870" y1="460" x2="910" y2="460" className="door-gap"/>
        
        <rect x="960" y="460" width="120" height="120" className="zone-admin" />
        <text x="1020" y="520" className="label-room">ACCOUNTS</text>
        <line x1="1000" y1="460" x2="1040" y2="460" className="door-gap"/>

        <rect x="1090" y="460" width="100" height="120" className="zone-admin" /> 
        <text x="1140" y="520" className="label-room">W-WC</text>
        <line x1="1110" y1="460" x2="1140" y2="460" className="door-gap"/>
      </g>

      {/* 6. WING C (Labs & Library) */}
      <g id="wing-c">
        <rect x="100" y="860" width="150" height="120" className="zone-labs" />
        <text x="175" y="920" className="label-room">LAB 1</text>
        <line x1="150" y1="860" x2="190" y2="860" className="door-gap"/>

        <rect x="260" y="860" width="150" height="120" className="zone-labs" />
        <text x="335" y="920" className="label-room">LAB 2</text>
        <line x1="310" y1="860" x2="350" y2="860" className="door-gap"/>

        <rect x="420" y="860" width="150" height="120" className="zone-labs" />
        <text x="495" y="920" className="label-room">LAB 3</text>
        <line x1="470" y1="860" x2="510" y2="860" className="door-gap"/>
        
        <rect x="580" y="860" width="100" height="120" className="zone-service" />
        <text x="630" y="920" className="label-room">STORE</text>
        
        <rect x="300" y="660" width="120" height="120" className="zone-service" />
        <text x="360" y="720" className="label-room">M-WC</text>
        <line x1="340" y1="780" x2="380" y2="780" className="door-gap"/>

        <rect x="430" y="660" width="100" height="120" className="zone-labs" />
        <text x="480" y="720" className="label-room">WIFI</text>
        <line x1="460" y1="780" x2="500" y2="780" className="door-gap"/>

        <rect x="540" y="660" width="100" height="120" className="zone-admin" />
        <text x="590" y="720" className="label-room">MEETING</text>
        <line x1="570" y1="780" x2="610" y2="780" className="door-gap"/>

        <path d="M 900 650 L 1350 650 L 1350 950 L 900 950 L 900 750 L 740 750 L 740 650 Z" className="zone-labs" />
        <text x="1125" y="800" className="label-room" style={{ fontSize: '30px', opacity: 0.3 }}>LIBRARY</text>
        <line x1="740" y1="680" x2="740" y2="720" className="door-gap"/>
      </g>

      {/* 7. CORES (Stairs/Lifts) */}
      <g id="cores">
        <rect x="660" y="250" width="80" height="80" className="core" />
        <text x="700" y="290" className="label-room" style={{ fill: '#fff', fontSize: '10px' }}>STAIRS</text>
        <rect x="680" y="330" width="40" height="20" className="walkable"/>

        <rect x="740" y="580" width="80" height="70" className="core" />
        <text x="780" y="615" className="label-room" style={{ fill: '#fff', fontSize: '10px' }}>LIFT</text>
        
        <circle cx="700" cy="500" r="20" className="pillar" />
      </g>

      {/* 8. GRAPH NODES (Hidden by default, useful for debug) */}
      <g id="pdr-graph">
        <g id="atrium-nodes">
           <circle cx="700" cy="500" r="3" className="node-hub" />
           <circle cx="700" cy="450" r="3" className="node-path" />
           <circle cx="700" cy="550" r="3" className="node-path" />
           <circle cx="650" cy="500" r="3" className="node-path" />
           <circle cx="750" cy="500" r="3" className="node-path" />
           <circle cx="650" cy="450" r="3" className="node-path" />
           <circle cx="750" cy="450" r="3" className="node-path" />
           <circle cx="650" cy="550" r="3" className="node-path" />
           <circle cx="750" cy="550" r="3" className="node-path" />
           <circle cx="600" cy="420" r="4" className="node-hub" />
           <circle cx="800" cy="420" r="4" className="node-hub" />
           <circle cx="700" cy="650" r="4" className="node-hub" />
        </g>

        <g id="chain-a">
           <circle cx="500" cy="420" r="3" className="node-path" />
           <circle cx="400" cy="420" r="3" className="node-path" />
           <circle cx="300" cy="420" r="3" className="node-path" />
           <circle cx="200" cy="420" r="3" className="node-path" />
           <circle cx="120" cy="420" r="4" className="node-hub" />
        </g>

        <g id="chain-b">
           <circle cx="900" cy="420" r="3" className="node-path" />
           <circle cx="1000" cy="420" r="3" className="node-path" />
           <circle cx="1100" cy="420" r="3" className="node-path" />
           <circle cx="1200" cy="420" r="3" className="node-path" />
           <circle cx="1280" cy="420" r="4" className="node-hub" />
        </g>

        <g id="chain-c">
           <circle cx="700" cy="820" r="4" className="node-hub" />
           <circle cx="600" cy="820" r="3" className="node-path" />
           <circle cx="500" cy="820" r="3" className="node-path" />
           <circle cx="400" cy="820" r="3" className="node-path" />
           <circle cx="300" cy="820" r="3" className="node-path" />
           <circle cx="200" cy="820" r="3" className="node-path" />
           <circle cx="120" cy="820" r="4" className="node-hub" />
        </g>
        
        {/* Destination Markers (Static reference) */}
        <circle cx="710" cy="700" r="3" fill="red" />
        <circle cx="680" cy="350" r="3" fill="red" />
        <circle cx="760" cy="700" r="3" fill="red" />
      </g>

      {/* 9. DYNAMIC CHILDREN INJECTION */}
      {/* This is where your React App will render pins/users/paths */}
      {children}

    </svg>
  );
};

export default CampusMap;