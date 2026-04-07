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
import VoiceToTextMic from "../components/Mic";
import { fuzzyScore } from "../utils/search";
import "./landing.css";

type SearchResultItem = {
  name: string;
  score: number;
  floorId: string;
  floorName: string;
  category: string;
};

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

  // --- FLOOR SEARCH FILTER STATE ---
  // Floor picker for search filtering
  const [floorPickerOpen, setFloorPickerOpen] = useState(false);
  // Which floor/map search should use for results
  const [searchFloorId, setSearchFloorId] = useState<string | null>(null);

  // Only show floors that have a real svg in meta
  const availableFloors = useMemo(() =>
    ALL_FLOOR_DATA.filter(f => f.data?.meta?.floorName && f.data?.meta?.svg),
  []);
  
  const origin = searchParams.get("origin");
  const destination = searchParams.get("dest");

  // --- REFS ---
  const welcomeRef = useRef<HTMLDivElement>(null);
  const mainCardRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  const searchScopedDestinationsWithFloor = useMemo(() => {
    if (!searchFloorId) return allDestinationsWithFloor;
    return allDestinationsWithFloor.filter(d => d.floor === searchFloorId);
  }, [allDestinationsWithFloor, searchFloorId]);

  const allDestinations = useMemo(
    () => Array.from(new Set(searchScopedDestinationsWithFloor.map(d => d.name))),
    [searchScopedDestinationsWithFloor],
  );

  const selectedSearchFloorName = useMemo(() => {
    if (!searchFloorId) return "All Floors";
    return ALL_FLOOR_DATA.find(f => f.id === searchFloorId)?.data?.meta?.floorName || "Selected Floor";
  }, [searchFloorId]);

  const getCategoryForName = (name: string) => {
    const found = CATEGORIES.find(cat => cat.pattern.test(name));
    return found?.name || "Other";
  };

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
    const query = searchQuery.trim();
    const list = activeCategory ? categorizedData[activeCategory] : allDestinations;

    const buildResult = (name: string, score: number): SearchResultItem => {
      const destInfo = searchScopedDestinationsWithFloor.find(d => d.name === name)
        || allDestinationsWithFloor.find(d => d.name === name);
      const floorId = destInfo?.floor || "test";
      const floorName = ALL_FLOOR_DATA.find(f => f.id === floorId)?.data?.meta?.floorName || "Unknown Floor";
      return {
        name,
        score,
        floorId,
        floorName,
        category: getCategoryForName(name)
      };
    };

    if (query) {
      const queryLower = query.toLowerCase();
      const scoredList = list
        .map(name => {
          const nameLower = name.toLowerCase();
          let score = fuzzyScore(query, name);

          if (nameLower === queryLower) score += 40;
          else if (nameLower.startsWith(queryLower)) score += 20;
          else if (nameLower.includes(queryLower)) score += 8;

          return buildResult(name, score);
        })
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

      return scoredList.slice(0, 20);
    }

    return list
      .slice(0, 20)
      .map(name => buildResult(name, 0));
  }, [searchQuery, activeCategory, categorizedData, allDestinations, allDestinationsWithFloor, searchScopedDestinationsWithFloor]);

  const topResult = filteredResults[0] || null;

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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);

    return () => window.clearTimeout(timer);
  }, [activeStep, origin, destination]);

  // --- HANDLERS ---
  // QR scan result
  const handleQrScan = (result: string) => {
    setIsScannerOpen(false);
    setSearchParams({ origin: result });
    setActiveStep('destination');
  };

  // User chose a floor from the floor picker
  const handleFloorChosen = (floorId: string) => {
    setFloorPickerOpen(false);
    setSearchFloorId(floorId);
    setSearchQuery("");
    setActiveCategory(null);
  };

  const openSearchFloorPicker = () => {
    setFloorPickerOpen(true);
  };

  const handleSelectItem = (name: string) => {
    if (activeStep === 'origin') {
      // Directly set selected origin
      setSearchQuery("");
      setActiveCategory(null);
      setSearchParams({ origin: name });
      setActiveStep('destination');
    } else {
      // Find floor for this destination
      const destInfo = searchScopedDestinationsWithFloor.find(d => d.name === name)
        || allDestinationsWithFloor.find(d => d.name === name);
      const floor = destInfo ? destInfo.floor : "test";
      const originFloor = origin
        ? (allDestinationsWithFloor.find(d => d.name === origin)?.floor || floor)
        : floor;

      // Save to recent
      const updated = [name, ...recentDestinations.filter(d => d !== name)].slice(0, 5);
      setRecentDestinations(updated);
      localStorage.setItem("recent_destinations", JSON.stringify(updated));
      
      navigate(
        `/map-view?originName=${encodeURIComponent(origin || "")}&originFloor=${encodeURIComponent(originFloor)}&destName=${encodeURIComponent(name)}&destFloor=${encodeURIComponent(floor)}`,
      );
    }
  };

  const handleSearchAction = () => {
    if (!searchQuery.trim() || !topResult) return;
    handleSelectItem(topResult.name);
  };

  const handleClearEverything = () => {
    setSearchParams({});
    setSearchQuery("");
    setActiveCategory(null);
    setSearchFloorId(null);
    setActiveStep('origin');
  };

  const clearSearchFloor = () => {
    setSearchFloorId(null);
    setSearchQuery("");
    setActiveCategory(null);
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
        const originFloor = allDestinationsWithFloor.find(d => d.name === newOrigin)?.floor || floor;
        navigate(
          `/map-view?originName=${encodeURIComponent(newOrigin)}&originFloor=${encodeURIComponent(originFloor)}&destName=${encodeURIComponent(newDest)}&destFloor=${encodeURIComponent(floor)}`,
        );
      } else {
        const params: Record<string, string> = {};
        if (newOrigin) params.origin = newOrigin;
        if (newDest) params.dest = newDest;
        setSearchParams(params);
        if (newOrigin) setActiveStep('destination');
      }
    }
  };

  const visibleRecentDestinations = useMemo(() => {
    if (!searchFloorId || activeStep !== 'destination') return recentDestinations;
    const allowed = new Set(searchScopedDestinationsWithFloor.map(d => d.name));
    return recentDestinations.filter(d => allowed.has(d));
  }, [recentDestinations, searchFloorId, activeStep, searchScopedDestinationsWithFloor]);

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
                  ref={searchInputRef}
                  type="text" 
                  placeholder={activeStep === 'origin' ? "Enter your current location..." : "Where do you want to go?"}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearchAction();
                    }
                  }}
                />
                <button
                  className="search-action-btn"
                  onClick={handleSearchAction}
                  disabled={!searchQuery.trim() || !topResult}
                  title={topResult ? `Go to ${topResult.name}` : 'Search'}
                >
                  <ChevronRight size={16} />
                </button>
              {activeStep === 'origin' && !searchQuery && (
                <>
                  <button
                    className="scan-trigger-btn"
                    onClick={() => setIsScannerOpen(true)}
                    title="Scan QR Code"
                  >
                    <QrCode size={18} />
                  </button>
                </>
              )}
                {searchQuery && <X size={18} className="c-icon" onClick={() => setSearchQuery("")} />}
              </div>

              <div className="search-help-row-v4">
                <span>
                  {activeStep === 'origin'
                    ? 'Step 1: Set your current location'
                    : 'Step 2: Pick your destination'}
                </span>
                <div className="search-help-actions-v4">
                  <button className="floor-filter-btn-v4" onClick={openSearchFloorPicker}>
                    {selectedSearchFloorName}
                  </button>
                  {searchFloorId && (
                    <button className="clear-floor-btn-v4" onClick={clearSearchFloor}>All</button>
                  )}
                  {(origin || destination) && (
                    <button className="reset-journey-btn-v4" onClick={handleClearEverything}>Reset</button>
                  )}
                </div>
              </div>

              {searchQuery && topResult && (
                <button className="top-match-cta-v4" onClick={handleSearchAction}>
                  <div>
                    <strong>Use top match: {topResult.name}</strong>
                    <span>{topResult.floorName} • {topResult.category}</span>
                  </div>
                  <ChevronRight size={16} />
                </button>
              )}

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

                  {visibleRecentDestinations.length > 0 && activeStep === 'destination' && (
                    <div className="recent-section-v4">
                      <h4><History size={12} /> Recent</h4>
                      <div className="recent-list-v4">
                        {visibleRecentDestinations.map(d => (
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
                    <div className="results-actions-v4">
                      <small>{filteredResults.length} shown</small>
                      <button onClick={() => { setSearchQuery(""); setActiveCategory(null); }}>Clear</button>
                    </div>
                  </div>
                  <div className="results-list-v4">
                    {filteredResults.length === 0 && searchQuery && (
                      <div className="empty-results-v4">
                        <strong>No matches found</strong>
                        <span>Try room number, doctor name, or service keyword.</span>
                      </div>
                    )}
                    {filteredResults.map((item, idx) => {
                      return (
                        <button key={item.name} className="result-row-v4" onClick={() => handleSelectItem(item.name)}>
                          <div className="r-info">
                            <span className="r-name">{item.name}</span>
                            <span className="r-meta">{item.floorName} • {item.category}</span>
                          </div>
                          {idx === 0 && searchQuery && <span className="top-badge-v4">Top</span>}
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
                <div className="divider-v4"><div style={{flex: 1, height: '1px', background: '#e2e8f0'}}/><span>OR</span><div style={{flex: 1, height: '1px', background: '#e2e8f0'}}/></div>
                <button className="big-qr-btn" onClick={() => setIsScannerOpen(true)}>
                  <div className="qr-icon-bg"><QrCode size={28} strokeWidth={2.5}/></div>
                  <div className="qr-text-group">
                    <strong>Scan QR Code</strong>
                    <span>Find your position automatically</span>
                  </div>
                  <ChevronRight size={20} color="#cbd5e1" style={{ marginLeft: 'auto' }} />
                </button>
              </div>
            )}

            {/* AI Assistant Voice Input */}
            {(!searchQuery && !activeCategory) && (
              <div className="voice-assistant-section-v4" style={{ marginTop: 24, padding: '16px', background: '#f8fafc', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                <div style={{ marginBottom: 12, fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <div style={{ flex: 1, height: '1px', background: '#cbd5e1' }} />
                  <span>Or use AI Assistant</span>
                  <div style={{ flex: 1, height: '1px', background: '#cbd5e1' }} />
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

      {/* ── Floor Picker Sheet ── */}
      {floorPickerOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1500,
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'flex-end',
          animation: 'fadeIn 0.2s ease-out'
        }} onClick={() => setFloorPickerOpen(false)}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', background: 'white',
              borderRadius: '28px 28px 0 0',
              padding: '24px 24px 48px',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.15)',
              transform: 'translateY(0)',
              animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            <div style={{ width: 48, height: 6, borderRadius: 3, background: '#cbd5e1', margin: '0 auto 24px' }} />
            <h3 style={{ margin: '0 0 8px', fontWeight: 800, fontSize: '1.25rem', color: '#0f172a' }}>Select Map for Search</h3>
            <p style={{ margin: '0 0 24px', color: '#64748b', fontSize: '0.95rem', fontWeight: 500 }}>Search will show destinations from the selected map only</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {availableFloors.map(floor => (
                <button
                  key={floor.id}
                  onClick={() => handleFloorChosen(floor.id)}
                  style={{
                    padding: '16px 20px', borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    background: 'white', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 16,
                    textAlign: 'left', transition: 'all 0.2s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.05)';
                    e.currentTarget.style.borderColor = '#cbd5e1';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: '14px',
                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    boxShadow: '0 4px 10px rgba(37,99,235,0.2)'
                  }}>
                    <Map size={20} color="white" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#0f172a' }}>
                      {floor.data?.meta?.floorName || floor.id}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4, fontWeight: 500 }}>
                      {Object.keys(floor.data?.nodes || {}).length} nodes · {Object.keys(floor.data?.destinations || {}).length} destinations
                    </div>
                  </div>
                  <ChevronRight size={20} color="#94a3b8" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
