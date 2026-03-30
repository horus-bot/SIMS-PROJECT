import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { 
  Search, MapPin, QrCode, X, 
  Stethoscope, Bed, Activity, Coffee, 
  ChevronRight, History, Info, 
  Circle, Map
} from "lucide-react";
import { gsap } from "gsap";
import Header from "../components/Header";
import QRScanner from "../components/QRScanner";
import Avatar from "../components/avatar";
import PinPickupMap from "../components/PinPickupMap";
import VoiceToTextMic from "../components/Mic";
import { fuzzyScore } from "../utils/search";
import "./landing.css";

const dataModules = import.meta.glob('../data/*.json', { eager: true });

const ALL_FLOOR_DATA = Object.entries(dataModules).map(([path, mod]) => {
  const filename = path.split('/').pop()?.replace('.json', '');
  let id = filename || 'unknown';
  
  // Maintain backward compatibility with old IDs
  if (id === 'test_1') id = 'test';
  else if (id === 'graphData_firstfloor') id = 'firstfloor';
  else if (id === 'graphData4th') id = 'fourthfloor';
  
  return { id, data: (mod as any).default || mod };
});

// Category Definitions
const CATEGORIES = [
  { id: 'rooms', name: 'Rooms', icon: <Bed size={20} />, color: '#3b82f6', pattern: /^\d{4}$/ },
  { id: 'doctors', name: 'Doctors', icon: <Stethoscope size={20} />, color: '#10b981', pattern: /doctor|dr\d|consultant|opd/i },
  { id: 'services', name: 'Services', icon: <Activity size={20} />, color: '#f59e0b', pattern: /xray|mri|lab|pharmacy|er|emergency|icu/i },
  { id: 'utilities', name: 'Facilities', icon: <Coffee size={20} />, color: '#6366f1', pattern: /toilet|restroom|lift|elevator|tea|canteen|exit/i },
];

