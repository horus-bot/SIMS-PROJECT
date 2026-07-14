import React, { useState, useEffect, useRef } from 'react';

// --- STIFF KALMAN FILTER ---
class KalmanFilter {
  private r: number;
  private q: number;
  private p: number;
  private x: number;

  constructor(r = 0.02, q = 10.0) {
    this.r = r;
    this.q = q;
    this.p = 10;
    this.x = NaN;
  }

  filter(measurement: number) {
    if (isNaN(this.x)) {
      this.x = measurement;
    } else {
      this.p = this.p + this.r;
      const k = this.p / (this.p + this.q);
      this.x = this.x + k * (measurement - this.x);
      this.p = (1 - k) * this.p;
    }
    return this.x;
  }

  reset() {
    this.x = NaN;
    this.p = 10;
  }
}

const TX_POWER = -39; 
const ENV_FACTOR = 2.5; 

const calculateDistance = (rssi: number) => {
  if (rssi === 0) return -1.0; 
  const ratio = (TX_POWER - rssi) / (10 * ENV_FACTOR);
  return Math.pow(10, ratio);
};

// --- NEW SMART MATH: Absolute Truth Proportional Weighting ---
// We treat the slider (axisLength) as the absolute truth.
// We then calculate the position based on which node is at the 0m mark.
const calculate1DPosition = (distA: number, distB: number, axisLength: number, startNode: 'A' | 'B') => {
  if (axisLength <= 0 || (distA === 0 && distB === 0)) return 0;
  
  // If Start Node is A, our distance from 0m is proportional to distA.
  // If Start Node is B, our distance from 0m is proportional to distB.
  const primaryDist = startNode === 'A' ? distA : distB;
  
  // Ratio of the primary distance to the total perceived distance
  const ratio = primaryDist / (distA + distB);
  
  // Scale the ratio to the absolute truth length of the hallway
  const x = axisLength * ratio;
  
  // Clamp it strictly between 0 and the Hallway Length
  return Math.max(0, Math.min(axisLength, x)); 
};

