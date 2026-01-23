import { useState } from "react";
import { useNavigate } from "react-router-dom"; // Import for navigation
import Header from "../components/Header";
import Guidance from "../components/OnboardingAnimation";
import PWAInstallPrompt from "../components/PWAInstallPrompt";
import QRScanner from "../components/QRScanner";

export default function Landing() {
  const navigate = useNavigate(); // Initialize the hook
  const [isScannerOpen, setIsScannerOpen] = useState(false); // State to handle QR scanner visibility
  const [scannedResult, setScannedResult] = useState<string | null>(null); // State to store scanned QR result

  // Function to handle page navigation
  const handleNavigate = () => {
    navigate("/navigation"); // Replace with your actual route path
  };

  // Function to toggle QR scanner display
  const toggleQrScanner = () => {
    setIsScannerOpen(!isScannerOpen);
    setScannedResult(null); // Reset result when opening/closing
  };

  // Function to handle successful QR scan
  const handleQrScan = (result: string) => {
    setScannedResult(result);
    setIsScannerOpen(false); // Close scanner after successful scan

    // Here you can add logic to handle the scanned result
    // For example, parse the QR data and navigate to appropriate route
    console.log('QR Code scanned:', result);

    // If the QR contains navigation data, you could parse it here
    // For now, we'll just display it
  };

  // Function to handle QR scan errors
  const handleQrError = (error: string) => {
    console.error('QR Scan error:', error);
    // You could show an error message to the user here
  };

  return (
    <>
      <Header />
      <Guidance />

      {/* Button Container */}
      <div style={styles.container}>
        <button onClick={toggleQrScanner} style={styles.button}>
          {isScannerOpen ? "Close Scanner" : "Scan QR Code"}
        </button>

        <button onClick={handleNavigate} style={styles.button}>
          Go to Navigation
        </button>
      </div>

      {/* QR Scanner */}
      {isScannerOpen && (
        <QRScanner
          onScan={handleQrScan}
          onError={handleQrError}
          onClose={toggleQrScanner}
        />
      )}

      {/* Scanned Result Display */}
      {scannedResult && (
        <div style={styles.resultContainer}>
          <h3>QR Code Scanned!</h3>
          <p><strong>Result:</strong> {scannedResult}</p>
          <button
            onClick={() => setScannedResult(null)}
            style={{...styles.button, backgroundColor: '#6c757d'}}
          >
            Clear Result
          </button>
        </div>
      )}

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
    </>
  );
}

// Basic styling object for demonstration
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    justifyContent: "center",
    gap: "20px",
    marginTop: "20px",
    padding: "20px",
  },
  button: {
    padding: "10px 20px",
    fontSize: "16px",
    cursor: "pointer",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "5px",
  },
  resultContainer: {
    textAlign: "center",
    marginTop: "20px",
    padding: "20px",
    border: "1px solid #28a745",
    borderRadius: "10px",
    backgroundColor: "#f8fff9",
    maxWidth: "400px",
    margin: "20px auto",
  }
};