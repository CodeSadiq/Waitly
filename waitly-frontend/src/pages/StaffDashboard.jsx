import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import API_BASE from "../config/api";
import { io } from "socket.io-client";
import QRCode from 'react-qr-code';
import { Html5Qrcode } from "html5-qrcode";
import { formatWaitTime, formatRelativeDate } from "../utils/timeFormat";
import "./StaffDashboard.css";
import "./StaffDashboard-mobile.css";
import MapView from "../components/MapView";

// Single socket instance
const socket = io(API_BASE, {
  withCredentials: true
});

export default function StaffDashboard() {
  const { user, logout, loadUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const [counters, setCounters] = useState([]);
  const [placeName, setPlaceName] = useState("");
  const [placeAddress, setPlaceAddress] = useState("");
  const [selectedCounter, setSelectedCounter] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Dashboard Status State
  const [currentTicket, setCurrentTicket] = useState(null);
  const [queueStats, setQueueStats] = useState({ waiting: 0, completed: 0, skipped: 0, slotted: 0 });
  const [nextTickets, setNextTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [appliedPlace, setAppliedPlace] = useState(null);
  const [loadingPlace, setLoadingPlace] = useState(false);
  const [crowdData, setCrowdData] = useState({ level: "Unknown", activeCount: 0, dailyCapacity: 0 });
  const [avgTimes, setAvgTimes] = useState({ staff: 5, system: 5, final: 5 });
  const [activeCounterConfig, setActiveCounterConfig] = useState(null);

  // Onboarding States
  const [onboardingStep, setOnboardingStep] = useState(user?.status === "applied" ? "pending" : "find");
  const [userLocation, setUserLocation] = useState(null);
  const [places, setPlaces] = useState([]);
  const [onboardingMapMode, setOnboardingMapMode] = useState(false);
  const [newPlaceData, setNewPlaceData] = useState({ name: "", category: "bank", address: "", lat: "", lng: "" });
  const [onboardingSearchMode, setOnboardingSearchMode] = useState(true); // Toggle between Map and Search
  const [selectedPlaceForApp, setSelectedPlaceForApp] = useState(null);
  const [appForm, setAppForm] = useState({
    fullName: user?.username || "",
    staffId: "",
    designation: "",
    counters: [""]
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem('waitly_token');
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  };

  // Helper function to get category name from category ID
  const getCategoryName = (categoryId) => {
    if (!categoryId) return "General Service";
    if (!activeCounterConfig || !activeCounterConfig.services) return categoryId;
    const category = activeCounterConfig.services.find(s => s.categoryId === categoryId);
    return category ? category.name : categoryId;
  };

  const renderCategoryIcon = (category) => {
    const color = "currentColor";
    const size = 22;
    switch (category?.toLowerCase()) {
      case "bank":
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" />
          </svg>
        );
      case "hospital":
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M12 8v8M8 12h8" />
          </svg>
        );
      case "government":
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 21h18M3 7l9-4 9 4M19 21v-7M5 21v-7M2 7h20M10 21v-7M14 21v-7" />
          </svg>
        );
      case "restaurant":
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 2v7c0 1.1.9 2 2 2h4V2" />
            <path d="M7 2v20" />
            <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3M21 15v7" />
          </svg>
        );
      default:
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
            <path d="M9 22v-4h6v4M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01" />
          </svg>
        );
    }
  };


  // All Tokens Modal & Inspecting Mode
  const [showTokensModal, setShowTokensModal] = useState(false);
  const [allTokens, setAllTokens] = useState({ serving: [], waiting: [], history: [] });
  const [inspectingTicket, setInspectingTicket] = useState(null);

  const fetchAllTokens = async () => {
    if (!selectedCounter) return;
    try {
      const res = await fetch(`${API_BASE}/api/staff/all-tokens?counterName=${selectedCounter}`, {
        credentials: "include",
        headers: getAuthHeaders()
      });
      const data = await res.json();
      const todayString = new Date().toDateString();

      const now = new Date();
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      const minsRemaining = (endOfDay - now) / 60000;

      setAllTokens({
        serving: (data.serving || []).map(t => ({
          ...t,
          isToday: new Date(t.createdAt).toDateString() === todayString,
          willServeToday: true
        })),
        waiting: (data.waiting || []).map(t => ({
          ...t,
          isToday: new Date(t.createdAt).toDateString() === todayString,
          willServeToday: (t.estimatedWait || 0) <= minsRemaining
        })),
        history: (data.history || []).map(t => ({
          ...t,
          isToday: new Date(t.completedAt || t.updatedAt).toDateString() === todayString
        }))
      });
    } catch (err) {
      console.error("Failed to fetch all tokens", err);
      // Assuming showNotification is defined elsewhere or needs to be added
      // showNotification("Failed to fetch all tokens", "error");
    }
  };

  // Onboarding Effects
  useEffect(() => {
    if (user && (user.status === "unassigned" || !user.placeId) && !userLocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(coords);
        try {
          const res = await fetch(`${API_BASE}/api/location/nearby-places?lat=${coords.lat}&lng=${coords.lng}`);
          const data = await res.json();
          setPlaces(Array.isArray(data) ? data : []);
        } catch (e) {
          console.error("Failed to load map places", e);
        }
      });
    }
  }, [user, userLocation]);

  // Redirect if not staff or not logged in
  useEffect(() => {
    if (!user) {
      const timer = setTimeout(() => {
        if (!user) navigate("/login");
      }, 5000); // Give it some time to load session
      return () => clearTimeout(timer);
    }

    if (user.role !== "staff") {
      navigate("/");
    }
  }, [user, navigate]);

  const [loadingCounters, setLoadingCounters] = useState(false);

  // Fetch Counters Logic
  const fetchCounters = async () => {
    if (!user?.placeId || user?.status !== "active") return;

    setLoadingCounters(true);
    setFetchError("");
    console.log("🔄 [DASHBOARD] Fetching counters for place:", user.placeId);

    try {
      const res = await fetch(`${API_BASE}/api/staff/counters`, {
        credentials: "include",
        headers: getAuthHeaders()
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error("❌ [DASHBOARD] Fetch counters failed:", res.status, errData);

        if (res.status === 401 || res.status === 403) {
          setFetchError("Authentication failed. Please try logging in again.");
          return;
        }

        setFetchError(`Error ${res.status}: ${errData.message || "Failed to load counters"}`);
        return;
      }

      const data = await res.json();
      console.log("✅ [DASHBOARD] Counters received:", data);

      const counterList = data.counters && data.counters.length > 0
        ? data.counters
        : [{ name: "General" }];

      setCounters(counterList);
      setPlaceName(data.placeName || "Workplace");
      setPlaceAddress(data.placeAddress || "");
    } catch (err) {
      console.error("❌ [DASHBOARD] Network error fetching counters:", err);
      setFetchError("Network error. Please check your internet connection.");
    } finally {
      setLoadingCounters(false);
    }
  };

  useEffect(() => {
    if (user?.role === "staff" && user?.status === "active" && user?.placeId) {
      fetchCounters();
    }
  }, [user?.status, user?.placeId, user?.role]);

  // Fetch Applied Place Details
  useEffect(() => {
    const fetchAppliedPlace = async () => {
      if ((user?.status === "applied" || user?.status === "pending") && user?.application?.placeId) {
        setLoadingPlace(true);
        try {
          const res = await fetch(`${API_BASE}/api/staff/places/${user.application.placeId}`, {
            credentials: "include",
            headers: getAuthHeaders()
          });
          if (res.ok) {
            const data = await res.json();
            setAppliedPlace(data);
          }
        } catch (e) {
          console.error("Error fetching applied place:", e);
        } finally {
          setLoadingPlace(false);
        }
      }
    };
    fetchAppliedPlace();
  }, [user?.status, user?.application?.placeId]);

  // Actions
  const handleNextTicket = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/staff/next`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ counterName: selectedCounter }),
        credentials: "include"
      });
      if (!res.ok) {
        const err = await res.json();
        showNotification(err.message || "Failed to call next ticket", "error");
      } else {
        fetchStatus();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /* ========================================================
     AUTO-FLOW LOGIC
     ======================================================== */
  // 1. Mark as Completed -> Automatically Call Next
  const handleUpdateStatus = async (action) => {
    if (!currentTicket) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/staff/action`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ tokenId: currentTicket._id, action }),
        credentials: "include"
      });

      if (res.ok) {
        // Success! Now calling next immediately...
        await handleNextTicket();
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const fetchStatus = async () => {
    if (!selectedCounter) return;
    try {
      const res = await fetch(`${API_BASE}/api/staff/status?counterName=${selectedCounter}`, {
        credentials: "include",
        headers: getAuthHeaders()
      });
      const data = await res.json();
      setCurrentTicket(data.currentTicket);
      setQueueStats({
        waiting: data.waiting,
        completed: data.completed,
        skipped: data.skipped,
        slotted: data.slotted || 0
      });
      setNextTickets(data.nextTickets || []);
      if (data.crowd) setCrowdData(data.crowd);
      if (data.avgTimes) setAvgTimes(data.avgTimes);
      if (data.counterConfig) setActiveCounterConfig(data.counterConfig);
    } catch (err) {
      console.error("Failed to fetch status", err);
    }
  };

  useEffect(() => {
    if (!selectedCounter) return;
    fetchStatus();
    socket.on("token-updated", fetchStatus);
    return () => socket.off("token-updated");
  }, [selectedCounter]);

  // 2. Initial Auto-Call on Load (only if no active ticket)
  useEffect(() => {
    if (selectedCounter && !currentTicket && !loading) {
      // Optional: Could auto-call here if desired, but user might prefer manual start.
      // For "first token is by default showing", let's check queue and call if needed.
      // However, to avoid unwanted auto-calls on refresh, we might just rely on the 'No Tokens' UI state
      // or check if queueStats.waiting > 0?
      // Let's modify fetchStatus to handle "if no current ticket, fetch it?" 
      // Actually user logic: "first token is by default showing" -> implied "get current serving OR call next if none serving"
    }
  }, [selectedCounter]);

  // Enhanced fetchStatus to AUTO-CALL if we have waiting tokens but none serving?
  // Or just keep it manual start but auto-next.
  // The user asked "first token is by default showing when i select a counter".
  // This implies if I enter dashboard, show me whom to serve.

  // Let's modify handleNextTicket to be robust and reusable.

  // New Effect: When entering dashboard, if no current ticket but queue has waiting, call next.
  useEffect(() => {
    if (selectedCounter && !currentTicket && queueStats.waiting > 0 && !loading) {
      // CAUTION: This might loop if not careful. 
      // Safest is to just show proper UI "No active token" and let user click once, 
      // OR truly auto-call. User asked "first token is by default showing".
      // Let's try to call next ticket once if none is present.
      const autoStart = async () => {
        // ensure we haven't already tried
        if (sessionStorage.getItem(`autostart_${selectedCounter}`)) return;
        await handleNextTicket();
        sessionStorage.setItem(`autostart_${selectedCounter}`, 'true');
      };
      autoStart();
    }
  }, [selectedCounter, currentTicket, queueStats.waiting]);

  const [notification, setNotification] = useState({ message: "", type: "", visible: false });
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    setIsVerified(false);
  }, [currentTicket, inspectingTicket]);

  const showNotification = (message, type = "success") => {
    setNotification({ message, type, visible: true });
    setTimeout(() => setNotification(prev => ({ ...prev, visible: false })), 3000);
  };

  const handleScanSuccess = (decodedText) => {
    setShowScanner(false);
    const targetTicket = inspectingTicket || currentTicket;
    if (!targetTicket) {
      showNotification("No ticket selected for verification.", "error");
      return;
    }
    const scannedText = decodedText.trim();
    const expectedCode = targetTicket.tokenCode.trim();

    if (scannedText === expectedCode || scannedText.includes(expectedCode)) {
      setIsVerified(true);
      showNotification(`Token Verified Successfully: ${expectedCode}`, "success");
    } else {
      showNotification(`Scan Mismatch: Expected "${expectedCode}"`, "error");
    }
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [applying, setApplying] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const searchPlaces = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError("");
    try {
      const res = await fetch(`${API_BASE}/api/staff/places/search?q=${searchQuery}`, {
        credentials: "include",
        headers: getAuthHeaders()
      });
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
      if (data.length === 0) setSearchError(`No places found matching "${searchQuery}"`);
    } catch (e) {
      setSearchError("Failed to search. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  const applyForPlace = async (e, isNew = false) => {
    if (e && e.preventDefault) e.preventDefault();
    if (applying) return;

    if (!selectedPlaceForApp && !isNew) return;

    setApplying(true);
    try {
      const payload = {
        ...appForm
      };

      // Convert counters array to comma-separated string for backend compatibility
      if (Array.isArray(appForm.counters)) {
        payload.counterName = appForm.counters.filter(c => c.trim() !== "").join(", ");
        delete payload.counters;
      }

      if (isNew) {
        payload.newPlaceData = {
          name: selectedPlaceForApp.name,
          address: selectedPlaceForApp.address,
          category: selectedPlaceForApp.category,
          location: selectedPlaceForApp.location
        };
      } else {
        payload.placeId = selectedPlaceForApp._id;
      }

      const res = await fetch(`${API_BASE}/api/staff/places/apply`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
        credentials: "include"
      });
      if (res.ok) {
        showNotification(isNew ? "New workplace proposed & application sent!" : "Application sent! Waiting for admin approval.", "success");
        setSelectedPlaceForApp(null);
        setOnboardingStep("pending");
        setTimeout(async () => await loadUser(), 1500);
      } else {
        const errData = await res.json().catch(() => ({}));
        showNotification(errData.message || "Application failed", "error");
      }
    } catch (e) {
      showNotification("Server Error", "error");
    } finally {
      setApplying(null);
    }
  };

  const cancelApplication = async () => {
    // if (!window.confirm("Are you sure you want to cancel your application?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/staff/places/cancel`, {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders()
      });
      if (res.ok) {
        showNotification("Application cancelled.", "success");
        await loadUser();
      }
    } catch (e) {
      showNotification("Network error", "error");
    }
  };

  /* ================= RENDER LOGIC ================= */
  if (!user) {
    return (
      <div className="staff-dashboard-container">
        <div className="loading-results" style={{ marginTop: '100px' }}>
          <div className="spinner-dots"><div></div><div></div><div></div></div>
          <p>Loading session...</p>
        </div>
      </div>
    );
  }

  // 1. Join Workplace / Pending Flow (Onboarding Redesigned)
  // Strictly require "active" status to bypass this screen
  if (user.status !== "active" || !user.placeId) {
    return (
      <div className="staff-dashboard-container onboarding-v2">
        <header className="staff-header-simple">
          <div className="brand-logo">
            <div className="logo-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>
            </div>
            <span className="logo-text">Waitly Staff</span>
          </div>
          <button className="logout-text-btn" onClick={logout}>Logout</button>
        </header>

        <div className="onboarding-content-v2">
          {user.status !== "unassigned" ? (
            <div className="status-card-v2 pending">
              <div className="status-badge-v2">Pending Approval</div>
              <div className="status-header">
                <h2>Application Under Review</h2>
                <div className="queue-mgmt-tag">Queue Management System</div>
                <div className="pending-location-sub">
                  <p>You've applied to join</p>
                  <strong>{appliedPlace ? appliedPlace.name : "your workplace"}</strong>
                </div>
              </div>

              {user.application && (
                <div className="submitted-summary">
                  <div className="summary-item">
                    <div className="summary-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    </div>
                    <div className="summary-text">
                      <label>Identity</label>
                      <span>{user.application.fullName} ({user.application.staffId})</span>
                    </div>
                  </div>
                  <div className="summary-item">
                    <div className="summary-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                    </div>
                    <div className="summary-text">
                      <label>Role & Counter</label>
                      <span>{user.application.designation} — {user.application.counterName}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="pending-footer">
                <p>Administrators have been notified. Please wait for verification.</p>
                <div className="pending-actions">
                  <button className="btn-refresh-v2" onClick={() => loadUser()}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                    Refresh Status
                  </button>
                  <button className="btn-cancel-v2" onClick={cancelApplication}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="15"></line><line x1="15" y1="9" x2="9" y2="15"></line></svg>
                    Cancel Request
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="setup-flow">
              {onboardingStep !== "details" && onboardingStep !== "new-place" ? (
                <div className="find-workplace-step">
                  <div className="onboarding-hero-v2">
                    <div className="queue-mgmt-tag">Queue Management System</div>
                    <h1>Where do you work?</h1>
                    <p>Find or add your workplace to start managing queues.</p>
                  </div>

                  <div className="search-map-toggle">
                    <button
                      className={onboardingSearchMode ? "active" : ""}
                      onClick={() => setOnboardingSearchMode(true)}
                    >
                      Search
                    </button>
                    <button
                      className={!onboardingSearchMode ? "active" : ""}
                      onClick={() => setOnboardingSearchMode(false)}
                    >
                      Map View
                    </button>
                  </div>

                  {onboardingSearchMode ? (
                    <div className="search-pane">
                      <div className="search-bar-modern">
                        <input
                          type="text"
                          placeholder="Hospital, Bank, or Place Name..."
                          value={searchQuery}
                          onChange={e => { setSearchQuery(e.target.value); setSearchError(""); }}
                          onKeyDown={e => e.key === 'Enter' && searchPlaces()}
                        />
                        <button onClick={searchPlaces} disabled={searching} className="btn-search-modern">
                          {searching ? (
                            <svg className="spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
                          ) : (
                            "Search"
                          )}
                        </button>
                      </div>

                      {searchError && <div className="error-pill">{searchError}</div>}

                      <div className="search-results-modern">
                        {searchResults.map(p => (
                          <div
                            key={p._id}
                            className={`modern-result-item ${p.hasActiveStaff ? "disabled-place" : ""}`}
                            onClick={() => {
                              if (p.hasActiveStaff) return;
                              setSelectedPlaceForApp(p);
                              setOnboardingStep("details");
                            }}
                          >
                            <div className="res-icon">
                              {renderCategoryIcon(p.category)}
                            </div>
                            <div className="res-text">
                              <div className="res-name-row">
                                <h4>{p.name} {p.hasActiveStaff && <span className="already-managed-tag">Already Managed</span>}</h4>
                                <span className="cat-badge-mini">{p.category}</span>
                              </div>
                              <p>{p.address}</p>
                            </div>
                            <div className="res-arrow">
                              {p.hasActiveStaff ? (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
                              ) : (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                              )}
                            </div>
                          </div>
                        ))}
                        {searchResults.length === 0 && searchQuery && !searching && !searchError && (
                          <p className="empty-results">No places found. Use the map to add a new one?</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="map-pane-v2">
                      <div className="onboarding-map-container">
                        <MapView
                          userLocation={userLocation}
                          places={places}
                          selectedPlace={selectedPlaceForApp}
                          onSelectPlace={(p) => { setSelectedPlaceForApp(p); setOnboardingStep("details"); }}
                          addMode={true}
                          onMapSelect={(coords) => {
                            setNewPlaceData({ ...newPlaceData, lat: coords.lat, lng: coords.lng });
                            setOnboardingStep("new-place");
                          }}
                        />
                      </div>
                      <p className="map-instruction">Tap a pin to join, or tap anywhere else to <strong>Add New Workplace</strong>.</p>
                    </div>
                  )}
                </div>
              ) : onboardingStep === "details" ? (
                <div className="application-details-step">
                  <button className="back-link-v2" onClick={() => setOnboardingStep("find")}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                    Back
                  </button>
                  <div className="form-head-v2">
                    <h2>Workplace Details</h2>
                    <p>Joining: <strong>{selectedPlaceForApp?.name}</strong></p>
                  </div>

                  <form className="staff-app-form-v2" onSubmit={(e) => {
                    e.preventDefault();
                    if (selectedPlaceForApp.isNew) {
                      applyForPlace(e, true); // Special flag for new place
                    } else {
                      applyForPlace(e);
                    }
                  }}>
                    <div className="form-sections">
                      <div className="sec-title">Personal Details</div>
                      <div className="form-group-v2">
                        <label>Full Name</label>
                        <input
                          type="text"
                          required
                          value={appForm.fullName}
                          onChange={e => setAppForm({ ...appForm, fullName: e.target.value })}
                        />
                      </div>
                      <div className="form-grid-v2">
                        <div className="form-group-v2">
                          <label>Staff/Employee ID</label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: EMP-992"
                            value={appForm.staffId}
                            onChange={e => setAppForm({ ...appForm, staffId: e.target.value })}
                          />
                        </div>
                        <div className="form-group-v2">
                          <label>Designation</label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: Customer Agent"
                            value={appForm.designation}
                            onChange={e => setAppForm({ ...appForm, designation: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="sec-title mt-4">Workstation Assignment</div>
                      <div className="form-group-v2">
                        <label>Counter / Desk Name(s)</label>
                        <div className="multi-counter-list">
                          {appForm.counters.map((counter, index) => (
                            <div key={index} className="counter-input-row">
                              <input
                                type="text"
                                required
                                placeholder={`Ex: Counter ${String(index + 1).padStart(2, '0')}`}
                                value={counter}
                                onChange={e => {
                                  const newCounters = [...appForm.counters];
                                  newCounters[index] = e.target.value;
                                  setAppForm({ ...appForm, counters: newCounters });
                                }}
                              />
                              {appForm.counters.length > 1 && (
                                <button
                                  type="button"
                                  className="btn-remove-counter"
                                  onClick={() => {
                                    const newCounters = appForm.counters.filter((_, i) => i !== index);
                                    setAppForm({ ...appForm, counters: newCounters });
                                  }}
                                >
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                              )}
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          className="btn-add-counter-clean"
                          onClick={() => setAppForm({ ...appForm, counters: [...appForm.counters, ""] })}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                          Add Another Counter
                        </button>

                        <span className="input-hint">Specify the distinct desks or counters you will manage.</span>
                      </div>
                    </div>

                    <button type="submit" className="btn-final-submit" disabled={applying}>
                      {applying ? (
                        <svg className="spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                      )}
                      {applying ? "Submitting Application..." : "Submit Join Request"}
                    </button>
                  </form>
                </div>
              ) : onboardingStep === "new-place" ? (
                <div className="application-details-step">
                  <button className="back-link-v2" onClick={() => setOnboardingStep("find")}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                    Back
                  </button>
                  <div className="form-head-v2">
                    <h2>Add & Join New Workplace</h2>
                    <p>Enter details for the new location you've selected on the map.</p>
                  </div>

                  <div className="new-place-form-v2">
                    <div className="sec-title">Place Information</div>
                    <div className="form-group-v2">
                      <label>Place Name</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: City Hospital, Prime Bank"
                        value={newPlaceData.name}
                        onChange={e => setNewPlaceData({ ...newPlaceData, name: e.target.value })}
                      />
                    </div>
                    <div className="form-grid-v2">
                      <div className="form-group-v2">
                        <label>Category</label>
                        <select
                          value={newPlaceData.category}
                          onChange={e => setNewPlaceData({ ...newPlaceData, category: e.target.value })}
                        >
                          <option value="bank">Bank</option>
                          <option value="hospital">Hospital</option>
                          <option value="government">Government Office</option>
                          <option value="restaurant">Restaurant</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div className="form-group-v2">
                        <label>Location (Lat, Lng)</label>
                        <input type="text" disabled value={`${newPlaceData.lat?.toFixed(4)}, ${newPlaceData.lng?.toFixed(4)}`} />
                      </div>
                    </div>
                    <div className="form-group-v2">
                      <label>Address</label>
                      <input
                        type="text"
                        placeholder="Street, Area, City"
                        value={newPlaceData.address}
                        onChange={e => setNewPlaceData({ ...newPlaceData, address: e.target.value })}
                      />
                    </div>

                    <div className="sec-divider"></div>

                    <button
                      className="btn-final-submit"
                      disabled={!newPlaceData.name}
                      onClick={() => {
                        setSelectedPlaceForApp({
                          name: newPlaceData.name,
                          address: newPlaceData.address,
                          category: newPlaceData.category,
                          location: {
                            lat: newPlaceData.lat,
                            lng: newPlaceData.lng
                          },
                          isNew: true
                        });
                        setOnboardingStep("details");
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="19" y1="8" x2="19" y2="14"></line><line x1="22" y1="11" x2="16" y2="11"></line></svg>
                      Next: Staff Details
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. Counter Selection Flow
  if (!selectedCounter) {
    return (
      <div className="staff-setup-page">
        <div className="setup-container">
          <div className="setup-header-section">
            <div className="glass-brand">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              <span>Staff Portal</span>
            </div>
            <h1>Welcome back, <span className="highlight-blue">{user?.username}</span></h1>
            <p className="subtitle">Initialize your session for <strong>{placeName}</strong></p>
          </div>

          <div className="setup-main-card">
            <div className="setup-sidebar">
              <div className="protocol-section">
                <div className="p-header">
                  <span className="p-badge">Service Protocol</span>
                  <h3 className="p-title">Quality Standards</h3>
                </div>

                <div className="protocol-grid">
                  <div className="p-step-compact">
                    <span className="p-num-pill">01</span>
                    <div className="p-text">
                      <strong>Verify First</strong>
                      <p>Scan QR or match code before service.</p>
                    </div>
                  </div>
                  <div className="p-step-compact">
                    <span className="p-num-pill">02</span>
                    <div className="p-text">
                      <strong>Complete Last</strong>
                      <p>Mark 'Complete' only after finishing.</p>
                    </div>
                  </div>
                </div>

                <div className="strict-warning-compact">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                  <span>Strict adherence to queue integrity is required.</span>
                </div>
              </div>
            </div>

            <div className="setup-content-refined">
              <div className="selection-area-compact">
                <div className="s-header-compact">
                  <h2>Select Counter</h2>
                  <p>Choose your workspace for today</p>
                </div>

                <div className="counter-list-compact">
                  {counters.length > 0 ? (
                    counters.map((counter, i) => (
                      <button key={i} className="counter-row-chip" onClick={() => setSelectedCounter(counter.name)}>
                        <div className="chip-left">
                          <div className="chip-icon-small">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                          </div>
                          <div className="chip-info-compact">
                            <span className="chip-name-bold">{counter.name}</span>
                            <span className="chip-status-active">Ready for service</span>
                          </div>
                        </div>
                        <div className="chip-action">
                          <span className="btn-label">Connect</span>
                          <span className="chip-arrow-small">→</span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="no-counters-setup">
                      {loadingCounters ? (
                        <div className="loading-inline">
                          <div className="spinner-mini"></div>
                          <span>Loading workspace...</span>
                        </div>
                      ) : "No active counters available."}
                      {!loadingCounters && <button onClick={fetchCounters} className="refresh-link">Retry Connection</button>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <footer className="setup-footer-slim">
            <p>&copy; 2026 Waitly Digital Systems. All terminal actions are logged.</p>
          </footer>


        </div>
      </div>
    );
  }

  // 3. Main Dashboard
  const displayTicket = inspectingTicket || currentTicket;

  return (
    <div className="staff-dashboard-container">
      <div className="dashboard-content-wrapper" onClick={() => setShowProfile(false)}>
        <div className="verification-card">
          <div className="vc-header-info">
            <div className="vc-header-main">
              <h1 className="vc-place-name">{placeName}</h1>
              <div className="vc-session-controls">
                <span className={`crowd-badge ${crowdData.level.toLowerCase()}`} title={`Load: ${crowdData.activeCount}/${crowdData.dailyCapacity}`}>
                  {crowdData.level} Crowd
                </span>
                <span className="counter-tag">{selectedCounter}</span>
                <button className="vc-action-btn" onClick={() => { fetchAllTokens(); setShowTokensModal(true); }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span>History</span>
                </button>
                <button className="vc-action-btn" onClick={() => setShowScheduleModal(true)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  <span>Settings</span>
                </button>
                <button className="vc-action-btn danger" onClick={() => window.location.reload()}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4m7 14l5-5-5-5m5 5H9"></path>
                  </svg>
                  <span>Leave</span>
                </button>
              </div>
            </div>
            <p className="vc-sub">{placeAddress}</p>
          </div>

          <div className="vc-grid">
            <div className="vc-col-left">
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: '10px' }}>
                <span className="vc-label">{inspectingTicket ? "INSPECTING TOKEN" : "CURRENT TOKEN"}</span>
                {inspectingTicket && <button className="return-queue-btn" onClick={() => setInspectingTicket(null)}>Back to Queue</button>}
              </div>
              <div className="vc-token-code">
                {loading ? (
                  <div className="clean-message" style={{ padding: '20px' }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: '800' }}>Calling Next...</span>
                    <div className="spinner-small" style={{ margin: '8px auto 0', width: '20px', height: '20px', borderWidth: '2px' }}></div>
                  </div>
                ) : displayTicket ? (
                  displayTicket.tokenCode
                ) : queueStats.waiting > 0 ? (
                  <div className="clean-message" style={{ padding: '20px' }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: '800', display: 'block', marginBottom: '8px' }}>Ready to Serve</span>
                    <button className="vc-btn-call" onClick={handleNextTicket} style={{ width: 'auto', padding: '8px 24px', fontSize: '0.9rem' }}>Start Queue</button>
                  </div>
                ) : (
                  <div className="clean-message" style={{
                    padding: '24px',
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)',
                    borderRadius: '16px',
                    border: '1px solid #dcfce7'
                  }}>
                    <div style={{
                      fontSize: '1.25rem',
                      color: '#16a34a',
                      fontWeight: '900',
                      letterSpacing: '0.05em',
                      marginBottom: '6px'
                    }}>✓ ALL CAUGHT UP</div>
                    <span style={{
                      fontSize: '0.85rem',
                      color: '#64748b',
                      fontWeight: '700',
                      background: '#f8fafc',
                      padding: '4px 12px',
                      borderRadius: '8px',
                      border: '1px solid #f1f5f9',
                      display: 'inline-block',
                      letterSpacing: '0.05em'
                    }}>No tokens in queue.</span>
                  </div>
                )}
              </div>

              {!loading && displayTicket && (
                <div style={{
                  background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
                  padding: '16px 20px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  marginTop: '16px',
                  marginBottom: '20px'
                }}>
                  <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: '50px' }}>
                      Name:
                    </span>
                    <span style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a' }}>
                      {displayTicket.userName || "Guest User"}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: '50px' }}>
                      Work:
                    </span>
                    <span style={{
                      display: 'inline-block',
                      background: '#eff6ff',
                      color: '#2563eb',
                      padding: '4px 12px',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: '700',
                      border: '1px solid #dbeafe'
                    }}>
                      {getCategoryName(displayTicket.category)}
                    </span>
                  </div>
                </div>
              )}



              <div className={`vc-qr-area ${isVerified ? "verified-border" : ""} ${!displayTicket ? "clean" : ""}`}>
                {displayTicket ? (
                  isVerified ? (
                    <div className="verified-status-panel">
                      <div className="verified-icon">✅</div>
                      <h3>{displayTicket.status === "Completed" ? "ALREADY VERIFIED" : "TOKEN VERIFIED"}</h3>
                      <p>{displayTicket.status === "Completed" ? "This token was previously completed" : "Client is cleared for service"}</p>
                    </div>
                  ) : <QRCode value={displayTicket.tokenCode} size={150} />
                ) : (
                  <div className="empty-state-icon">
                    {/* Coffee/Relax Icon */}
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
                      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
                      <line x1="6" y1="1" x2="6" y2="4"></line>
                      <line x1="10" y1="1" x2="10" y2="4"></line>
                      <line x1="14" y1="1" x2="14" y2="4"></line>
                    </svg>
                  </div>
                )}
              </div>
            </div>

            <div className="vc-col-right">
              <span className="vc-label" style={{ marginBottom: '20px', display: 'block' }}>TODAY'S QUEUE STATUS</span>
              <div className="vc-stat-row"><span>Waiting</span><span className="vc-val blue">{queueStats.waiting}</span></div>

              <div className="vc-stat-row"><span>Completed</span><span className="vc-val green">{queueStats.completed}</span></div>
              <div className="vc-stat-row"><span>Skipped</span><span className="vc-val red" style={{ color: '#ef4444' }}>{queueStats.skipped}</span></div>
              <div className="vc-stat-row"><span>Active Slotted</span><span className="vc-val" style={{ color: '#ea580c' }}>{queueStats.slotted}</span></div>
              <div className="vc-stat-row" style={{ borderTop: '2px dashed #f1f5f9', marginTop: '8px', paddingTop: '12px' }}>
                <span style={{ fontWeight: '700', color: '#0f172a' }}>Total Tokens</span>
                <span className="vc-val" style={{ color: '#0f172a' }}>
                  {queueStats.waiting + queueStats.completed + queueStats.skipped + (currentTicket ? 1 : 0)}
                </span>
              </div>
            </div>
          </div>

          <div className={`vc-actions ${inspectingTicket ? 'inspect-mode' : ''}`}>
            {displayTicket ? (
              !inspectingTicket ? (
                <>
                  <button className="vc-btn-complete" onClick={() => handleUpdateStatus("Completed")}>Mark as Completed</button>
                  <button className="vc-btn-skip" onClick={() => handleUpdateStatus("Skipped")}>Skip</button>
                </>
              ) : <div className="inspect-warning-msg">Queue actions disabled in inspect mode</div>
            ) : null /* Hide buttons if no ticket, the main area shows 'Start Queue' or 'No Tokens' */}
            <button
              className="vc-btn-scan"
              onClick={() => setShowScanner(true)}
              disabled={!displayTicket}
              title={!displayTicket ? "Call a ticket first to enable scanning" : "Verify present token"}
            >
              Scan Token
            </button>
          </div>
        </div>
      </div>

      {
        showTokensModal && (
          <div className="profile-modal-overlay" onClick={() => setShowTokensModal(false)}>
            <div className="profile-card tokens-list-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header-premium">
                <div className="modal-title-row">
                  <h2 className="modal-title-premium">Queue Snapshot</h2>
                  <button className="close-profile-btn" onClick={() => setShowTokensModal(false)}>&times;</button>
                </div>
                <div className="modal-stats-grid">
                  <div className="stat-pill-premium">
                    <span className="stat-pill-label">All Time Waiting</span>
                    <span className="stat-pill-value blue">{allTokens.serving.length + allTokens.waiting.length}</span>
                  </div>
                  <div className="stat-pill-premium">
                    <span className="stat-pill-label">Waiting Today</span>
                    <span className="stat-pill-value orange">{allTokens.waiting.filter(t => t.willServeToday).length}</span>
                  </div>
                  <div className="stat-pill-premium">
                    <span className="stat-pill-label">All Time Completed</span>
                    <span className="stat-pill-value purple">{allTokens.history.filter(t => t.status === 'Completed').length}</span>
                  </div>
                  <div className="stat-pill-premium">
                    <span className="stat-pill-label">Completed Today</span>
                    <span className="stat-pill-value green">{allTokens.history.filter(t => t.status === 'Completed' && t.isToday).length}</span>
                  </div>
                  <div className="stat-pill-premium">
                    <span className="stat-pill-label">Counter Name</span>
                    <span className="stat-pill-value">{selectedCounter}</span>
                  </div>
                </div>
              </div>

              <div className="tokens-modal-scroll-area">
                <div className="tokens-section">
                  <h3 className="section-title-modern">
                    <span className="dot pulse-blue"></span> Active Queue
                  </h3>
                  <div className="tokens-table-container">
                    <table className="tokens-table">
                      <thead>
                        <tr><th>Position</th><th>Token</th><th>Customer</th><th>Path</th><th>Expect Flow</th><th>Action</th></tr>
                      </thead>
                      <tbody>
                        {allTokens.serving.map(t => (
                          <tr key={t._id} className="row-serving-highlight row-serving-today">
                            <td data-label="Position"><span className="badge-serving">SERVING</span></td>
                            <td data-label="Token"><span className="token-code-pill">{t.tokenCode}</span></td>
                            <td data-label="Customer" className="user-name-cell">
                              <div style={{ fontWeight: '700' }}>{t.userName || "Guest User"}</div>
                              <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', marginTop: '2px' }}>{getCategoryName(t.category)}</div>
                            </td>
                            <td data-label="Path">{t.timeSlotLabel ? <span className="type-slotted">Slotted</span> : <span className="type-walkin">Walk-in</span>}</td>
                            <td data-label="Expect Flow"><span className="live-badge">Live</span></td>
                            <td data-label="Action"><button className="view-token-btn" onClick={() => { setInspectingTicket(t); setShowTokensModal(false); }}>Inspect</button></td>
                          </tr>
                        ))}

                        {allTokens.waiting.map(t => (
                          <tr key={t._id} className={t.willServeToday ? 'row-serving-today' : ''}>
                            <td data-label="Position"><span style={{ fontWeight: '700', color: '#94a3b8' }}>#{t.positionOnList}</span></td>
                            <td data-label="Token"><span className="token-code-pill" style={{ background: '#f8fafc', color: '#64748b' }}>{t.tokenCode}</span></td>
                            <td data-label="Customer" className="user-name-cell">{t.userName || "Guest User"}</td>
                            <td data-label="Path">{t.timeSlotLabel ? <span className="type-slotted">Slotted</span> : <span className="type-walkin">Walk-in</span>}</td>
                            <td data-label="Expect Flow" style={{ fontWeight: '500' }}>~{formatWaitTime(t.estimatedWait)}</td>
                            <td data-label="Action"><button className="view-token-btn" onClick={() => { setInspectingTicket(t); setShowTokensModal(false); }}>Inspect</button></td>
                          </tr>
                        ))}

                        {allTokens.serving.length === 0 && allTokens.waiting.length === 0 && (
                          <tr><td colSpan="6" className="empty-row">No active sessions in queue</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="tokens-section" style={{ marginTop: '32px' }}>
                  <h3 className="section-title-modern gray">All Time History</h3>
                  <div className="tokens-table-container">
                    <table className="tokens-table">
                      <thead>
                        <tr><th>Token No.</th><th>Type</th><th>Customer</th><th>Status</th><th>Timestamp</th><th>Action</th></tr>
                      </thead>
                      <tbody>
                        {allTokens.history.map(t => (
                          <tr key={t._id} className={t.status === "Serving" ? "row-serving-today" : ""}>
                            <td data-label="Token No.">
                              <span className="token-code-pill">{t.tokenCode}</span>
                              {t.status === "Serving" && <span className="serving-today-badge">Live</span>}
                            </td>
                            <td data-label="Type">
                              <span className={`type-badge ${t.scheduledTime ? 'slotted' : 'walkin'}`}>
                                {t.scheduledTime ? `Slot ${t.timeSlotLabel || ""}` : "Walk-in"}
                              </span>
                            </td>
                            <td data-label="Customer">
                              <div style={{ fontWeight: '700', color: '#1e293b' }}>{t.userName || "Guest User"}</div>
                              <div style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>{getCategoryName(t.category)}</div>
                            </td>
                            <td data-label="Status">
                              <span className={`status-pill ${t.status.toLowerCase()}`}>{t.status}</span>
                            </td>
                            <td data-label="Timestamp" style={{ color: '#64748b', fontSize: '0.85rem' }}>{formatRelativeDate(t.completedAt || t.updatedAt)}</td>
                            <td data-label="Action"><button className="view-token-btn" onClick={() => { setInspectingTicket(t); setShowTokensModal(false); }}>Inspect</button></td>
                          </tr>
                        ))}
                        {allTokens.history.length === 0 && (
                          <tr><td colSpan="6" className="empty-row">No history recorded yet</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {
        showProfile && (
          <div className="profile-modal-overlay" onClick={() => setShowProfile(false)}>
            <div className="profile-card" onClick={e => e.stopPropagation()}>
              <button className="close-profile-btn" onClick={() => setShowProfile(false)}>×</button>
              <div className="profile-avatar">{user?.username ? user.username.charAt(0).toUpperCase() : "U"}</div>
              <h2 className="profile-name">{user?.username}</h2>
              <p className="profile-role">{user?.role} Account</p>
              <div style={{ marginTop: '20px' }}>
                <div className="profile-detail-row"><span className="profile-detail-label">Email</span><span className="profile-detail-value">{user?.email}</span></div>
                <div className="profile-detail-row"><span className="profile-detail-label">Status</span><span className="profile-detail-value" style={{ textTransform: 'capitalize', color: '#16a34a' }}>{user?.status}</span></div>
              </div>
            </div>
          </div>
        )
      }

      {showScanner && <ScannerModal onClose={() => setShowScanner(false)} onScan={handleScanSuccess} />}
      {
        showScheduleModal && (
          <CounterSettingsModal
            onClose={() => setShowScheduleModal(false)}
            counterName={selectedCounter}
            getAuthHeaders={getAuthHeaders}
            currentConfig={activeCounterConfig || counters.find(c => c.name === selectedCounter)}
            avgTimes={avgTimes}
            fetchStatus={fetchStatus}
          />
        )
      }

    </div >
  );
}

function CounterSettingsModal({ onClose, counterName, getAuthHeaders, currentConfig, avgTimes, fetchStatus }) {
  const [openingTime, setOpeningTime] = useState(currentConfig?.openingTime || "09:00");
  const [closingTime, setClosingTime] = useState(currentConfig?.closingTime || "17:00");
  const [isClosed, setIsClosed] = useState(currentConfig?.isClosed || false);
  const [saving, setSaving] = useState(false);

  // Categories State
  const [categories, setCategories] = useState(
    currentConfig?.services?.length > 0
      ? currentConfig.services.map(s => ({ ...s }))
      : [{ categoryId: "general", name: "General Service", staffAvgTime: 5 }]
  );

  const addCategory = () => {
    setCategories([...categories, { categoryId: `cat_${Date.now()}`, name: "New Service", staffAvgTime: 5 }]);
  };

  const removeCategory = (id) => {
    if (categories.length <= 1) return;
    setCategories(categories.filter(c => c.categoryId !== id));
  };

  const updateCategory = (id, field, value) => {
    setCategories(categories.map(c => c.categoryId === id ? { ...c, [field]: value } : c));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Update Schedule & Categories
      const res = await fetch(`${API_BASE}/api/staff/counters/update-metrics`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          counterName,
          openingTime,
          closingTime,
          isClosed,
          categories: categories.map(c => ({
            name: c.name,
            staffAvgTime: c.staffAvgTime,
            categoryId: c.categoryId
          }))
        }),
        credentials: "include"
      });

      if (res.ok) {
        fetchStatus();
        onClose();
      } else {
        alert("Settings failed to save.");
      }
    } catch (e) {
      console.error(e);
      alert("Error saving settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px', width: '95%', padding: '32px', maxHeight: '90vh', overflowY: 'auto' }}>
        <button className="close-profile-btn" onClick={onClose}>×</button>
        <h2 style={{ marginBottom: '8px', fontSize: '1.6rem', fontWeight: '900' }}>Intelligence Center</h2>
        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '32px' }}>Configure categories, speed, and working hours.</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
          {/* Left Column: Categories */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Service Categories</h3>
              <button onClick={addCategory} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '4px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}>+ Add</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {categories.map((cat) => (
                <div key={cat.categoryId} style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <input
                      value={cat.name}
                      onChange={e => updateCategory(cat.categoryId, 'name', e.target.value)}
                      placeholder="Category Name"
                      style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: '600' }}
                    />
                    <button onClick={() => removeCategory(cat.categoryId)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', width: '32px', borderRadius: '6px', cursor: 'pointer', fontWeight: '800' }}>×</button>
                  </div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px' }}>Goal: {cat.staffAvgTime} mins</label>
                  <input
                    type="range"
                    min="1"
                    max="60"
                    value={cat.staffAvgTime}
                    onChange={e => updateCategory(cat.categoryId, 'staffAvgTime', e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Schedule & Status */}
          <div>
            <h3 style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '800', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Working Hours</h3>
            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '6px', fontWeight: '700' }}>OPEN FROM</label>
                  <input type="time" value={openingTime} onChange={e => setOpeningTime(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '6px', fontWeight: '700' }}>CLOSE AT</label>
                  <input type="time" value={closingTime} onChange={e => setClosingTime(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} />
                </div>
              </div>

              <div style={{ background: isClosed ? '#fff1f2' : '#f0fdf4', padding: '12px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', border: `1px solid ${isClosed ? '#fecaca' : '#bbf7d0'}` }}>
                <input type="checkbox" id="isClosed" checked={isClosed} onChange={e => setIsClosed(e.target.checked)} style={{ width: '18px', height: '18px' }} />
                <label htmlFor="isClosed" style={{ fontSize: '0.85rem', fontWeight: '800', color: isClosed ? '#e11d48' : '#16a34a' }}>
                  {isClosed ? "QUEUE IS CLOSED" : "QUEUE IS OPEN"}
                </label>
              </div>
            </div>

            <div style={{ background: '#f1f5f9', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
              <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '800', display: 'block', marginBottom: '8px' }}>SYSTEM PULSE</span>
              <div style={{ fontSize: '2rem', fontWeight: '900', color: '#0f172a', lineHeight: '1' }}>{avgTimes.final}m</div>
              <span style={{ fontSize: '0.65rem', color: '#3b82f6', fontWeight: '800' }}>SMART HYBRID AVERAGE</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '40px', display: 'flex', gap: '12px' }}>
          <button onClick={handleSave} disabled={saving} style={{ flex: 1, background: '#2563eb', color: '#fff', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: '800', fontSize: '1rem', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving..." : "Apply Configuration"}
          </button>
          <button onClick={onClose} style={{ padding: '14px 24px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', fontWeight: '700', color: '#64748b', cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function ScannerModal({ onClose, onScan }) {
  const [error, setError] = useState(null);

  useEffect(() => {
    const html5QrCode = new Html5Qrcode("qr-reader");
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    const startCamera = async () => {
      try {
        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            html5QrCode.stop().then(() => onScan(decodedText)).catch(err => console.error(err));
          },
          () => { }
        );
      } catch (err) {
        console.error("Back camera failed, trying front...", err);
        try {
          await html5QrCode.start(
            { facingMode: "user" },
            config,
            (decodedText) => {
              html5QrCode.stop().then(() => onScan(decodedText)).catch(err => console.error(err));
            },
            () => { }
          );
        } catch (err2) {
          console.error("All cameras failed", err2);
          const errMsg = err2.toString().toLowerCase();
          if (errMsg.includes("notallowederror") || errMsg.includes("permission denied")) {
            setError("PermissionDenied");
          } else {
            setError("NotFound");
          }
        }
      }
    };

    startCamera();

    return () => {
      try {
        if (html5QrCode.isScanning) {
          html5QrCode.stop().catch(() => { });
        }
      } catch (e) { }
    };
  }, []);

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-card scanner-modal-card" onClick={e => e.stopPropagation()}>
        <button className="close-profile-btn" onClick={onClose}>×</button>
        <h2 style={{ marginBottom: '20px' }}>Verify Token</h2>

        {error === "PermissionDenied" ? (
          <div className="camera-error-container">
            <div className="error-visual">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5" /><line x1="18" y1="9" x2="22" y2="5" /><line x1="22" y1="9" x2="18" y2="5" /><path d="M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
              </svg>
            </div>
            <h3>Camera Access Blocked</h3>
            <p>Waitly cannot access your camera to scan tokens.</p>

            <div className="instruction-guide">
              <p className="guide-title">How to enable:</p>
              <div className="guide-step">
                <span className="step-num">1</span>
                <span>Click the <strong>Lock (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginBottom: '2px' }}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>)</strong> or <strong>Settings</strong> icon in the address bar.</span>
              </div>
              <div className="guide-step">
                <span className="step-num">2</span>
                <span>Find <strong>Camera</strong> and toggle it to <strong>Allow</strong>.</span>
              </div>
              <div className="guide-step">
                <span className="step-num">3</span>
                <span>Close this modal and try scanning again.</span>
              </div>
            </div>
            <button className="vc-btn-call" onClick={onClose} style={{ width: '100%', marginTop: '10px' }}>Close</button>
          </div>
        ) : error === "NotFound" ? (
          <div className="camera-error-container">
            <div className="error-visual">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            </div>
            <h3>No Camera Detected</h3>
            <p>We couldn't find a camera on this device.</p>
            <button className="vc-btn-call" onClick={onClose} style={{ width: '100%', marginTop: '20px' }}>Close</button>
          </div>
        ) : (
          <>
            <div id="qr-reader" style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', border: '2px solid #f1f5f9' }}></div>
            <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#64748b', marginTop: '15px', fontWeight: '500' }}>
              Position the token QR code within the frame
            </p>
          </>
        )}
      </div>
    </div>
  );
}
