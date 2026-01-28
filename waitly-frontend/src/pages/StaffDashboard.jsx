import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import API_BASE from "../config/api";
import { io } from "socket.io-client";
import QRCode from 'react-qr-code';
import { Html5Qrcode } from "html5-qrcode";
import "./StaffDashboard.css";

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

  const getAuthHeaders = () => {
    const token = localStorage.getItem('waitly_token');
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  };

  const formatWaitTime = (mins) => {
    if (!mins || mins <= 0) return "0m";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0) return `${h}h : ${m}m`;
    return `${m}m`;
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
      setAllTokens({
        serving: data.serving || [],
        waiting: data.waiting || [],
        history: data.history || []
      });
    } catch (err) {
      console.error("Failed to fetch all tokens", err);
      showNotification("Failed to fetch all tokens", "error");
    }
  };

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

  const applyForPlace = async (placeId) => {
    setApplying(placeId);
    try {
      const res = await fetch(`${API_BASE}/api/staff/places/apply`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ placeId }),
        credentials: "include"
      });
      if (res.ok) {
        showNotification("Application sent! Waiting for admin approval.", "success");
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

  // 1. Join Workplace / Pending Flow (Onboarding)
  if (user.status === "unassigned" || user.status === "applied" || user.status === "pending" || !user.placeId) {
    return (
      <div className="staff-dashboard-container">
        <header className="staff-header-simple">
          <div className="brand-logo">
            <div className="logo-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>
            </div>
            <span className="logo-text">Waitly Staff</span>
          </div>
          <button className="logout-text-btn" onClick={logout}>Logout</button>
        </header>

        <div className="onboarding-content">
          <div className="onboarding-hero">
            <h1>Welcome to Waitly Staff Portal</h1>
            <p>The professional way to manage customer queues, reduce wait times, and improve service efficiency.</p>
          </div>

          <div className="onboarding-steps">
            <div className="step-card">
              <div className="step-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              </div>
              <h3>Find Your Workplace</h3>
              <p>Search for your organization or branch in our database using the search bar below.</p>
            </div>
            <div className="step-card">
              <div className="step-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
              </div>
              <h3>Request Access</h3>
              <p>Select your workplace and submit a request. Your admin will verify your identity.</p>
            </div>
            <div className="step-card">
              <div className="step-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
              </div>
              <h3>Manage Queues</h3>
              <p>Once approved, you can call tokens, track wait times, and serve customers efficiently.</p>
            </div>
          </div>

          <div className="workplace-action-area">
            {(user.status === "applied" || user.status === "pending") ? (
              <div className="status-card pending">
                <div className="status-icon-pulse">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                </div>
                <div className="status-info">
                  <h3>Application Pending</h3>
                  <p>You have requested access to <strong>{appliedPlace ? appliedPlace.name : "your workplace"}</strong>.</p>
                  <p className="status-sub">Please wait for an administrator to approve your request.</p>
                </div>
                <div className="status-actions">
                  <button className="btn-refresh" onClick={() => loadUser()}>Check Status</button>
                  <button className="btn-cancel" onClick={cancelApplication}>Cancel Request</button>
                </div>
              </div>
            ) : (
              <div className="search-section">
                <h2>Join an Existing Workplace</h2>
                <div className="search-bar-large">
                  <input
                    type="text"
                    placeholder="Search by hospital, bank, or place name..."
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setSearchError(""); }}
                    onKeyDown={e => e.key === 'Enter' && searchPlaces()}
                  />
                  <button onClick={searchPlaces} disabled={searching}>
                    {searching ? "Searching..." : "Search"}
                  </button>
                </div>

                {searchError && <div className="error-banner">{searchError}</div>}

                <div className="search-results-list">
                  {searchResults.map(p => (
                    <div key={p._id} className="result-item">
                      <div className="result-info">
                        <h4>{p.name}</h4>
                        <p>{p.address}</p>
                        <span className="category-tag">{p.category}</span>
                      </div>
                      <button
                        className="btn-apply"
                        disabled={applying === p._id || p.hasActiveStaff}
                        onClick={() => applyForPlace(p._id)}
                        style={p.hasActiveStaff ? { background: '#f1f5f9', color: '#94a3b8', borderColor: '#e2e8f0' } : {}}
                      >
                        {p.hasActiveStaff
                          ? "Already Approved"
                          : applying === p._id
                            ? "Sending..."
                            : "Request for Queue Management"
                        }
                      </button>
                    </div>
                  ))}
                  {searchResults.length === 0 && searchQuery && !searching && !searchError && (
                    <p className="no-results-text">No places found. Try a different specific keyword.</p>
                  )}
                </div>
              </div>
            )}
          </div>
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
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              <span>Staff Portal</span>
            </div>
            <h1>Welcome back, {user?.username}</h1>
            <p>Initialize your session for <strong>{placeName}</strong></p>
          </div>

          <div className="setup-main-card">
            <div className="setup-sidebar">
              <div className="protocol-section">
                <div className="p-header">
                  <span className="p-badge">Service Protocol</span>
                </div>
                <h3>Quality Standards</h3>
                <div className="protocol-steps">
                  <div className="p-step">
                    <div className="p-num">01</div>
                    <div className="p-info">
                      <strong>Verify First</strong>
                      <p>Scan QR or match code before starting any service.</p>
                    </div>
                  </div>
                  <div className="p-step">
                    <div className="p-num">02</div>
                    <div className="p-info">
                      <strong>Complete Last</strong>
                      <p>Only mark 'Complete' after work is fully finished.</p>
                    </div>
                  </div>
                </div>
                <div className="strict-warning">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                  <span>Strict adherence to queue integrity is required.</span>
                </div>
              </div>
            </div>

            <div className="setup-content">
              <div className="selection-area">
                <div className="s-header">
                  <h2>Select Counter</h2>
                  <p>Choose your workspace for today</p>
                </div>

                <div className="counter-options-grid">
                  {counters.length > 0 ? (
                    counters.map((counter, i) => (
                      <button key={i} className="modern-counter-chip" onClick={() => setSelectedCounter(counter.name)}>
                        <div className="chip-icon">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                        </div>
                        <div className="chip-details">
                          <span className="chip-name">{counter.name}</span>
                          <span className="chip-status">Ready for service</span>
                        </div>
                        <div className="chip-arrow">→</div>
                      </button>
                    ))
                  ) : (
                    <div className="no-counters-setup">
                      {loadingCounters ? "Loading workspace..." : "No active counters available."}
                      {!loadingCounters && <button onClick={fetchCounters} className="refresh-link">Retry Connection</button>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="setup-footer">
            <p>© 2026 Waitly Digital Systems. All terminal actions are logged.</p>
          </div>
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
                <span className="counter-tag">{selectedCounter}</span>
                <button className="vc-text-btn" onClick={() => { fetchAllTokens(); setShowTokensModal(true); }}>All Tokens</button>
                <button className="vc-text-btn" onClick={() => setShowScheduleModal(true)}>Schedule</button>
                <button className="vc-text-btn danger" onClick={() => window.location.reload()}>Change Counter</button>
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
                  <div className="clean-message">
                    <span>Calling Next...</span>
                    <div className="spinner-small" style={{ margin: '10px 0 0', width: '24px', height: '24px', borderWidth: '2px' }}></div>
                  </div>
                ) : displayTicket ? (
                  displayTicket.tokenCode
                ) : queueStats.waiting > 0 ? (
                  <div className="clean-message">
                    <span>Ready to Serve</span>
                    <button className="vc-btn-call" onClick={handleNextTicket} style={{ marginTop: '16px', width: 'auto', padding: '10px 32px', fontSize: '1rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>Start Queue</button>
                  </div>
                ) : (
                  <div className="clean-message">
                    <span>No Tokens in Queue</span>
                    <span className="clean-subtext">You're all caught up!</span>
                  </div>
                )}
              </div>

              {!loading && displayTicket && (
                <div style={{ textAlign: 'center', marginBottom: '20px', marginTop: '-10px' }}>
                  <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#1e293b', margin: '0 0 2px 0' }}>
                    {displayTicket.userName || "Guest User"}
                  </h2>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700', margin: 0, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Customer Identity
                  </p>
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
              <span className="vc-label">QUEUE STATUS</span>
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

      {showTokensModal && (
        <div className="profile-modal-overlay" onClick={() => setShowTokensModal(false)}>
          <div className="profile-card tokens-list-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px', width: '95%' }}>
            <button className="close-profile-btn" onClick={() => setShowTokensModal(false)}>×</button>
            <h2 className="modal-title">Queue Overview - {selectedCounter}</h2>

            <div className="tokens-modal-scroll-area" style={{ maxHeight: '75vh', overflowY: 'auto', paddingBottom: '20px' }}>

              {/* SECTION 1: LIVE QUEUE (In Order) */}
              <div className="tokens-section">
                <h3 className="section-title-modern">
                  <span className="dot pulse-blue"></span> Live Queue (Serving & Next)
                </h3>
                <div className="tokens-table-container">
                  <table className="tokens-table">
                    <thead>
                      <tr><th>Order</th><th>Code</th><th>Name</th><th>Type</th><th>Estimated In</th><th>Action</th></tr>
                    </thead>
                    <tbody>
                      {/* Current Serving */}
                      {allTokens.serving.map(t => (
                        <tr key={t._id} className="row-serving-highlight">
                          <td><span className="badge-serving">SERVING</span></td>
                          <td className="token-code-cell">{t.tokenCode}</td>
                          <td style={{ fontWeight: '500' }}>{t.userName || "Guest"}</td>
                          <td>{t.timeSlotLabel ? <span className="type-slotted">Priority ({t.timeSlotLabel})</span> : <span className="type-walkin">Walk-in</span>}</td>
                          <td><span className="live-badge">Now</span></td>
                          <td><button className="view-token-btn" onClick={() => { setInspectingTicket(t); setShowTokensModal(false); }}>Inspect</button></td>
                        </tr>
                      ))}

                      {/* Waiting in Order */}
                      {allTokens.waiting.map(t => (
                        <tr key={t._id}>
                          <td style={{ fontWeight: 'bold', color: '#64748b' }}>#{t.positionOnList}</td>
                          <td className="token-code-cell">{t.tokenCode}</td>
                          <td style={{ fontWeight: '500' }}>{t.userName || "Guest"}</td>
                          <td>{t.timeSlotLabel ? <span className="type-slotted">Priority ({t.timeSlotLabel})</span> : <span className="type-walkin">Walk-in</span>}</td>
                          <td>~{formatWaitTime(t.estimatedWait)}</td>
                          <td><button className="view-token-btn" onClick={() => { setInspectingTicket(t); setShowTokensModal(false); }}>Inspect</button></td>
                        </tr>
                      ))}

                      {allTokens.serving.length === 0 && allTokens.waiting.length === 0 && (
                        <tr><td colSpan="6" className="empty-row">Queue is currently empty</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION 2: HISTORY */}
              <div className="tokens-section" style={{ marginTop: '30px' }}>
                <h3 className="section-title-modern gray">
                  Processed History (Today)
                </h3>
                <div className="tokens-table-container gray-theme">
                  <table className="tokens-table">
                    <thead>
                      <tr><th>Code</th><th>User</th><th>Status</th><th>Time</th><th>Action</th></tr>
                    </thead>
                    <tbody>
                      {allTokens.history.map(t => (
                        <tr key={t._id}>
                          <td className="token-code-cell">{t.tokenCode}</td>
                          <td>{t.userName || "Guest"}</td>
                          <td><span className={`status-pill ${t.status.toLowerCase()}`}>{t.status}</span></td>
                          <td>{new Date(t.completedAt || t.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                          <td><button className="view-token-btn" onClick={() => { setInspectingTicket(t); setShowTokensModal(false); }}>Inspect</button></td>
                        </tr>
                      ))}
                      {allTokens.history.length === 0 && (
                        <tr><td colSpan="5" className="empty-row">No tickets processed yet today</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {showProfile && (
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
      )}

      {showScanner && <ScannerModal onClose={() => setShowScanner(false)} onScan={handleScanSuccess} />}
      {showScheduleModal && (
        <ScheduleModal
          onClose={() => setShowScheduleModal(false)}
          counterName={selectedCounter}
          getAuthHeaders={getAuthHeaders}
          currentConfig={counters.find(c => c.name === selectedCounter)}
        />
      )}

    </div>
  );
}

function ScheduleModal({ onClose, counterName, getAuthHeaders, currentConfig }) {
  const [openingTime, setOpeningTime] = useState(currentConfig?.openingTime || "09:00");
  const [closingTime, setClosingTime] = useState(currentConfig?.closingTime || "17:00");
  const [isClosed, setIsClosed] = useState(currentConfig?.isClosed || false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/staff/counters/update-schedule`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ counterName, openingTime, closingTime, isClosed }),
        credentials: "include"
      });
      if (res.ok) {
        // Optionally update local state or just close
        onClose();
        alert("Schedule updated!");
      } else {
        alert("Failed to update.");
      }
    } catch (e) {
      console.error(e);
      alert("Error saving schedule.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <button className="close-profile-btn" onClick={onClose}>×</button>
        <h2 style={{ marginBottom: '20px' }}>Manage Schedule</h2>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px' }}>Opening Time</label>
          <input
            type="time"
            value={openingTime}
            onChange={e => setOpeningTime(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px' }}>Closing Time</label>
          <input
            type="time"
            value={closingTime}
            onChange={e => setClosingTime(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
          />
        </div>

        <div style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="checkbox"
            checked={isClosed}
            onChange={e => setIsClosed(e.target.checked)}
            style={{ width: '18px', height: '18px' }}
          />
          <span style={{ fontSize: '14px', fontWeight: '500' }}>Close Counter Manually</span>
        </div>

        <button
          className="vc-btn-call"
          onClick={handleSave}
          disabled={saving}
          style={{ width: '100%' }}
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
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
