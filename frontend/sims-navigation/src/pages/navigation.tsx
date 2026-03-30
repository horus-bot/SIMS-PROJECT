import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, MapPin, Navigation, ArrowRight, X, Map } from "lucide-react";
import VoiceToTextMic from "../components/Mic";
import PinPickupMap from "../components/PinPickupMap";

import "./navigation.css";

type Room = {
  id: string;
  name: string;
  floorId: string;
  floorName: string;
};

type IntentResponse = {
  intent: "NAVIGATE" | "UNKNOWN";
  origin_place: string | null;
  destination_place: string | null;
};

const dataModules = import.meta.glob('../data/*.json', { eager: true });
const ALL_FLOOR_DATA = Object.entries(dataModules).map(([path, mod]) => {
  const filename = path.split('/').pop()?.replace('.json', '');
  let id = filename || 'unknown';
  if (id === 'test_1') id = 'test';
  else if (id === 'graphData_firstfloor') id = 'firstfloor';
  else if (id === 'graphData4th') id = 'fourthfloor';
  return { id, data: (mod as any).default || mod };
});

const NavigationPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // --- STATE ---
  const [origin, setOrigin] = useState<Room | null>(null);
  const [destination, setDestination] = useState<Room | null>(null);
  const [activePicker, setActivePicker] =
    useState<"origin" | "destination" | null>(null);
  const [search, setSearch] = useState("");
  const [pinPickerFloor, setPinPickerFloor] = useState<string | null>(null);

  // --- DATA (✅ dynamically load from all floor data) ---
  const rooms: Room[] = useMemo(() => {
    const allRooms: Room[] = [];
    
    ALL_FLOOR_DATA.forEach(floor => {
      const destMap = floor.data?.destinations;
      if (destMap) {
        Object.entries(destMap).forEach(([placeName, info]: any) => {
          if (!allRooms.find(r => r.name === placeName)) {
            allRooms.push({
              id: info.node,
              name: placeName,
              floorId: floor.id,
              floorName: floor.data?.meta?.floorName || "Main Block"
            });
          }
        });
      }
    });

    return allRooms.sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const filteredRooms = useMemo(() => {
    return rooms.filter((r) =>
      r.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [rooms, search]);

  const ready = Boolean(origin && destination);

  // --- URL → STATE (ORIGIN + DESTINATION) ---
  useEffect(() => {
    if (!rooms.length) return;

    const originFromUrl = searchParams.get("origin");
    const destFromUrl = searchParams.get("dest");

    if (originFromUrl) {
      const originMatch = rooms.find((r) => r.name === originFromUrl);
      if (originMatch) setOrigin(originMatch);
    }

    if (destFromUrl) {
      const destMatch = rooms.find((r) => r.name === destFromUrl);
      if (destMatch) setDestination(destMatch);
    }
  }, [searchParams, rooms]);

  // --- ACTIONS ---
  const openPicker = (type: "origin" | "destination") => {
    setSearch("");
    setActivePicker(type);
  };

  const selectRoom = (room: Room) => {
    if (activePicker === "origin") setOrigin(room);
    if (activePicker === "destination") setDestination(room);
    setActivePicker(null);
  };

  const startNavigation = () => {
    if (!origin || !destination) return;
    navigate(`/map-view?origin=${encodeURIComponent(origin.name)}&dest=${encodeURIComponent(destination.name)}&floor=${destination.floorId}`);
  };

  // Compute floor data for the map picker — use destination floor if chosen, else first available floor
  const pinPickerFloorData = useMemo(() => {
    const floorId = pinPickerFloor || destination?.floorId || ALL_FLOOR_DATA[0]?.id;
    const entry = ALL_FLOOR_DATA.find(f => f.id === floorId);
    return { floorId: floorId || '', data: entry?.data || null };
  }, [pinPickerFloor, destination]);

  const handlePinConfirm = (nodeId: string, nodeName: string) => {
    // Create a synthetic room entry from the confirmed node
    const floorEntry = ALL_FLOOR_DATA.find(f => f.id === pinPickerFloorData.floorId);
    const syntheticOrigin: Room = {
      id: nodeId,
      name: nodeName,
      floorId: pinPickerFloorData.floorId,
      floorName: floorEntry?.data?.meta?.floorName || 'Selected Location',
    };
    setOrigin(syntheticOrigin);
    setPinPickerFloor(null);
  };

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = activePicker ? "hidden" : "unset";
  }, [activePicker]);

  return (
    <div className="nav-page-container">
      {/* Background */}
      <div className="bg-image" />
      <div className="bg-overlay" />

      {/* Main Content */}
      <div className="content-wrapper">
        {/* Header */}
        <div className="brand-header">
          <h1 className="hero-title">SIMS Indoor Navigation</h1>
          <p className="hero-subtitle">Search and select locations</p>
          <div className="gold-underline" />
        </div>

        {/* Card */}
        <div className="glass-card">
          {/* Origin */}
          <div>
            <label className="input-label">Start Point</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="fake-input-btn"
                style={{ flex: 1 }}
                onClick={() => openPicker("origin")}
              >
                <Search className="input-icon" />
                <span className={`input-text ${origin ? "filled" : "placeholder"}`}>
                  {origin ? origin.name : "Search start location"}
                </span>
              </button>
              <button
                title="Set my location on map"
                onClick={() => setPinPickerFloor(destination?.floorId || ALL_FLOOR_DATA[0]?.id || 'test')}
                style={{
                  flexShrink: 0, width: 48, height: 48,
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(99,102,241,0.4)',
                }}
              >
                <Map size={20} color="white" />
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="connector-container">
            <div className="connector-line" />
            <div className="connector-badge">to</div>
          </div>

          {/* Destination */}
          <div>
            <label className="input-label">Destination</label>
            <button
              className="fake-input-btn"
              onClick={() => openPicker("destination")}
            >
              <Search className="input-icon" />
              <span
                className={`input-text ${
                  destination ? "filled" : "placeholder"
                }`}
              >
                {destination ? destination.name : "Search destination"}
              </span>
            </button>
          </div>

          {/* Voice Input */}
          <div>
            <label className="input-label">Or use voice commands</label>
            <VoiceToTextMic
              onIntent={(data: IntentResponse) => {
                if (!rooms.length) return;

                if (data.origin_place) {
                  const matchOrigin = rooms.find(
                    (r) =>
                      r.name.toLowerCase() === data.origin_place!.toLowerCase()
                  );
                  if (matchOrigin) setOrigin(matchOrigin);
                }

                if (data.destination_place) {
                  const matchDest = rooms.find(
                    (r) =>
                      r.name.toLowerCase() ===
                      data.destination_place!.toLowerCase()
                  );
                  if (matchDest) setDestination(matchDest);
                }
              }}
            />
          </div>

          {/* GO BUTTON */}
          <button className="go-btn" onClick={startNavigation} disabled={!ready}>
            {ready && <div className="shimmer" />}
            <span>Start Navigation</span>
            <div className="go-pill">
              GO <ArrowRight size={16} strokeWidth={3} />
            </div>
          </button>
        </div>
      </div>

      {/* Bottom Sheet */}
      {activePicker && (
        <>
          <div className="modal-overlay" onClick={() => setActivePicker(null)} />

          <div className="modal-content">
            <div
              className="modal-drag-area"
              onClick={() => setActivePicker(null)}
            >
              <div className="modal-handle" />
            </div>

            <div className="modal-header">
              <h3 className="modal-title">
                Select{" "}
                {activePicker === "origin" ? "Start Point" : "Destination"}
              </h3>
              <button
                onClick={() => setActivePicker(null)}
                style={{ border: "none", background: "transparent" }}
              >
                <X className="text-slate-400" />
              </button>
            </div>

            <div className="modal-search-area">
              <div className="search-box">
                <Search size={20} />
                <input
                  autoFocus
                  className="search-input-field"
                  placeholder={`Search for ${activePicker}...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-list">
              {filteredRooms.length > 0 ? (
                filteredRooms.map((room) => (
                  <button
                    key={room.id}
                    className={`room-item ${
                      room.id === (activePicker === "origin" ? origin?.id : destination?.id) ? "selected" : ""
                    }`}
                    onClick={() => selectRoom(room)}
                  >
                    <div className="room-icon-box">
                      {activePicker === "origin" ? (
                        <Navigation size={20} />
                      ) : (
                        <MapPin size={20} />
                      )}
                    </div>
                    <div className="room-info">
                      <h4>{room.name}</h4>
                      <p>{room.floorName}</p>
                    </div>
                  </button>
                ))
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    color: "#94a3b8",
                  }}
                >
                  No locations found
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Pin Pickup Map Overlay ── */}
      {pinPickerFloor && pinPickerFloorData.data && (
        <PinPickupMap
          floorData={pinPickerFloorData.data}
          floorId={pinPickerFloorData.floorId}
          onConfirm={handlePinConfirm}
          onClose={() => setPinPickerFloor(null)}
        />
      )}
    </div>
  );
};

export default NavigationPage;
