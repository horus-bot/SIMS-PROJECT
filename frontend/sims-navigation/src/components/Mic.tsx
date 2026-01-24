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
        maxWidth: 460,
        padding: "16px",
        borderRadius: 16,
        border: "1px solid #222",
        background: "#0b0b0f",
        color: "#fff",
        boxShadow: "0 10px 30px rgba(0,0,0,0.35)"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* MIC BUTTON */}
        <button
          onClick={listening ? stopListening : startListening}
          disabled={!supported}
          style={{
            width: 64,
            height: 64,
            borderRadius: "999px",
            border: "none",
            cursor: supported ? "pointer" : "not-allowed",
            background: listening ? "#ff2d55" : "#1e90ff",
            boxShadow: listening
              ? "0 0 0 10px rgba(255,45,85,0.18)"
              : "0 0 0 10px rgba(30,144,255,0.16)",
            display: "grid",
            placeItems: "center",
            transition: "all 0.2s ease"
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
          <div style={{ fontSize: 16, fontWeight: 800 }}>
            {listening ? "Listening..." : "Voice to Text"}
          </div>

          <div style={{ fontSize: 13, opacity: 0.75, marginTop: 4 }}>
            {supported
              ? "Tap the mic and speak. Transcript will log in console."
              : "Speech Recognition not supported. Use Chrome/Edge."}
          </div>
        </div>
      </div>

      {/* TRANSCRIPT BOX */}
      <div
        style={{
          marginTop: 14,
          padding: 12,
          borderRadius: 14,
          border: "1px solid #1c1c26",
          background: "#050509",
          minHeight: 80
        }}
      >
        <div style={{ fontSize: 12, opacity: 0.65, marginBottom: 6 }}>
          Transcript:
        </div>

        <div style={{ fontSize: 14, lineHeight: 1.4 }}>
          {interimText && (
            <span style={{ color: "#9aa4b2" }}>{interimText}</span>
          )}
          {finalText && (
            <span style={{ color: "#ffffff", fontWeight: 700 }}>
              {finalText}
            </span>
          )}
          {!interimText && !finalText && (
            <span style={{ color: "#666" }}>
              Say something like: “Go to BW204”
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceToTextMic;
