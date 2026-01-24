import React, { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

const VoiceToTextMic: React.FC = () => {
  const recognitionRef = useRef<any>(null);

  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);

  const [interimText, setInterimText] = useState("");
  const [finalText, setFinalText] = useState("");

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SR) {
      setSupported(false);
      return;
    }

    setSupported(true);

    const recognition = new SR();
    recognition.lang = "en-IN";
    recognition.interimResults = true;
    recognition.continuous = false; // best for commands
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = event.results[i][0]?.transcript || "";
        if (event.results[i].isFinal) final += piece;
        else interim += piece;
      }

      setInterimText(interim);

      if (final.trim()) {
        setFinalText((prev) => (prev ? prev + " " + final : final));
        console.log("🎤 Final Transcript:", final.trim());
      }
    };

    recognition.onerror = (e: any) => {
      console.log("❌ Speech Error:", e?.error || e);
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognitionRef.current = null;
    };
  }, []);

  const startListening = () => {
    if (!supported || !recognitionRef.current) return;

    setInterimText("");
    setFinalText("");
    setListening(true);

    try {
      recognitionRef.current.start();
    } catch (err) {
      console.log("⚠️ Start error:", err);
      setListening(false);
    }
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;

    try {
      recognitionRef.current.stop();
    } catch (err) {
      console.log("⚠️ Stop error:", err);
    }

    setListening(false);
  };

  return (
    <div
      style={{
        width: "100%",
        padding: "16px",
        borderRadius: 16,
        border: "1px solid rgba(255, 255, 255, 0.4)",
        background: "rgba(255, 255, 255, 0.6)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        color: "#1e293b",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* MIC BUTTON */}
        <button
          onClick={listening ? stopListening : startListening}
          disabled={!supported}
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            border: "none",
            cursor: supported ? "pointer" : "not-allowed",
            background: listening ? "#ef4444" : "#007bff",
            boxShadow: listening
              ? "0 0 0 8px rgba(239, 68, 68, 0.2)"
              : "0 0 0 8px rgba(0, 123, 255, 0.2)",
            display: "grid",
            placeItems: "center",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            transform: listening ? "scale(1.05)" : "scale(1)"
          }}
          title={listening ? "Stop listening" : "Start listening"}
        >
          {/* simple mic icon */}
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M19 11a7 7 0 0 1-14 0"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M12 18v3"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M8 21h8"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* STATUS */}
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 16,
            fontWeight: 600,
            color: listening ? "#ef4444" : "#007bff",
            marginBottom: 2
          }}>
            {listening ? "🎤 Listening..." : "Voice Commands"}
          </div>

          <div style={{
            fontSize: 13,
            color: "#64748b",
            lineHeight: 1.3
          }}>
            {supported
              ? "Tap the mic and speak location names"
              : "Speech Recognition not supported. Use Chrome/Edge."}
          </div>
        </div>
      </div>

      {/* TRANSCRIPT BOX */}
      <div
        style={{
          marginTop: 12,
          padding: 12,
          borderRadius: 12,
          border: "1px solid rgba(255, 255, 255, 0.3)",
          background: "rgba(255, 255, 255, 0.5)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          minHeight: 60,
          boxShadow: "0 2px 4px -1px rgba(0, 0, 0, 0.1)"
        }}
      >
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          color: "#475569",
          marginBottom: 6,
          textTransform: "uppercase",
          letterSpacing: "0.05em"
        }}>
          Transcript:
        </div>

        <div style={{ fontSize: 14, lineHeight: 1.4, color: "#334155" }}>
          {interimText && (
            <span style={{ color: "#94a3b8", fontStyle: "italic" }}>{interimText}</span>
          )}
          {finalText && (
            <span style={{ color: "#0f172a", fontWeight: 600 }}>
              {finalText}
            </span>
          )}
          {!interimText && !finalText && (
            <span style={{ color: "#64748b" }}>
              Say something like: "Go to BW204" or "Navigate to reception"
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceToTextMic;
