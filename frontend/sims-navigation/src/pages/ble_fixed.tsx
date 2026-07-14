import React, { useState, useEffect, useRef } from 'react';

// --- KALMAN FILTER IMPLEMENTATION ---
class KalmanFilter {
  private r: number; // Process noise (How fast we expect the user to actually move)
  private q: number; // Measurement noise (How noisy the raw BLE signal is)
  private p: number; // Estimated error covariance
  private x: number; // Estimated signal

  constructor(r = 0.05, q = 5.0) {
    this.r = r;
    this.q = q;
    this.p = 10; // Initial arbitrary error
    this.x = NaN;
  }

  filter(measurement: number) {
    if (isNaN(this.x)) {
      this.x = measurement;
    } else {
      // Prediction update
      this.p = this.p + this.r;
      // Measurement update
      const k = this.p / (this.p + this.q); // Kalman Gain
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

// Distance calculation formula using RSSI
// Hardcoded based on physical testing
const TX_POWER = -39; 
const ENV_FACTOR = 2.5; 

const calculateDistance = (rssi: number) => {
  if (rssi === 0) return -1.0; 
  const ratio = (TX_POWER - rssi) / (10 * ENV_FACTOR);
  return Math.pow(10, ratio);
};

const BleTestingPageFixed: React.FC = () => {
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [device, setDevice] = useState<any>(null);
  
  const [rssi, setRssi] = useState<number | null>(null);
  const [smoothedRssi, setSmoothedRssi] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const deviceRef = useRef<any>(null);
  
  // Persist the Kalman filter instance across React renders
  const kalmanRef = useRef(new KalmanFilter(0.02, 4.0)); 

  useEffect(() => {
    // Check if Web Bluetooth is available in this browser
    if (!(navigator as any).bluetooth) {
      setIsSupported(false);
    }
  }, []);

  const startScanning = async () => {
    setError(null);
    kalmanRef.current.reset(); // Reset filter history for a clean start
    
    try {
      const bluetoothDevice = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
      });

      setDevice(bluetoothDevice);
      deviceRef.current = bluetoothDevice;

      bluetoothDevice.addEventListener('advertisementreceived', (event: any) => {
        const currentRssi = event.rssi;
        setRssi(currentRssi); // Raw signal
        
        // Pass the raw signal through the Kalman Filter
        const cleanRssi = kalmanRef.current.filter(currentRssi);
        setSmoothedRssi(cleanRssi);
        
        // Calculate instantly with our fixed constants
        setDistance(calculateDistance(cleanRssi));
      });

      if (bluetoothDevice.watchAdvertisements) {
        await bluetoothDevice.watchAdvertisements();
        setIsScanning(true);
      } else {
        setError("Your browser does not support watchAdvertisements(). Try Chrome on Android or Desktop.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to scan for devices.");
    }
  };

  const stopScanning = () => {
    if (deviceRef.current && deviceRef.current.unwatchAdvertisements) {
      deviceRef.current.unwatchAdvertisements();
    }
    setIsScanning(false);
    setDevice(null);
    setRssi(null);
    setSmoothedRssi(null);
    setDistance(null);
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f3f4f6', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      paddingTop: '50px',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <h1 style={{ color: '#1f2937', marginBottom: '20px', fontSize: '24px', fontWeight: 'bold' }}>
        Hardware Diagnostics
      </h1>

      <div style={{ padding: '20px', backgroundColor: 'white', border: '1px solid #dbeafe', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', maxWidth: '380px', width: '90%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m7 7 10 10-5 5V2l5 5L7 17"/>
            </svg>
          </div>
          <div>
            <h3 style={{ fontWeight: 'bold', color: '#111827', margin: 0 }}>ESP32 BLE Scanner</h3>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>Kalman Filter Enabled</p>
          </div>
        </div>

        {!isSupported && (
          <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '12px', borderRadius: '8px', border: '1px solid #fee2e2' }}>
            <strong>Bluetooth Not Supported!</strong> Web Bluetooth requires Chrome/Edge on Desktop or Android.
          </div>
        )}

        {error && (
          <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '12px', borderRadius: '8px', border: '1px solid #fee2e2' }}>
            {error}
          </div>
        )}

        {device && (
          <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '12px', border: '1px solid #f3f4f6' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '12px' }}>
              Connected: <span style={{ color: '#2563eb' }}>{device.name || "Unknown ESP32"}</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.05em' }}>Raw Signal (Noisy)</span>
              <span style={{ fontSize: '14px', fontFamily: 'monospace', color: '#6b7280' }}>{rssi !== null ? `${rssi} dBm` : '--'}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #e5e7eb' }}>
              <span style={{ fontSize: '12px', color: '#1f2937', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.05em' }}>Kalman Signal</span>
              <span style={{ fontSize: '18px', fontFamily: 'monospace', fontWeight: 'bold', color: '#10b981' }}>{smoothedRssi !== null ? `${smoothedRssi.toFixed(1)} dBm` : '--'}</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <span style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.05em' }}>Est. Distance</span>
              <span style={{ fontSize: '24px', fontFamily: 'monospace', fontWeight: 900, color: '#2563eb' }}>
                {distance !== null ? `${distance.toFixed(2)} m` : '--'}
              </span>
            </div>
          </div>
        )}

        {!isScanning ? (
          <button 
            onClick={startScanning}
            disabled={!isSupported}
            style={{ width: '100%', padding: '12px', backgroundColor: isSupported ? '#2563eb' : '#9ca3af', color: 'white', fontWeight: 'bold', borderRadius: '12px', border: 'none', cursor: isSupported ? 'pointer' : 'not-allowed', transition: 'background-color 0.2s' }}
          >
            Scan for ESP32
          </button>
        ) : (
          <button 
            onClick={stopScanning}
            style={{ width: '100%', padding: '12px', backgroundColor: '#f3f4f6', color: '#1f2937', fontWeight: 'bold', borderRadius: '12px', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s' }}
          >
            Stop Scanning
          </button>
        )}
      </div>

      <div style={{ marginTop: '30px', maxWidth: '380px', color: '#4b5563', fontSize: '14px', lineHeight: '1.5' }}>
        <p><strong>Testing Instructions:</strong></p>
        <ul style={{ paddingLeft: '20px', marginTop: '10px' }}>
          <li>Ensure your ESP32 is powered on and flashing a standard BLE Advertising sketch.</li>
          <li>Open this page on <strong>localhost</strong> or via <strong>HTTPS</strong>.</li>
          <li>Click "Scan" and accept the pairing prompt to read the live RSSI distance.</li>
        </ul>
      </div>
    </div>
  );
};

export default BleTestingPageFixed;