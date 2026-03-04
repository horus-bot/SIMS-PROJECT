import React from 'react';

interface MapHeaderProps {
  buildingName: string;
  floorName: string;
  onBack: () => void;
}

const MapHeader: React.FC<MapHeaderProps> = ({ buildingName, floorName, onBack }) => {
  return (
    <>
      {/* Header with Building and Floor Info */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '80px',
        right: '20px',
        height: '44px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(8px)',
        borderRadius: '22px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        border: '1px solid rgba(255,255,255,0.5)',
        zIndex: 100,
      }}>
        <div style={{
          fontSize: '16px',
          fontWeight: 'bold',
          color: '#374151',
          textAlign: 'center',
        }}>
          {buildingName} - {floorName}
        </div>
      </div>

      {/* Back Button / Exit */}
      <button 
        onClick={onBack}
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
    </>
  );
};

export default MapHeader;
