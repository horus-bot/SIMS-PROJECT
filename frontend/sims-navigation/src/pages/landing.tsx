import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom"; // Import for navigation
import { gsap } from "gsap";
import Header from "../components/Header";
import Guidance from "../components/OnboardingAnimation";
import PWAInstallPrompt from "../components/PWAInstallPrompt";
import QRScanner from "../components/QRScanner";
import Avatar from "../components/avatar";
import "./landing.css";

export default function Landing() {
  const navigate = useNavigate(); // Initialize the hook
  const [isScannerOpen, setIsScannerOpen] = useState(false); // State to handle QR scanner visibility
  const [scannedResult, setScannedResult] = useState<string | null>(null); // State to store scanned QR result
  const avatarRef = useRef<HTMLDivElement>(null);
  const messageRef = useRef<HTMLDivElement>(null);
  const guidanceRef = useRef<HTMLDivElement>(null);
  const guideTextRef = useRef<HTMLDivElement>(null);

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

  // GSAP Story Animation with Typing Effect
  useEffect(() => {
    const tl = gsap.timeline();

    // Initial state - hide everything
    tl.set(guidanceRef.current, { opacity: 0, scale: 0.8 });
    tl.set(guideTextRef.current, { opacity: 0, y: 20 });
    tl.set(avatarRef.current, { opacity: 0, scale: 0.8 });
    tl.set(messageRef.current, { opacity: 0 });

    // SCENE 1: Avatar Welcome with Typing Effect
    // Avatar enters and stays
    tl.to(avatarRef.current, {
      opacity: 1,
      scale: 1,
      duration: 0.8,
      ease: "back.out(1.7)"
    });

    // Typing effect for the message
    const fullText = "Hi! Welcome to SIMS Navigation";
    const textElement = messageRef.current?.querySelector('.welcome-text-content');
    if (textElement) {
      textElement.textContent = "";
      tl.to(messageRef.current, { opacity: 1, duration: 0.3 }, "-=0.3");

      // Type each character
      for (let i = 0; i < fullText.length; i++) {
        tl.call(() => {
          if (textElement) {
            textElement.textContent = fullText.substring(0, i + 1);
          }
        }, [], `+=0.08`); // 0.08s per character
      }
    }

    // Avatar stays for 3 seconds total (including typing time)
    tl.to({}, { duration: 2.5 }); // Additional time to make total 3 seconds

    // Avatar and message disappear
    tl.to(messageRef.current, {
      opacity: 0,
      y: -20,
      duration: 0.5,
      ease: "power2.in"
    });

    tl.to(avatarRef.current, {
      opacity: 0,
      scale: 0.8,
      duration: 0.5,
      ease: "power2.in"
    }, "-=0.3");

    // SCENE 2: Onboarding Animation
    // Show onboarding animation in the same centered position
    tl.to(guidanceRef.current, {
      opacity: 1,
      scale: 1,
      duration: 0.8,
      ease: "power2.out"
    });

    // Show guide text
    tl.to(guideTextRef.current, {
      opacity: 1,
      y: 0,
      duration: 0.5,
      ease: "power2.out"
    }, "-=0.3");

    return () => {
      tl.kill();
    };
  }, []);

  return (
    <>

      <Header />

      {/* Centered Content Area */}
      <div className="centered-content">
        {/* Avatar Welcome */}
        <div className="avatar-welcome" ref={avatarRef}>
          <Avatar size={220} alt="SIMS Navigation Mascot" />
          <div className="welcome-message" ref={messageRef}>
            <div className="welcome-text-content">
              Hi! Welcome to<br />
              <span className="sims-text">SIMS Navigation</span>
            </div>
            <div className="message-tail"></div>
          </div>
        </div>

        {/* Guidance Animation - positioned in same place */}
        <div className="guidance-wrapper" ref={guidanceRef}>
          <Guidance />
          <div className="guide-text" ref={guideTextRef}>
            test text
          </div>
        </div>
      </div>

      {/* Button Container */}
      <div className="container">
        <button className="button" onClick={toggleQrScanner}>
          {isScannerOpen ? "Close Scanner" : "Scan QR Code"}
        </button>

        <button className="button" onClick={handleNavigate}>
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
        <div className="result-container">
          <h3>QR Code Scanned!</h3>
          <p><strong>Result:</strong> {scannedResult}</p>
          <button
            className="button"
            style={{ backgroundColor: '#6c757d' }}
            onClick={() => setScannedResult(null)}
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