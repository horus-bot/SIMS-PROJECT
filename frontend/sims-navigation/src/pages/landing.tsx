import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { 
  Search, MapPin, QrCode, X, 
  Stethoscope, Bed, Activity, Coffee, 
  ChevronRight, History, Info, 
  Circle
} from "lucide-react";
import { gsap } from "gsap";
import Header from "../components/Header";
import QRScanner from "../components/QRScanner";
import Avatar from "../components/avatar";
import floorData from "../data/test_1.json";
import "./landing.css";

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
  
  const origin = searchParams.get("origin");
  const destination = searchParams.get("dest");

  // --- REFS ---
  const welcomeRef = useRef<HTMLDivElement>(null);
  const mainCardRef = useRef<HTMLDivElement>(null);

  // --- DATA PROCESSING ---
  const allDestinations = useMemo(() => {
    const destMap = (floorData as any)?.destinations;
    if (!destMap) return [];
    return Object.keys(destMap).sort();
  }, []);

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
      list = list.filter(d => d.toLowerCase().includes(searchQuery.toLowerCase()));
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
  const handleQrScan = (result: string) => {
    setSearchParams({ origin: result });
    setIsScannerOpen(false);
    setActiveStep('destination');
  };

  const handleSelectItem = (name: string) => {
    if (activeStep === 'origin') {
      setSearchParams({ origin: name });
      setSearchQuery("");
      setActiveCategory(null);
      setActiveStep('destination');
    } else {
      // Save to recent
      const updated = [name, ...recentDestinations.filter(d => d !== name)].slice(0, 5);
      setRecentDestinations(updated);
      localStorage.setItem("recent_destinations", JSON.stringify(updated));
      
      navigate(`/map-view?origin=${encodeURIComponent(origin || "")}&dest=${encodeURIComponent(name)}`);
    }
  };

  const clearOrigin = () => {
    setSearchParams({});
    setActiveStep('origin');
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
                  <button className="scan-trigger-btn" onClick={() => setIsScannerOpen(true)}>
                    <QrCode size={18} />
                  </button>
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
                    {filteredResults.map(item => (
                      <button key={item} className="result-row-v4" onClick={() => handleSelectItem(item)}>
                        <div className="r-info">
                          <span className="r-name">{item}</span>
                          <span className="r-meta">Floor 4 • Block B</span>
                        </div>
                        <ChevronRight size={16} />
                      </button>
                    ))}
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
    </div>
  );
}
