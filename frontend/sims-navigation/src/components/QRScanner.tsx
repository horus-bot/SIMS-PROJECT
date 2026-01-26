import { useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';

interface QRScannerProps {
  onScan: (result: string) => void;
  onError?: (error: string) => void;
  onClose: () => void;
}

const QRScanner = ({ onScan, onError, onClose }: QRScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    // Check if camera is available
    QrScanner.hasCamera().then(setHasCamera);

    return () => {
      // Cleanup scanner on unmount
      if (scannerRef.current) {
        scannerRef.current.stop();
        scannerRef.current.destroy();
      }
    };
  }, []);

  const startScanning = async () => {
    if (!videoRef.current || !hasCamera) return;

    try {
      setIsScanning(true);

      scannerRef.current = new QrScanner(
        videoRef.current,
        (result) => {
          // Stop scanning when QR code is found
          if (scannerRef.current) {
            scannerRef.current.stop();
          }
          setIsScanning(false);
          onScan(result.data);
        },
        {
          onDecodeError: (err) => {
            // Ignore decode errors, they're normal during scanning
            console.debug('QR decode error:', err);
          },
          highlightScanRegion: true,
          highlightCodeOutline: true,
        }
      );

      await scannerRef.current.start();
    } catch (error) {
      console.error('Error starting QR scanner:', error);
      setIsScanning(false);
      if (onError) {
        onError(error instanceof Error ? error.message : 'Failed to start camera');
      }
    }
  };

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.stop();
    }
    setIsScanning(false);
  };

  useEffect(() => {
    if (hasCamera === true) {
      startScanning();
    }

    return () => {
      stopScanning();
    };
  }, [hasCamera]);

  if (hasCamera === null) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          textAlign: 'center',
        }}>
          <p>Checking camera access...</p>
        </div>
      </div>
    );
  }

  if (hasCamera === false) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          textAlign: 'center',
          maxWidth: '300px',
        }}>
          <h3>No Camera Found</h3>
          <p>Your device doesn't have a camera or camera access is denied.</p>
          <button
            onClick={onClose}
            style={{
              marginTop: '10px',
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.9)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '400px',
        marginBottom: '20px',
      }}>
        <video
          ref={videoRef}
          style={{
            width: '100%',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
        />
        {isScanning && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '200px',
            height: '200px',
            border: '2px solid #00ff00',
            borderRadius: '8px',
            pointerEvents: 'none',
          }} />
        )}
      </div>

      <div style={{
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
      }}>
        <button
          onClick={onClose}
          style={{
            padding: '10px 20px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >
          Cancel
        </button>
        {!isScanning && (
          <button
            onClick={startScanning}
            style={{
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            Start Scanning
          </button>
        )}
      </div>

      <p style={{
        color: 'white',
        textAlign: 'center',
        marginTop: '10px',
        fontSize: '14px',
      }}>
        {isScanning ? 'Scanning for QR code...' : 'Position QR code within the frame'}
      </p>
    </div>
  );
};

export default QRScanner;