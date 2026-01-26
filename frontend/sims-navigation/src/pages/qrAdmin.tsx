import { useState, useMemo } from "react";
import QRCode from "qrcode";
import floorData from "../data/floor_1.json";

type Room = {
  id: string;
  name: string;
};

const APP_BASE_URL = import.meta.env.VITE_APP_BASE_URL;

const QRGenerator = () => {
  const [origin, setOrigin] = useState<string>("");
  const [destination, setDestination] = useState<string>("");
  const [journeyType, setJourneyType] =
    useState<"origin" | "destination" | "journey">("origin");

  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [finalUrl, setFinalUrl] = useState<string>("");

  // ---- ROOMS ----
  const rooms: Room[] = useMemo(() => {
    if (!floorData?.destinations) return [];
    return Object.entries(floorData.destinations).map(([id, data]: any) => ({
      id,
      name: data.name || data.label || id,
    }));
  }, []);

  // ---- URL BUILDER ----
  const buildUrl = () => {
    const params = new URLSearchParams();

    if (journeyType === "origin" && origin) {
      params.set("origin", origin);
    }

    if (journeyType === "destination" && destination) {
      params.set("dest", destination);
    }

    if (journeyType === "journey") {
      if (origin) params.set("origin", origin);
      if (destination) params.set("dest", destination);
    }

    return `${APP_BASE_URL}/navigation?${params.toString()}`;
  };

  // ---- GENERATE QR ----
  const generateQR = async () => {
    const url = buildUrl();
    if (!url.includes("?")) return;

    const qr = await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: {
        dark: "#1f3c88",
        light: "#ffffff",
      },
    });

    setFinalUrl(url);
    setQrDataUrl(qr);
  };

  return (
    <div style={{ padding: "24px", maxWidth: "520px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "22px", fontWeight: 700 }}>
        QR Code Generator
      </h1>
      <p style={{ color: "#6b7280", marginBottom: "24px" }}>
        Generate QR codes for indoor navigation
      </p>

      {/* JOURNEY TYPE */}
      <div style={{ marginBottom: "16px" }}>
        <label style={{ fontWeight: 600 }}>Journey Type</label>
        <select
          value={journeyType}
          onChange={(e) => setJourneyType(e.target.value as any)}
          style={{ width: "100%", padding: "10px", marginTop: "6px" }}
        >
          <option value="origin">Set Origin Only</option>
          <option value="destination">Set Destination Only</option>
          <option value="journey">Set Origin + Destination</option>
        </select>
      </div>

      {/* ORIGIN */}
      <div style={{ marginBottom: "16px" }}>
        <label style={{ fontWeight: 600 }}>Origin</label>
        <select
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          disabled={journeyType === "destination"}
          style={{ width: "100%", padding: "10px", marginTop: "6px" }}
        >
          <option value="">Select origin</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      {/* DESTINATION */}
      <div style={{ marginBottom: "16px" }}>
        <label style={{ fontWeight: 600 }}>Destination</label>
        <select
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          disabled={journeyType === "origin"}
          style={{ width: "100%", padding: "10px", marginTop: "6px" }}
        >
          <option value="">Select destination</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      {/* GENERATE BUTTON */}
      <button
        onClick={generateQR}
        style={{
          width: "100%",
          padding: "14px",
          fontWeight: 700,
          background: "#1f3c88",
          color: "#fff",
          border: "none",
          borderRadius: "12px",
          cursor: "pointer",
        }}
      >
        Generate QR
      </button>

      {/* RESULT */}
      {qrDataUrl && (
        <div style={{ marginTop: "32px", textAlign: "center" }}>
          <img src={qrDataUrl} alt="QR Code" />
          <p
            style={{
              marginTop: "12px",
              fontSize: "13px",
              wordBreak: "break-all",
              color: "#374151",
            }}
          >
            {finalUrl}
          </p>

          <a
            href={qrDataUrl}
            download="navigation-qr.png"
            style={{
              display: "inline-block",
              marginTop: "12px",
              color: "#2563eb",
              fontWeight: 600,
            }}
          >
            Download PNG
          </a>
        </div>
      )}
    </div>
  );
};

export default QRGenerator;
