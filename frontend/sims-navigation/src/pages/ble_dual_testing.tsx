import React, { useState, useEffect, useRef } from 'react';

// --- STIFF KALMAN FILTER (Tuned for anti-jump/waterbag resistance) ---
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

// --- FIXED CONSTANTS ---
const TX_POWER = -39; 
const ENV_FACTOR = 2.5; 

const calculateDistance = (rssi: number) => {
  if (rssi === 0) return -1.0; 
  const ratio = (TX_POWER - rssi) / (10 * ENV_FACTOR);
  return Math.pow(10, ratio);
};

// --- 1D TRILATERATION MATH ---
// Calculates position (x) along a line between two beacons
// Beacon A is at x=0, Beacon B is at x=axisLength
const calculate1DPosition = (distA: number, distB: number, axisLength: number) => {
  if (axisLength <= 0) return 0;
  // Formula: x = (rA^2 - rB^2 + D^2) / (2D)
  const x = (Math.pow(distA, 2) - Math.pow(distB, 2) + Math.pow(axisLength, 2)) / (2 * axisLength);
  
  // Clamp the result so the dot doesn't fly infinitely off the screen if the signal bounces
  return Math.max(-2, Math.min(axisLength + 2, x)); 
};

const BleDualTrackPage: React.FC = () => {
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Axis configuration
  const [axisLength, setAxisLength] = useState<number>(10.0); // Distance between Beacons
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

  // Update position whenever either distance updates or axis changes
  useEffect(() => {
    if (distA !== null && distB !== null) {
      setUserPos(calculate1DPosition(distA, distB, axisLength));
    }
  }, [distA, distB, axisLength]);

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

  // Calculate percentage for the visual dot
  const dotPercentage = userPos !== null && axisLength > 0 
    ? Math.max(0, Math.min(100, (userPos / axisLength) * 100))
    : 50;

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f3f4f6', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      paddingTop: '30px',
      paddingBottom: '50px',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <h1 style={{ color: '#1f2937', marginBottom: '10px', fontSize: '24px', fontWeight: 'bold' }}>
        1D Hallway Tracker
      </h1>
      <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '20px' }}>Dual-Beacon Trilateration</p>

      {!isSupported && (
        <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '12px', borderRadius: '8px', maxWidth: '380px', width: '90%' }}>
          <strong>Bluetooth Not Supported!</strong> Requires Chrome/Edge on Desktop or Android.
        </div>
      )}

      {error && (
        <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '12px', borderRadius: '8px', maxWidth: '380px', width: '90%' }}>
          {error}
        </div>
      )}

      {/* --- SCENARIO CONFIGURATION --- */}
      <div style={{ padding: '20px', backgroundColor: 'white', border: '1px solid #dbeafe', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', maxWidth: '380px', width: '90%', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#374151', textTransform: 'uppercase' }}>Hallway Length (Distance between Beacons)</span>
          <span style={{ fontSize: '14px', fontFamily: 'monospace', fontWeight: 'bold', color: '#1d4ed8' }}>{axisLength} m</span>
        </div>
        <input 
          type="range" min="2" max="30" step="1" 
          value={axisLength} 
          onChange={(e) => setAxisLength(Number(e.target.value))}
          style={{ width: '100%', cursor: 'pointer', marginBottom: '8px' }}
        />
        <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>Physically place Beacon A and Beacon B this far apart in a straight line.</p>
      </div>

      {/* --- VISUAL TRACKER --- */}
      <div style={{ padding: '20px', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', maxWidth: '380px', width: '90%', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#1f2937', marginBottom: '24px', textAlign: 'center' }}>Live Tracking Projection</h3>
        
        <div style={{ position: 'relative', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', margin: '0 20px 30px 20px' }}>
          {/* Beacon A Marker */}
          <div style={{ position: 'absolute', left: '-15px', top: '-12px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: deviceA ? '#10b981' : '#9ca3af', borderRadius: '50%' }}></div>
            <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#6b7280', marginTop: '4px' }}>0m</span>
          </div>
          
          {/* Beacon B Marker */}
          <div style={{ position: 'absolute', right: '-15px', top: '-12px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: deviceB ? '#10b981' : '#9ca3af', borderRadius: '50%' }}></div>
            <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#6b7280', marginTop: '4px' }}>{axisLength}m</span>
          </div>

          {/* User Dot */}
          {userPos !== null && (
            <div style={{ 
              position: 'absolute', 
              left: `calc(${dotPercentage}% - 8px)`, 
              top: '-4px', 
              width: '16px', height: '16px', 
              backgroundColor: '#2563eb', 
              borderRadius: '50%',
              border: '2px solid white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              transition: 'left 0.3s ease-out'
            }}></div>
          )}
        </div>

        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', fontWeight: 'bold' }}>Calculated Position: </span>
          <span style={{ fontSize: '20px', fontFamily: 'monospace', fontWeight: 900, color: '#2563eb' }}>
            {userPos !== null ? `${userPos.toFixed(2)} m` : '--'}
          </span>
        </div>
      </div>

      {/* --- BEACON CONNECTION CARDS --- */}
      <div style={{ display: 'flex', gap: '12px', maxWidth: '380px', width: '90%', marginBottom: '20px' }}>
        
        {/* Card A */}
        <div style={{ flex: 1, padding: '16px', backgroundColor: 'white', borderRadius: '12px', border: deviceA ? '2px solid #10b981' : '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#1f2937' }}>Beacon A</h4>
          
          {deviceA ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase' }}>Distance</div>
              <div style={{ fontSize: '20px', fontFamily: 'monospace', fontWeight: 'bold', color: '#10b981' }}>{distA?.toFixed(2)}m</div>
            </div>
          ) : (
            <button 
              onClick={() => connectBeacon('A')}
              disabled={!isSupported}
              style={{ padding: '8px 12px', backgroundColor: '#3b82f6', color: 'white', fontSize: '12px', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer', width: '100%' }}
            >
              Connect A
            </button>
          )}
        </div>

        {/* Card B */}
        <div style={{ flex: 1, padding: '16px', backgroundColor: 'white', borderRadius: '12px', border: deviceB ? '2px solid #10b981' : '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#1f2937' }}>Beacon B</h4>
          
          {deviceB ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase' }}>Distance</div>
              <div style={{ fontSize: '20px', fontFamily: 'monospace', fontWeight: 'bold', color: '#10b981' }}>{distB?.toFixed(2)}m</div>
            </div>
          ) : (
            <button 
              onClick={() => connectBeacon('B')}
              disabled={!isSupported}
              style={{ padding: '8px 12px', backgroundColor: '#3b82f6', color: 'white', fontSize: '12px', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer', width: '100%' }}
            >
              Connect B
            </button>
          )}
        </div>

      </div>

      {(deviceA || deviceB) && (
        <button 
          onClick={disconnectAll}
          style={{ maxWidth: '380px', width: '90%', padding: '12px', backgroundColor: '#ef4444', color: 'white', fontWeight: 'bold', borderRadius: '12px', border: 'none', cursor: 'pointer' }}
        >
          Disconnect All
        </button>
      )}
      
      <div style={{ marginTop: '30px', maxWidth: '380px', width: '90%', color: '#4b5563', fontSize: '12px', lineHeight: '1.5' }}>
        <p><strong>How to test this:</strong></p>
        <ol style={{ paddingLeft: '16px', marginTop: '8px', margin: 0 }}>
          <li>Set the slider to the physical distance between your two ESP32s (e.g., 5 meters).</li>
          <li>Click Connect A and pair with `SIMS_BEACON_A`.</li>
          <li>Click Connect B and pair with `SIMS_BEACON_B`.</li>
          <li>Walk in a straight line between them. The blue dot will track your physical location along that line!</li>
        </ol>
      </div>
    </div>
  );
};

export default BleDualTrackPage;