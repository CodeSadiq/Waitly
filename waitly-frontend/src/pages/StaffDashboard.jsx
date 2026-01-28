import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import API_BASE from "../config/api";
import { io } from "socket.io-client";
import QRCode from 'react-qr-code';
import { Html5QrcodeScanner } from "html5-qrcode";
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

  // Dashboard Status State
  const [currentTicket, setCurrentTicket] = useState(null);
  const [queueStats, setQueueStats] = useState({ waiting: 0, completed: 0, skipped: 0 });
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

  // All Tokens Modal & Inspecting Mode
  const [showTokensModal, setShowTokensModal] = useState(false);
  const [allTokens, setAllTokens] = useState([]);
  const [inspectingTicket, setInspectingTicket] = useState(null);

  const fetchAllTokens = async () => {
    if (!selectedCounter) return;
    try {
      const res = await fetch(`${API_BASE}/api/staff/all-tokens?counterName=${selectedCounter}`, {
        credentials: "include",
        headers: getAuthHeaders()
      });
      const data = await res.json();
      setAllTokens(data.tokens || []);
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
        skipped: data.skipped
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
      <div className="staff-dashboard-container">
        <header className="staff-header">
          <div className="header-left">
            <div className="staff-brand">
              <div className="brand-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              </div>
              <div>
                <h2>Staff Portal</h2>
                <p>Digital Queue Management</p>
              </div>
            </div>
          </div>

        </header>

        <div className="session-setup-layout">
          {/* Staff Profile Summary */}
          <div className="staff-profile-summary">
            <div className="profile-context">
              <h2>Hello, {user?.username}</h2>
              <p>Welcome to <strong>{placeName || "your workplace"}</strong></p>
            </div>
          </div>

          {/* Counter Selection Card */}
          <div className="counter-select-container">
            <div className="select-card">
              <div className="card-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <div className="header-icon-container" style={{
                  width: '64px',
                  height: '64px',
                  background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px auto',
                  color: '#2563eb'
                }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                    <line x1="8" y1="21" x2="16" y2="21"></line>
                    <line x1="12" y1="17" x2="12" y2="21"></line>
                  </svg>
                </div>
                <h3 style={{ fontSize: '1.5rem', marginBottom: '12px', color: '#0f172a', display: 'block', width: '100%' }}>Select Your Counter</h3>
                <p style={{ maxWidth: '400px', margin: '0 auto', lineHeight: '1.6', color: '#64748b', display: 'block' }}>
                  Choose the counter you will be managing today. This will connect you to the live queue for that specific service.
                </p>
              </div>

              <div className="counters-grid-simple">
                {counters.length > 0 ? (
                  counters.map((counter, i) => (
                    <button key={i} className="counter-btn-modern" onClick={() => setSelectedCounter(counter.name)}>
                      <span className="counter-name">{counter.name}</span>
                      <span className="counter-arrow">→</span>
                    </button>
                  ))
                ) : (
                  <div className="loading-simple">
                    {loadingCounters ? "Loading counters..." : "No counters found."}
                    {!loadingCounters && <button onClick={fetchCounters} className="link-btn">Retry</button>}
                  </div>
                )}
              </div>
            </div>
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

              {!loading && displayTicket && displayTicket.timeSlotLabel && (
                <div className="vc-slot-badge" style={{
                  fontSize: '0.9rem',
                  marginBottom: '20px',
                  marginTop: '-10px', // Pull it up slightly closer to the code
                  background: '#f0fdf4',
                  color: '#166534',
                  padding: '6px 16px',
                  borderRadius: '20px',
                  fontWeight: '600',
                  border: '1px solid #bbf7d0',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {displayTicket.timeSlotLabel}
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
              <div className="vc-stat-row"><span>Near Service</span><span className="vc-val orange">{nextTickets.length}</span></div>
              <div className="vc-stat-row"><span>Completed</span><span className="vc-val green">{queueStats.completed}</span></div>
              <div className="vc-stat-row"><span>Skipped</span><span className="vc-val red" style={{ color: '#ef4444' }}>{queueStats.skipped}</span></div>
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
            <button className="vc-btn-scan" onClick={() => setShowScanner(true)}>Scan Token</button>
          </div>
        </div>
      </div>

      {showTokensModal && (
        <div className="profile-modal-overlay" onClick={() => setShowTokensModal(false)}>
          <div className="profile-card tokens-list-modal" onClick={e => e.stopPropagation()}>
            <button className="close-profile-btn" onClick={() => setShowTokensModal(false)}>×</button>
            <h2 className="modal-title">All Tokens - {selectedCounter}</h2>
            <div className="tokens-table-container">
              <table className="tokens-table">
                <thead>
                  <tr><th>Pos</th><th>Code</th><th>User</th><th>Slot</th><th>Status</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {allTokens.map(t => (
                    <tr key={t._id}>
                      <td style={{ fontWeight: 'bold', color: '#64748b' }}>{t.position ? `#${t.position}` : '-'}</td>
                      <td className="token-code-cell">{t.tokenCode}</td>
                      <td>{t.userName || "Guest"}</td>
                      <td>{t.timeSlotLabel || "-"}</td>
                      <td><span className={`status-pill ${t.status.toLowerCase()}`}>{t.status}</span></td>
                      <td><button className="view-token-btn" onClick={() => { setInspectingTicket(t); setShowTokensModal(false); }}>Inspect</button></td>
                    </tr>
                  ))}
                  {allTokens.length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No tokens found for today.</td></tr>}
                </tbody>
              </table>
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

      <div className={`notification-toast ${notification.visible ? "show" : ""} ${notification.type}`}>
        {notification.type === "success" ? <span className="icon">✅</span> : <span className="icon">⚠️</span>}
        <span className="msg">{notification.message}</span>
      </div>
    </div>
  );
}

function ScannerModal({ onClose, onScan }) {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
    scanner.render((decodedText) => {
      scanner.clear().then(() => onScan(decodedText)).catch(err => console.error(err));
    }, () => { });
    return () => { try { scanner.clear().catch(() => { }); } catch (e) { } };
  }, []);

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <button className="close-profile-btn" onClick={onClose}>×</button>
        <h2 style={{ marginBottom: '20px' }}>Scan User Token</h2>
        <div id="qr-reader" style={{ width: '100%' }}></div>
        <p style={{ fontSize: '0.9em', color: '#64748b', marginTop: '10px' }}>Place QR code within the frame</p>
      </div>
    </div>
  );
}