export default function Landing() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // --- STATE ---
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [activeStep, setActiveStep] = useState<'origin' | 'destination'>('origin');
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [recentDestinations, setRecentDestinations] = useState<string[]>([]);

  // --- PIN PICKUP STATE ---
  // Holds the scanned/typed name while we wait for user location confirmation
  const [locationConfirmPending, setLocationConfirmPending] = useState<string | null>(null);
  // Floor picker for map-pin feature
  const [floorPickerOpen, setFloorPickerOpen] = useState(false);
  // Which floor the PinPickupMap shows
  const [pinPickerFloorId, setPinPickerFloorId] = useState<string | null>(null);

  // Derived: the floor data for map-pin
  const pinPickerFloorData = useMemo(() => {
    if (!pinPickerFloorId) return null;
    return ALL_FLOOR_DATA.find(f => f.id === pinPickerFloorId)?.data || null;
  }, [pinPickerFloorId]);

  // Only show floors that have a real svg in meta
  const availableFloors = useMemo(() =>
    ALL_FLOOR_DATA.filter(f => f.data?.meta?.floorName && f.data?.meta?.svg),
  []);
  
  const origin = searchParams.get("origin");
  const destination = searchParams.get("dest");

  // --- REFS ---
  const welcomeRef = useRef<HTMLDivElement>(null);
  const mainCardRef = useRef<HTMLDivElement>(null);

  // --- DATA PROCESSING ---
  const allDestinationsWithFloor = useMemo(() => {
    const combined: { name: string; floor: string }[] = [];
    ALL_FLOOR_DATA.forEach(floor => {
      const destMap = floor.data?.destinations;
      if (destMap) {
        Object.keys(destMap).forEach(name => {
          combined.push({ name, floor: floor.id });
        });
      }
    });
    return combined.sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const allDestinations = useMemo(() => allDestinationsWithFloor.map(d => d.name), [allDestinationsWithFloor]);

  const categorizedData = useMemo(() => {
    const results: Record<string, string[]> = { rooms: [], doctors: [], services: [], utilities: [], uncategorized: [] };
    allDestinations.forEach(name => {
      let matched = false;
      for (const cat of CATEGORIES) {
        if (cat.pattern.test(name)) {
          results[cat.id].push(name);
          matched = true;
          break;
        }
      }
      if (!matched) results.uncategorized.push(name);
    });
    return results;
  }, [allDestinations]);

  const filteredResults = useMemo(() => {
    let list = activeCategory ? categorizedData[activeCategory] : allDestinations;
    if (searchQuery) {
      const scoredList = list.map(item => ({
        name: item,
        score: fuzzyScore(searchQuery, item)
      })).filter(item => item.score > 0);
      
      scoredList.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
      return scoredList.map(item => item.name).slice(0, 15);
    }
    return list.slice(0, 15);
  }, [searchQuery, activeCategory, categorizedData, allDestinations]);

  // --- EFFECTS ---
  useEffect(() => {
    const saved = localStorage.getItem("recent_destinations");
    if (saved) setRecentDestinations(JSON.parse(saved));

    gsap.fromTo(welcomeRef.current, { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.8 });
    gsap.fromTo(mainCardRef.current, { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.6, delay: 0.2 });
  }, []);

  // Set active step automatically
  useEffect(() => {
    if (!origin) setActiveStep('origin');
    else if (!destination) setActiveStep('destination');
  }, [origin, destination]);

  // --- HANDLERS ---
  // QR scan result — show location confirmation sheet instead of jumping straight to dest
  const handleQrScan = (result: string) => {
    setIsScannerOpen(false);
    setLocationConfirmPending(result); // show confirm sheet
  };

  // User confirmed they are at the QR/typed location
  const handleConfirmLocation = (name: string) => {
    setSearchParams({ origin: name });
    setLocationConfirmPending(null);
    setActiveStep('destination');
  };

  // User wants to pin their exact location on the map instead
  const handlePinInstead = () => {
    setLocationConfirmPending(null);
    setFloorPickerOpen(true); // open floor picker first
  };

  // User chose a floor from the floor picker
  const handleFloorChosen = (floorId: string) => {
    setFloorPickerOpen(false);
    setPinPickerFloorId(floorId);
  };

  // User confirmed pin position on the map
  const handlePinConfirm = (_nodeId: string, nodeName: string) => {
    setSearchParams({ origin: nodeName });
    setPinPickerFloorId(null);
    setActiveStep('destination');
  };

  const handleSelectItem = (name: string) => {
    if (activeStep === 'origin') {
      // Show location confirmation sheet — don't jump straight
      setSearchQuery("");
      setActiveCategory(null);
      setLocationConfirmPending(name);
    } else {
      // Find floor for this destination
      const destInfo = allDestinationsWithFloor.find(d => d.name === name);
      const floor = destInfo ? destInfo.floor : "test";

      // Save to recent
      const updated = [name, ...recentDestinations.filter(d => d !== name)].slice(0, 5);
      setRecentDestinations(updated);
      localStorage.setItem("recent_destinations", JSON.stringify(updated));
      
      navigate(`/map-view?origin=${encodeURIComponent(origin || "")}&dest=${encodeURIComponent(name)}&floor=${floor}`);
    }
  };

  const clearOrigin = () => {
    setSearchParams({});
    setActiveStep('origin');
  };

  const handleVoiceIntent = (data: { intent: string; origin_place: string | null; destination_place: string | null }) => {
    let newOrigin = origin;
    let newDest = destination;

    const findBestMatch = (query: string) => {
      const scoredList = allDestinations.map(item => ({ name: item, score: fuzzyScore(query, item) })).filter(item => item.score > 0);
      return scoredList.length > 0 ? scoredList.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))[0].name : null;
    };

    if (data.origin_place) {
      const bestOrigin = findBestMatch(data.origin_place);
      if (bestOrigin) newOrigin = bestOrigin;
    }

    if (data.destination_place) {
      const bestDest = findBestMatch(data.destination_place);
      if (bestDest) {
        newDest = bestDest;
        const updated = [bestDest, ...recentDestinations.filter(d => d !== bestDest)].slice(0, 5);
        setRecentDestinations(updated);
        localStorage.setItem("recent_destinations", JSON.stringify(updated));
      }
    }

    if (newOrigin || newDest) {
      if (newOrigin && newDest) {
        const destInfo = allDestinationsWithFloor.find(d => d.name === newDest);
        const floor = destInfo ? destInfo.floor : "test";
        navigate(`/map-view?origin=${encodeURIComponent(newOrigin)}&dest=${encodeURIComponent(newDest)}&floor=${floor}`);
      } else {
        const params: Record<string, string> = {};
        if (newOrigin) params.origin = newOrigin;
        if (newDest) params.dest = newDest;
        setSearchParams(params);
        if (newOrigin) setActiveStep('destination');
      }
    }
  };

  return (
    <div className="landing-page-v4">
      <Header />

      <main className="main-content">
        
        {/* Welcome Header */}
        <div className="welcome-header" ref={welcomeRef}>
          <div className="avatar-mini"><Avatar size={50} /></div>
          <div className="welcome-text">
            <h1>SIMS Navigation</h1>
            <p>Your digital guide inside the hospital</p>
          </div>
        </div>

        <div className="main-card" ref={mainCardRef}>
          
          {/* Top Selection Status (Vertical Stacked) */}
          <div className="route-summary-v">
            <div className={`summary-row ${origin ? 'filled' : 'active'}`} onClick={() => setActiveStep('origin')}>
              <div className="point-icon origin"><Circle size={10} fill="#3b82f6" stroke="#3b82f6" /></div>
              <div className="summary-label">
                <span className="step-tag">Start</span>
                <strong>{origin || "Scan or type location"}</strong>
              </div>
              {origin && <button className="mini-clear-btn" onClick={(e) => { e.stopPropagation(); clearOrigin(); }}><X size={14} /></button>}
            </div>
            
            <div className="v-connector">
              <div className="line"></div>
            </div>

            <div className={`summary-row ${activeStep === 'destination' ? 'active' : ''}`} onClick={() => origin && setActiveStep('destination')}>
              <div className="point-icon dest"><MapPin size={14} color="#ef4444" fill="#ef4444" /></div>
              <div className="summary-label">
                <span className="step-tag">End</span>
                <strong>{destination || "Search destination"}</strong>
              </div>
            </div>
          </div>

          <div className="step-body-v">
            
            {/* Search and Categories */}
            <div className="search-section-v">
              <div className="search-bar-v4">
                <Search size={20} className="s-icon" />
                <input 
                  type="text" 
                  placeholder={activeStep === 'origin' ? "Enter your current location..." : "Where do you want to go?"}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              {activeStep === 'origin' && !searchQuery && (
                <>
                  <button
                    className="scan-trigger-btn"
                    onClick={() => setIsScannerOpen(true)}
                    title="Scan QR Code"
                  >
                    <QrCode size={18} />
                  </button>
                  <button
                    className="scan-trigger-btn"
                    onClick={() => setFloorPickerOpen(true)}
                    title="Pin my location on map"
                    style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: 'white', marginLeft: 4, borderRadius: 10 }}
                  >
                    <Map size={16} />
                  </button>
                </>
              )}
                {searchQuery && <X size={18} className="c-icon" onClick={() => setSearchQuery("")} />}
              </div>

              {!searchQuery && !activeCategory && (
                <>
                  <div className="cat-scroll-v4">
                    {CATEGORIES.map(cat => (
                      <button key={cat.id} className="cat-card-v4" onClick={() => setActiveCategory(cat.id)}>
                        <div className="cat-icon-v4" style={{ color: cat.color, backgroundColor: `${cat.color}10` }}>
                          {cat.icon}
                        </div>
                        <span>{cat.name}</span>
                      </button>
                    ))}
                  </div>

                  {recentDestinations.length > 0 && activeStep === 'destination' && (
                    <div className="recent-section-v4">
                      <h4><History size={12} /> Recent</h4>
                      <div className="recent-list-v4">
                        {recentDestinations.map(d => (
                          <button key={d} className="recent-chip-v4" onClick={() => handleSelectItem(d)}>{d}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {(searchQuery || activeCategory) && (
                <div className="results-container-v4">
                  <div className="results-header-v4">
                    <span>{activeCategory ? CATEGORIES.find(c => c.id === activeCategory)?.name : 'Suggested'}</span>
                    <button onClick={() => { setSearchQuery(""); setActiveCategory(null); }}>Clear</button>
                  </div>
                  <div className="results-list-v4">
                    {filteredResults.map(item => {
                      const destInfo = allDestinationsWithFloor.find(d => d.name === item);
                      const floorName = ALL_FLOOR_DATA.find(f => f.id === destInfo?.floor)?.data?.meta?.floorName || "Unknown Floor";
                      return (
                        <button key={item} className="result-row-v4" onClick={() => handleSelectItem(item)}>
                          <div className="r-info">
                            <span className="r-name">{item}</span>
                            <span className="r-meta">{floorName}</span>
                          </div>
                          <ChevronRight size={16} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Large QR Option (only at start) */}
            {activeStep === 'origin' && !searchQuery && !activeCategory && (
              <div className="qr-full-prompt-v4">
                <div className="divider-v4"><span>OR</span></div>
                <button className="big-qr-btn" onClick={() => setIsScannerOpen(true)}>
                  <div className="qr-icon-bg"><QrCode size={28} /></div>
                  <div className="qr-text-group">
                    <strong>Scan QR Code</strong>
                    <span>Find your position automatically</span>
                  </div>
                </button>
              </div>
            )}

            {/* AI Assistant Voice Input */}
            {(!searchQuery && !activeCategory) && (
              <div className="voice-assistant-section-v4" style={{ marginTop: 16 }}>
                <div style={{ marginBottom: 10, fontSize: 13, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
                  Or use AI Assistant
                </div>
                <VoiceToTextMic onIntent={handleVoiceIntent} />
              </div>
            )}

          </div>
        </div>

        <div className="landing-footer-v4">
          <Info size={14} />
          <span>SIMS Navigation v1.2</span>
        </div>
      </main>

      {isScannerOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000 }}>
          <QRScanner
            onScan={handleQrScan}
            onError={(err) => console.error(err)}
            onClose={() => setIsScannerOpen(false)}
          />
        </div>
      )}

      {/* ── Location Confirmation Sheet ── */}
      {locationConfirmPending && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1500,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'flex-end',
        }} onClick={() => setLocationConfirmPending(null)}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', background: 'white',
              borderRadius: '24px 24px 0 0',
              padding: '28px 24px 40px',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ width: 40, height: 4, borderRadius: 2, background: '#e2e8f0', margin: '0 auto 24px' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <MapPin size={20} color="white" fill="white" />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 17, color: '#1e293b' }}>Are you here?</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Detected location:</div>
              </div>
            </div>
            <div style={{
              background: '#f1f5f9', borderRadius: 14, padding: '14px 16px',
              margin: '16px 0 24px', fontWeight: 600, fontSize: 15, color: '#1e293b',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <Circle size={10} fill="#3b82f6" stroke="#3b82f6" />
              {locationConfirmPending}
            </div>
            <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.6, margin: '0 0 24px' }}>
              Confirm this as your starting point, or pin your exact position on the floor map.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                onClick={() => handleConfirmLocation(locationConfirmPending)}
                style={{
                  padding: '16px', borderRadius: 16, border: 'none',
                  background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
                  color: 'white', fontWeight: 700, fontSize: 16, cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(59,130,246,0.4)',
                }}
              >
                ✅ Yes, I'm standing here — Start Navigation
              </button>
              <button
                onClick={handlePinInstead}
                style={{
                  padding: '14px', borderRadius: 16,
                  border: '1.5px solid #e2e8f0',
                  background: 'white', color: '#374151', fontWeight: 600,
                  fontSize: 15, cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <Map size={18} color="#6366f1" /> Pin my exact location on the map
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Floor Picker Sheet ── */}
      {floorPickerOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1500,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'flex-end',
        }} onClick={() => setFloorPickerOpen(false)}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', background: 'white',
              borderRadius: '24px 24px 0 0',
              padding: '28px 24px 40px',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ width: 40, height: 4, borderRadius: 2, background: '#e2e8f0', margin: '0 auto 20px' }} />
            <h3 style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 18, color: '#1e293b' }}>Select Floor</h3>
            <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: 13 }}>Choose the floor you are currently on</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {availableFloors.map(floor => (
                <button
                  key={floor.id}
                  onClick={() => handleFloorChosen(floor.id)}
                  style={{
                    padding: '16px 20px', borderRadius: 14,
                    border: '1.5px solid #e2e8f0',
                    background: 'white', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 14,
                    textAlign: 'left', transition: 'all 0.2s',
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: 'linear-gradient(135deg,#6366f1,#4f46e5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Map size={18} color="white" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15, color: '#1e293b' }}>
                      {floor.data?.meta?.floorName || floor.id}
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                      {Object.keys(floor.data?.nodes || {}).length} nodes · {Object.keys(floor.data?.destinations || {}).length} destinations
                    </div>
                  </div>
                  <ChevronRight size={18} color="#9ca3af" style={{ marginLeft: 'auto' }} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Pin Pickup Map (full screen) ── */}
      {pinPickerFloorId && pinPickerFloorData && (
        <PinPickupMap
          floorData={pinPickerFloorData}
          floorId={pinPickerFloorId}
          onConfirm={handlePinConfirm}
          onClose={() => setPinPickerFloorId(null)}
        />
      )}
    </div>
  );
}