const BleDualTrackPage: React.FC = () => {
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Scenario Configuration
  const [axisLength, setAxisLength] = useState<number>(4.0); 
  const [startNode, setStartNode] = useState<'A' | 'B'>('A'); // Determines which beacon is at 0m
  const [userPos, setUserPos] = useState<number | null>(null);

  // Beacon A State
  const [deviceA, setDeviceA] = useState<any>(null);
  const [distA, setDistA] = useState<number | null>(null);
  const kalmanA = useRef(new KalmanFilter());
  const refA = useRef<any>(null);

  // Beacon B State
  const [deviceB, setDeviceB] = useState<any>(null);
  const [distB, setDistB] = useState<number | null>(null);
  const kalmanB = useRef(new KalmanFilter());
  const refB = useRef<any>(null);

  useEffect(() => {
    if (!(navigator as any).bluetooth) {
      setIsSupported(false);
    }
  }, []);

  // Update position whenever distances, axis length, or start node changes
  useEffect(() => {
    if (distA !== null && distB !== null) {
      setUserPos(calculate1DPosition(distA, distB, axisLength, startNode));
    }
  }, [distA, distB, axisLength, startNode]);

  const connectBeacon = async (target: 'A' | 'B') => {
    setError(null);
    
    try {
      const bluetoothDevice = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
      });

      if (target === 'A') {
        setDeviceA(bluetoothDevice);
        refA.current = bluetoothDevice;
        kalmanA.current.reset();
      } else {
        setDeviceB(bluetoothDevice);
        refB.current = bluetoothDevice;
        kalmanB.current.reset();
      }

      bluetoothDevice.addEventListener('advertisementreceived', (event: any) => {
        const cleanRssi = target === 'A' 
          ? kalmanA.current.filter(event.rssi) 
          : kalmanB.current.filter(event.rssi);
          
        const d = calculateDistance(cleanRssi);
        
        if (target === 'A') setDistA(d);
        else setDistB(d);
      });

      if (bluetoothDevice.watchAdvertisements) {
        await bluetoothDevice.watchAdvertisements();
      } else {
        setError("Your browser does not support watchAdvertisements().");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || `Failed to connect to Beacon ${target}.`);
    }
  };

  const disconnectAll = () => {
    if (refA.current?.unwatchAdvertisements) refA.current.unwatchAdvertisements();
    if (refB.current?.unwatchAdvertisements) refB.current.unwatchAdvertisements();
    
    setDeviceA(null);
    setDeviceB(null);
    setDistA(null);
    setDistB(null);
    setUserPos(null);
  };

  const dotPercentage = userPos !== null && axisLength > 0 
    ? (userPos / axisLength) * 100
    : 50;

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f8fafc', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      paddingTop: '30px',
      paddingBottom: '50px',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <h1 style={{ color: '#0f172a', marginBottom: '8px', fontSize: '26px', fontWeight: '800' }}>
        1D Hallway Tracker
      </h1>
      <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px', fontWeight: '500' }}>Absolute Truth Engine</p>

      {!isSupported && (
        <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '12px', borderRadius: '8px', maxWidth: '380px', width: '90%' }}>
          <strong>Bluetooth Not Supported!</strong>
        </div>
      )}

      {error && (
        <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '12px', borderRadius: '8px', maxWidth: '380px', width: '90%' }}>
          {error}
        </div>
      )}

      {/* --- SCENARIO CONFIGURATION --- */}
      <div style={{ padding: '24px', backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)', maxWidth: '380px', width: '90%', marginBottom: '20px' }}>
        
        {/* Hallway Length Slider */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Absolute Length</span>
            <span style={{ fontSize: '16px', fontFamily: 'monospace', fontWeight: '800', color: '#2563eb' }}>{axisLength} m</span>
          </div>
          <input 
            type="range" min="1" max="30" step="1" 
            value={axisLength} 
            onChange={(e) => setAxisLength(Number(e.target.value))}
            style={{ width: '100%', cursor: 'pointer', marginBottom: '8px', accentColor: '#2563eb' }}
          />
        </div>

        {/* Start Node Toggle */}
        <div>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Which Beacon is at 0m?</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => setStartNode('A')}
              style={{ flex: 1, padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', border: 'none', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: startNode === 'A' ? '#3b82f6' : '#f1f5f9', color: startNode === 'A' ? 'white' : '#64748b' }}
            >
              Beacon A
            </button>
            <button 
              onClick={() => setStartNode('B')}
              style={{ flex: 1, padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', border: 'none', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: startNode === 'B' ? '#3b82f6' : '#f1f5f9', color: startNode === 'B' ? 'white' : '#64748b' }}
            >
              Beacon B
            </button>
          </div>
        </div>

      </div>

      {/* --- VISUAL TRACKER --- */}
      <div style={{ padding: '30px 20px', backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)', maxWidth: '380px', width: '90%', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', marginBottom: '40px', textAlign: 'center' }}>Live Tracking Projection</h3>
        
        <div style={{ position: 'relative', height: '10px', backgroundColor: '#f1f5f9', borderRadius: '5px', margin: '0 20px 40px 20px' }}>
          
          {/* Start Node Marker (0m) */}
          <div style={{ position: 'absolute', left: '-12px', top: '-7px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '24px', height: '24px', backgroundColor: (startNode === 'A' ? deviceA : deviceB) ? '#10b981' : '#cbd5e1', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px', fontWeight: 'bold' }}>
              {startNode}
            </div>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', marginTop: '6px' }}>0m</span>
          </div>
          
          {/* End Node Marker (Length) */}
          <div style={{ position: 'absolute', right: '-12px', top: '-7px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '24px', height: '24px', backgroundColor: (startNode === 'A' ? deviceB : deviceA) ? '#10b981' : '#cbd5e1', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px', fontWeight: 'bold' }}>
              {startNode === 'A' ? 'B' : 'A'}
            </div>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', marginTop: '6px' }}>{axisLength}m</span>
          </div>

          {/* User Dot */}
          {userPos !== null && (
            <div style={{ 
              position: 'absolute', 
              left: `calc(${dotPercentage}% - 12px)`, 
              top: '-7px', 
              width: '24px', height: '24px', 
              backgroundColor: '#3b82f6', 
              borderRadius: '50%',
              border: '3px solid white',
              boxShadow: '0 4px 8px rgba(37, 99, 235, 0.3)',
              transition: 'left 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              zIndex: 10
            }}></div>
          )}
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em', marginBottom: '4px' }}>Calculated Position</div>
          <div style={{ fontSize: '32px', fontFamily: 'monospace', fontWeight: 900, color: '#2563eb' }}>
            {userPos !== null ? `${userPos.toFixed(2)} m` : '--'}
          </div>
        </div>
      </div>

      {/* --- BEACON CONNECTION CARDS --- */}
      <div style={{ display: 'flex', gap: '12px', maxWidth: '380px', width: '90%', marginBottom: '20px' }}>
        
        {/* Card A */}
        <div style={{ flex: 1, padding: '20px', backgroundColor: 'white', borderRadius: '16px', border: deviceA ? '2px solid #10b981' : '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Beacon A</h4>
          
          {deviceA ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em' }}>Raw Dist</div>
              <div style={{ fontSize: '22px', fontFamily: 'monospace', fontWeight: '800', color: '#10b981' }}>{distA?.toFixed(2)}m</div>
            </div>
          ) : (
            <button 
              onClick={() => connectBeacon('A')}
              disabled={!isSupported}
              style={{ padding: '10px 0', backgroundColor: '#eff6ff', color: '#2563eb', fontSize: '13px', fontWeight: '700', borderRadius: '8px', border: 'none', cursor: 'pointer', width: '100%', transition: 'background-color 0.2s' }}
            >
              Connect A
            </button>
          )}
        </div>

        {/* Card B */}
        <div style={{ flex: 1, padding: '20px', backgroundColor: 'white', borderRadius: '16px', border: deviceB ? '2px solid #10b981' : '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Beacon B</h4>
          
          {deviceB ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em' }}>Raw Dist</div>
              <div style={{ fontSize: '22px', fontFamily: 'monospace', fontWeight: '800', color: '#10b981' }}>{distB?.toFixed(2)}m</div>
            </div>
          ) : (
            <button 
              onClick={() => connectBeacon('B')}
              disabled={!isSupported}
              style={{ padding: '10px 0', backgroundColor: '#eff6ff', color: '#2563eb', fontSize: '13px', fontWeight: '700', borderRadius: '8px', border: 'none', cursor: 'pointer', width: '100%', transition: 'background-color 0.2s' }}
            >
              Connect B
            </button>
          )}
        </div>

      </div>

      {(deviceA || deviceB) && (
        <button 
          onClick={disconnectAll}
          style={{ maxWidth: '380px', width: '90%', padding: '14px', backgroundColor: '#fef2f2', color: '#ef4444', fontSize: '14px', fontWeight: '700', borderRadius: '12px', border: '1px solid #fee2e2', cursor: 'pointer' }}
        >
          Disconnect All
        </button>
      )}
    </div>
  );
};

export default BleDualTrackPage;