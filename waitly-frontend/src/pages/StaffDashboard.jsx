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
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [counters, setCounters] = useState([]);
  const [placeName, setPlaceName] = useState("");
  const [selectedCounter, setSelectedCounter] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [fetchError, setFetchError] = useState("");

  // Dashboard Status State
  const [currentTicket, setCurrentTicket] = useState(null);
  const [queueStats, setQueueStats] = useState({ waiting: 0, completed: 0 });
  const [nextTickets, setNextTickets] = useState([]);
  const [loading, setLoading] = useState(false);

  // All Tokens Modal & Inspecting Mode
  const [showTokensModal, setShowTokensModal] = useState(false);
  const [allTokens, setAllTokens] = useState([]);
  const [inspectingTicket, setInspectingTicket] = useState(null);

  const fetchAllTokens = async () => {
    if (!selectedCounter) return;
    try {
      const res = await fetch(`${API_BASE}/api/staff/all-tokens?counterName=${selectedCounter}`, {
        credentials: "include"
      });
      const data = await res.json();
      setAllTokens(data.tokens || []);
    } catch (err) {
      console.error("Failed to fetch all tokens", err);
      showNotification("Failed to fetch all tokens", "error");
    }
  };

  // Redirect if not staff
  useEffect(() => {
    if (user && user.role !== "staff") {
      navigate("/");
    }
  }, [user, navigate]);

  // Fetch Counters on Load
  useEffect(() => {
    const fetchCounters = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/staff/counters`, {
          credentials: "include"
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));

          if (res.status === 404 && (errData.message?.includes("Staff account not found") || errData.message?.includes("Staff not found"))) {
            showNotification("Session expired. Please login again.", "error");
            logout();
            setTimeout(() => navigate("/login"), 2000);
            return;
          }

          console.error("Fetch Counters Error:", res.status, errData);
          setFetchError(`Error ${res.status}: ${errData.message || "Failed to load counters"}`);
          return;
        }

        const data = await res.json();
        if (data.counters && data.counters.length > 0) {
          setCounters(data.counters);
          setPlaceName(data.placeName || "Workplace");
        } else {
          setFetchError("No counters configured for this place.");
        }
      } catch (err) {
        console.error("Failed to fetch counters", err);
        setFetchError("Network error. Check connection.");
      }
    };

    if (user?.role === "staff") {
      fetchCounters();
    }
  }, [user]);

  // Fetch Queue Status
  const fetchStatus = async () => {
    if (!selectedCounter) return;

    try {
      const res = await fetch(`${API_BASE}/api/staff/status?counterName=${selectedCounter}`, {
        credentials: "include"
      });
      const data = await res.json();

      setCurrentTicket(data.currentTicket);
      setQueueStats({
        waiting: data.waiting,
        completed: data.completed
      });
      setNextTickets(data.nextTickets || []);

    } catch (err) {
      console.error("Failed to fetch status", err);
    }
  };

  // Socket Listener for Real-time Updates
  useEffect(() => {
    if (!selectedCounter) return;

    fetchStatus(); // Initial fetch

    socket.on("token-updated", fetchStatus);
    return () => socket.off("token-updated");
  }, [selectedCounter]);

  // ACTIONS
  const handleNextTicket = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/staff/next`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ counterName: selectedCounter }),
        credentials: "include"
      });

      if (!res.ok) {
        const err = await res.json();
        showNotification(err.message || "Failed to call next ticket", "error");
      } else {
        // fetchStatus will run via socket or manually
        fetchStatus();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (action) => {
    if (!currentTicket) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/staff/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId: currentTicket._id, action }),
        credentials: "include"
      });

      if (res.ok) {
        setCurrentTicket(null); // Clear locally first
        fetchStatus();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };


  /* ================= NOTIFICATION SYSTEM ================= */
  const [notification, setNotification] = useState({ message: "", type: "", visible: false });
  const [isVerified, setIsVerified] = useState(false);
  const [verifiedHistory, setVerifiedHistory] = useState([]);

  // Reset verified status when ticket or inspection target changes
  useEffect(() => {
    setIsVerified(false);
  }, [currentTicket, inspectingTicket]);

  const showNotification = (message, type = "success") => {
    setNotification({ message, type, visible: true });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, visible: false }));
    }, 3000);
  };

  const handleScanSuccess = (decodedText) => {
    setShowScanner(false);

    // Verify against inspected ticket if one is active, otherwise current ticket
    const targetTicket = inspectingTicket || currentTicket;

    if (!targetTicket) {
      showNotification("No ticket selected for verification. Please call next or inspect a token from the list.", "error");
      return;
    }

    // Log for debugging
    console.log("Scanned:", decodedText);
    console.log("Expected:", targetTicket.tokenCode);

    // Check if scanned text matches or contains the token code
    const scannedText = decodedText.trim();
    const expectedCode = targetTicket.tokenCode.trim();

    // Try exact match first, then check if the scanned text contains the token code
    if (scannedText === expectedCode || scannedText.includes(expectedCode)) {
      setIsVerified(true);

      // Add to verified history
      const verifiedEntry = {
        tokenCode: targetTicket.tokenCode,
        tokenId: targetTicket._id,
        userName: targetTicket.userName,
        verifiedAt: new Date(),
        counterName: selectedCounter
      };

      setVerifiedHistory(prev => {
        // Check if already exists
        const exists = prev.find(v => v.tokenId === targetTicket._id);
        if (exists) {
          // Update timestamp
          return prev.map(v =>
            v.tokenId === targetTicket._id
              ? { ...v, verifiedAt: new Date() }
              : v
          );
        }
        // Add new entry at the beginning
        return [verifiedEntry, ...prev];
      });

      let successMsg = `Token Verified Successfully: ${expectedCode}`;
      if (inspectingTicket) {
        const isDone = targetTicket.status === "Completed";
        successMsg = `Token ${expectedCode} match! This token is verifiable and ${isDone ? "already verified/completed" : "currently " + targetTicket.status.toLowerCase()} also.`;
      }

      showNotification(successMsg, "success");
    } else {
      showNotification(`Scan Mismatch: Scanned "${scannedText}", Expected "${expectedCode}"`, "error");
    }
  };


  /* ================= STAFF APPLICATION LOGIC ================= */
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [applying, setApplying] = useState(null);

  const searchPlaces = async () => {
    if (!searchQuery.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/staff/places/search?q=${searchQuery}`, { credentials: "include" });
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  };

  const applyForPlace = async (placeId) => {
    if (!window.confirm("Apply to manage this place?")) return;
    setApplying(placeId);
    try {
      const res = await fetch(`${API_BASE}/api/staff/places/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId }),
        credentials: "include"
      });
      if (res.ok) {
        showNotification("Application sent! Waiting for admin approval.", "success");
        setTimeout(() => window.location.reload(), 2000);
      } else {
        const errData = await res.json().catch(() => ({}));
        showNotification(`Application failed: ${errData.message || res.statusText}`, "error");
      }
    } catch (e) {
      console.error(e);
      showNotification("Network or Server Error", "error");
    } finally { setApplying(null); }
  };

  /* ================= RENDER: UNASSIGNED STATE ================= */
  if (user?.status === "unassigned") {
    return (
      <div className="staff-dashboard-container">
        <header className="staff-header">
          <div className="header-left">
            <h2>Staff Portal</h2>
            <p>Welcome, {user.username}</p>
          </div>
          <div className="header-right">
          </div>
        </header>
        <div className="counter-selection-screen">
          <div className="selection-card wide">

            <h2>Join a Workplace</h2>
            <p>Search for your organization to request staff access.</p>

            <div className="search-input-group">
              <input
                placeholder="Search workspace (e.g. City Hospital)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchPlaces()}
              />
              <button onClick={searchPlaces}>Search</button>
            </div>

            <div className="results-list">
              {searchResults.map(p => (
                <div key={p._id} className="place-result-card">
                  <div className="place-info">
                    <h4>{p.name}</h4>
                    <p>{p.address}</p>
                  </div>
                  <button
                    className="apply-btn"
                    disabled={applying === p._id}
                    onClick={() => applyForPlace(p._id)}
                  >
                    {applying === p._id ? "Applying" : "Request Access"}
                  </button>
                </div>
              ))}
              {searchResults.length === 0 && searchQuery && <p className="no-results-msg">No places found matching "{searchQuery}"</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ================= RENDER: APPLIED / PENDING STATE ================= */
  if (user?.status === "applied" || user?.status === "pending") {
    // pending is legacy status, treat as applied
    return (
      <div className="staff-dashboard-container">
        <header className="staff-header">
          <div className="header-left">
            <h2>Staff Portal</h2>
            <p>Account Status</p>
          </div>
          <div className="header-right">
          </div>
        </header>
        <div className="counter-selection-screen">
          <div className="selection-card centered">
            <h2 className="status-pending-title">⏳ Application Sent</h2>
            <p className="status-pending-text">
              Your application to join a workplace is pending admin approval.
              <br />
              Please check back later.
            </p>
            <button
              className="continue-btn"
              onClick={() => window.location.reload()}
            >
              Check Status Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ================= RENDER: COUNTER SELECTION ================= */
  if (!selectedCounter) {
    return (
      <div className="staff-dashboard-container">
        <header className="staff-header">
          <div className="header-left">
            <h2>Staff Portal</h2>
            <p>Please select your station</p>
          </div>
          <div className="header-right">
          </div>
        </header>

        <div className="counter-selection-screen">
          <div className="selection-card">
            <h2>Select Counter</h2>
            <p>Choose the counter you are managing today.</p>

            <div className="counters-grid">
              {fetchError ? (
                <div style={{ gridColumn: "1/-1", color: "#ef4444", textAlign: 'center' }}>
                  <p>{fetchError}</p>
                  <div style={{ marginTop: 10, padding: 10, background: '#fee2e2', borderRadius: 6, fontSize: '0.8em', color: '#b91c1c' }}>
                    <strong>Debug Info:</strong><br />
                    User: {user?.username}<br />
                    Role: {user?.role}<br />
                    PlaceID: {user?.placeId || "NULL (Check Admin Approval)"}
                  </div>
                </div>
              ) : counters.length === 0 ? (
                <p style={{ gridColumn: "1/-1", color: "#64748b" }}>Loading counters...</p>
              ) : (
                counters.map(c => (
                  <div
                    key={c.name}
                    className={`counter-option ${selectedCounter === c.name ? "selected" : ""}`}
                    onClick={() => setSelectedCounter(c.name)}
                  >
                    {c.name}
                  </div>
                ))
              )}
            </div>

            <button
              className="continue-btn"
              disabled={!selectedCounter}
              onClick={() => { /* State is already set, just need to re-render main view */ }}
            >
              Start Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ================= RENDER: DASHBOARD ================= */
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
                <button className="vc-text-btn" onClick={() => { fetchAllTokens(); setShowTokensModal(true); }}>
                  All Tokens
                </button>
                <button className="vc-text-btn danger" onClick={() => window.location.reload()}>
                  Change Counter
                </button>
              </div>
            </div>
            <p className="vc-sub">Managing {queueStats.waiting + queueStats.completed + (currentTicket ? 1 : 0)} Tokens Today</p>
          </div>

          <div className="vc-grid">
            {/* LEFT: CURRENT TOKEN */}
            <div className="vc-col-left">
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: '10px' }}>
                <span className="vc-label">{inspectingTicket ? "INSPECTING TOKEN" : "CURRENT TOKEN"}</span>
                {inspectingTicket && (
                  <button className="return-queue-btn" onClick={() => setInspectingTicket(null)}>Back to Queue</button>
                )}
              </div>
              <div className="vc-token-code">{displayTicket ? displayTicket.tokenCode : "--"}</div>
              <div className={`vc-qr-area ${isVerified ? "verified-border" : ""}`}>
                {displayTicket ? (
                  isVerified ? (
                    <div className="verified-status-panel">
                      <div className="verified-icon">✅</div>
                      <h3>{displayTicket.status === "Completed" ? "ALREADY VERIFIED" : "TOKEN VERIFIED"}</h3>
                      <p>{displayTicket.status === "Completed" ? "This token was previously completed" : "Client is cleared for service"}</p>
                    </div>
                  ) : (
                    <QRCode value={displayTicket.tokenCode} size={150} />
                  )
                ) : (
                  <div style={{ color: '#cbd5e1', fontWeight: 600 }}>Waiting</div>
                )}
              </div>
            </div>

            {/* RIGHT: QUEUE */}
            <div className="vc-col-right">
              <span className="vc-label">QUEUE STATUS</span>
              <div className="vc-stat-row">
                <span>Waiting</span>
                <span className="vc-val blue">{queueStats.waiting}</span>
              </div>
              <div className="vc-stat-row">
                <span>Near Service</span>
                <span className="vc-val orange">{nextTickets.length}</span>
              </div>
              <div className="vc-stat-row">
                <span>Completed</span>
                <span className="vc-val green">{queueStats.completed}</span>
              </div>
            </div>
          </div>

          <div className="vc-actions">
            {displayTicket ? (
              <>
                {!inspectingTicket ? (
                  <>
                    <button className="vc-btn-complete" onClick={() => handleUpdateStatus("Completed")}>Mark as Completed</button>
                    <button className="vc-btn-skip" onClick={() => handleUpdateStatus("Skipped")}>Skip</button>
                  </>
                ) : (
                  <div className="inspect-warning-msg">Queue actions disabled in inspect mode</div>
                )}
              </>
            ) : (
              <button className="vc-btn-call" onClick={handleNextTicket} disabled={loading}>{loading ? "Calling..." : "Call Next Token"}</button>
            )}
            <button className="vc-btn-scan" onClick={() => setShowScanner(true)}>Scan Token</button>
          </div>
        </div>
      </div>

      {/* ALL TOKENS MODAL */}
      {showTokensModal && (
        <div className="profile-modal-overlay" onClick={() => setShowTokensModal(false)}>
          <div className="profile-card tokens-list-modal" onClick={e => e.stopPropagation()}>
            <button className="close-profile-btn" onClick={() => setShowTokensModal(false)}>×</button>
            <h2 className="modal-title">All Tokens - {selectedCounter}</h2>
            <div className="tokens-table-container">
              <table className="tokens-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>User</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {allTokens.map(t => (
                    <tr key={t._id}>
                      <td className="token-code-cell">{t.tokenCode}</td>
                      <td>{t.userName || "Guest"}</td>
                      <td>
                        <span className={`status-pill ${t.status.toLowerCase()}`}>
                          {t.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="view-token-btn"
                          onClick={() => {
                            setInspectingTicket(t);
                            setShowTokensModal(false);
                          }}
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                  {allTokens.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No tokens found for today.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PROFILE MODAL */}
      {showProfile && (
        <div className="profile-modal-overlay" onClick={() => setShowProfile(false)}>
          <div className="profile-card" onClick={e => e.stopPropagation()}>
            <button className="close-profile-btn" onClick={() => setShowProfile(false)}>×</button>
            <div className="profile-avatar">
              {user.username ? user.username.charAt(0).toUpperCase() : "U"}
            </div>
            <h2 className="profile-name">{user.username}</h2>
            <p className="profile-role">{user.role} Account</p>

            <div style={{ marginTop: '20px' }}>
              <div className="profile-detail-row">
                <span className="profile-detail-label">Email</span>
                <span className="profile-detail-value">{user.email}</span>
              </div>
              <div className="profile-detail-row">
                <span className="profile-detail-label">Status</span>
                <span className="profile-detail-value" style={{ textTransform: 'capitalize', color: '#16a34a' }}>{user.status}</span>
              </div>
              <div className="profile-detail-row">
                <span className="profile-detail-label">ID</span>
                <span className="profile-detail-value" style={{ fontSize: '0.8em' }}>{user._id}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SCANNER MODAL */}
      {showScanner && (
        <ScannerModal onClose={() => setShowScanner(false)} onScan={handleScanSuccess} />
      )}

      {/* NOTIFICATION TOAST */}
      <div className={`notification-toast ${notification.visible ? "show" : ""} ${notification.type}`}>
        {notification.type === "success" && <span className="icon">✅</span>}
        {notification.type === "error" && <span className="icon">⚠️</span>}
        <span className="msg">{notification.message}</span>
      </div>

    </div>
  );
}

// Scanner Component to handle lifecycle
function ScannerModal({ onClose, onScan }) {
  useEffect(() => {
    // Check if element exists before init
    if (!document.getElementById("qr-reader")) return;

    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    scanner.render((decodedText) => {
      // Pause or clear? For now just callback
      scanner.clear().then(() => {
        onScan(decodedText);
      }).catch(err => console.error(err));
    }, (err) => {
      // ignore
    });

    return () => {
      try {
        scanner.clear().catch(() => { });
      } catch (e) { /* ignore */ }
    };
  }, []);

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <button className="close-profile-btn" onClick={onClose}>×</button>
        <h2 style={{ marginBottom: '20px' }}>Scan User Token</h2>
        <div id="qr-reader" style={{ width: '100%' }}></div>
        <p style={{ fontSize: '0.9em', color: '#64748b', marginTop: '10px' }}>
          Place QR code within the frame
        </p>
      </div>
    </div>
  );
}
