import React from 'react';

interface MapHeaderProps {
  buildingName: string;
  floorName: string;
  onBack: () => void;
}

const MapHeader: React.FC<MapHeaderProps> = ({ buildingName, floorName, onBack }) => {
  return (
    <div style={{
      position: 'absolute',
      top: '16px',
      left: '16px',
      right: '16px',
      height: '48px',
      display: 'flex',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      borderRadius: '24px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
      zIndex: 100,
      padding: '0 12px',
    }}>
      {/* Back Button / Exit */}
      <button 
        onClick={onBack}
        style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: 'transparent',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0,
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
      </button>

      <div style={{
        flex: 1,
        fontSize: '15px',
        fontWeight: '600',
        color: '#1F2937',
        textAlign: 'center',
        paddingRight: '40px',
      }}>
        {buildingName} • {floorName}
      </div>
    </div>
  );
};

export default MapHeader;
