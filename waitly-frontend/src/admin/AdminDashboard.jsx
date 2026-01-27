import { useEffect, useState } from "react";
import "./AdminDashboard.css";
import API_BASE from "../config/api";
import { adminFetch } from "../utils/adminFetch";

export default function AdminDashboard() {
  /* ================= STATE ================= */
  const [pending, setPending] = useState([]);
  const [staffRequests, setStaffRequests] = useState([]); // ✅ NEW
  const [osmResults, setOsmResults] = useState([]);
  const [fetchMessage, setFetchMessage] = useState("");
  const [notification, setNotification] = useState({ message: "", type: "", visible: false });

  const showNotification = (msg, type = "success") => {
    setNotification({ message: msg, type, visible: true });
    setTimeout(() => setNotification({ ...notification, visible: false }), 4000);
  };

  const [loadingOSM, setLoadingOSM] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  /* ================= COUNTERS ================= */
  const [counterInput, setCounterInput] = useState("");
  const [counters, setCounters] = useState([]);

  /* ================= DB PLACES ================= */
  const [dbPlaces, setDbPlaces] = useState([]);
  const [loadingDb, setLoadingDb] = useState(false);
  const [dbError, setDbError] = useState("");
  const [editingDbPlace, setEditingDbPlace] = useState(null);
  const [dbJsonText, setDbJsonText] = useState("");

  /* ================= NAVIGATION ================= */
  const [activeTab, setActiveTab] = useState("dashboard"); // dashboard, staff, places, fetch
  const [sidebarOpen, setSidebarOpen] = useState(true);

  /* ================= DB FILTERS ================= */
  const [dbSearch, setDbSearch] = useState("");
  const [dbLat, setDbLat] = useState("");
  const [dbLng, setDbLng] = useState("");
  const [dbRadius, setDbRadius] = useState("");

  /* ================= FORMS ================= */
  const [osmForm, setOsmForm] = useState({
    category: "bank",
    lat: "",
    lng: ""
  });

  const [manualForm, setManualForm] = useState({
    name: "",
    category: "bank",
    address: "",
    lat: "",
    lng: ""
  });

  /* ================= JSON EDITOR (PENDING) ================= */
  const [editingPlace, setEditingPlace] = useState(null);
  const [jsonText, setJsonText] = useState("");

  /* ================= API SELECTED PLACE ================= */
  const [pendingAddPlace, setPendingAddPlace] = useState(null);

  /* ================= COUNTER HELPERS ================= */
  const addCounter = () => {
    if (!counterInput.trim()) return;
    if (counters.includes(counterInput.trim())) return;
    setCounters([...counters, counterInput.trim()]);
    setCounterInput("");
  };

  const removeCounter = (i) => {
    setCounters(counters.filter((_, idx) => idx !== i));
  };

  const presetCounters = [
    "General",
    "Token Counter",
    "Enquiry",
    "Cash",
    "OPD",
    "Registration",
    "Billing",
    "Help Desk",
    "Customer Service",
    "Reception",
    "Information Desk",
    "Payment Counter",
  ];

  const addPresetCounter = (name) => {
    if (counters.includes(name)) return;
    setCounters([...counters, name]);
  };

  /* ================= LOGOUT ================= */
  const logout = async () => {
    try {
      await adminFetch("/api/auth/logout", { method: "POST" });
    } catch { }
    localStorage.removeItem("waitly_role");
    window.location.href = "/login";
  };

  /* ================= LOAD DATA ================= */
  const loadPending = async () => {
    try {
      const res = await adminFetch("/api/admin/pending");
      const data = await res.json();
      setPending(Array.isArray(data) ? data : []);
    } catch { setPending([]); }
  };

  const loadStaffRequests = async () => {
    try {
      console.log("📂 [ADMIN] Fetching staff requests...");
      const res = await adminFetch("/api/admin/staff-requests");
      console.log("📡 [ADMIN] Staff requests status:", res.status);

      if (!res.ok) {
        const errText = await res.text();
        console.error("❌ [ADMIN] Staff requests fetch failed:", res.status, errText);
        setStaffRequests([]);
        return;
      }

      const data = await res.json();
      console.log("✅ [ADMIN] Staff requests data:", data);
      setStaffRequests(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("🚨 [ADMIN] Staff requests network error:", e);
      setStaffRequests([]);
    }
  };

  useEffect(() => {
    loadPending();
    loadStaffRequests();
    loadDbPlaces();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadPending(),
      loadStaffRequests(),
      loadDbPlaces()
    ]);
    setTimeout(() => setRefreshing(false), 800);
  };

  /* ================= STAFF REQUEST ACTIONS ================= */
  const approveStaff = async (id) => {
    if (!window.confirm("Approve this staff request?")) return;
    try {
      console.log("📡 [ADMIN] Approving staff request:", id);
      const res = await adminFetch(`/api/admin/staff-requests/approve/${id}`, {
        method: "POST",
        body: JSON.stringify({})
      });

      const data = await res.json();

      if (res.ok) {
        showNotification("Staff approved successfully!", "success");
        loadStaffRequests();
      } else {
        showNotification(data.message || "Failed to approve staff", "error");
      }
    } catch (e) {
      console.error(e);
      showNotification("Network or Server Error", "error");
    }
  };

  const rejectStaff = async (id) => {
    if (!window.confirm("Reject and reset this staff request?")) return;
    try {
      console.log("🚫 [ADMIN] Rejecting staff request:", id);
      const res = await adminFetch(`/api/admin/staff-requests/reject/${id}`, {
        method: "POST",
        body: JSON.stringify({})
      });

      const data = await res.json();

      if (res.ok) {
        showNotification("Staff request rejected.", "success");
        loadStaffRequests();
      } else {
        showNotification(data.message || "Failed to reject staff", "error");
      }
    } catch (e) {
      console.error(e);
      showNotification("Network or Server Error", "error");
    }
  };

  /* ================= FETCH FROM OSM ================= */
  const fetchOSM = async () => {
    if (!osmForm.lat || !osmForm.lng) {
      alert("Latitude & Longitude required");
      return;
    }

    setLoadingOSM(true);
    setOsmResults([]);
    setFetchMessage("");

    try {
      const res = await adminFetch("/api/admin/fetch/osm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(osmForm)
      });
      const data = await res.json();

      if (!Array.isArray(data) || data.length === 0) {
        setFetchMessage("No data fetched from OSM. Please retry.");
        return;
      }

      setOsmResults(data);
    } catch {
      setFetchMessage("OSM fetch failed. Please retry.");
    } finally {
      setLoadingOSM(false);
    }
  };

  /* ================= FETCH FROM GOOGLE ================= */
  const fetchGoogle = async () => {
    if (!osmForm.lat || !osmForm.lng) {
      alert("Latitude & Longitude required");
      return;
    }

    setLoadingGoogle(true);
    setOsmResults([]);
    setFetchMessage("");

    try {
      const res = await adminFetch("/api/admin/fetch/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(osmForm)
      });
      const data = await res.json();

      if (!Array.isArray(data) || data.length === 0) {
        setFetchMessage("No data fetched from Google. Please retry.");
        return;
      }

      setOsmResults(data);
    } catch {
      setFetchMessage("Google fetch failed. Please retry.");
    } finally {
      setLoadingGoogle(false);
    }
  };

  /* ================= SELECT API PLACE ================= */
  const addPlaceDirect = (place) => {
    setPendingAddPlace({
      ...place,
      lat: place.lat ?? "",
      lng: place.lng ?? "",
      address: place.address ?? ""
    });
    setActiveTab("fetch"); // Stay or go to specialized view
  };

  /* ================= CONFIRM ADD PLACE ================= */
  const confirmAddPlace = async () => {
    if (!pendingAddPlace) return;

    if (counters.length === 0) {
      alert("Add at least one counter");
      return;
    }

    const payload = {
      externalPlaceId:
        pendingAddPlace.externalPlaceId ||
        `${pendingAddPlace.source || "osm"}_${pendingAddPlace.lat}_${pendingAddPlace.lng}`,

      name: pendingAddPlace.name,
      category: pendingAddPlace.category || osmForm.category,
      address: pendingAddPlace.address || "",

      location: {
        lat: Number(pendingAddPlace.lat),
        lng: Number(pendingAddPlace.lng)
      },
      counters: counters.map((c) => ({ name: c })),
      metadata: { source: pendingAddPlace.source || "osm" }
    };

    const res = await adminFetch("/api/admin/place/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("SAVE ERROR:", err);
      alert("Failed to save place");
      return;
    }

    alert("Place added to database");
    setPendingAddPlace(null);
    setCounters([]);
  };

  /* ================= MANUAL ADD ================= */
  const addManual = async () => {
    if (!manualForm.name || !manualForm.lat || !manualForm.lng) {
      alert("Name & location required");
      return;
    }

    if (counters.length === 0) {
      alert("Add at least one counter");
      return;
    }

    await adminFetch("/api/admin/place/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...manualForm, counters })
    });

    alert("Place added successfully");
    setManualForm({ name: "", category: "bank", address: "", lat: "", lng: "" });
    setCounters([]);
  };

  /* ================= APPROVE / REJECT ================= */
  const approve = async (id) => {
    await adminFetch(`/api/admin/pending/approve/${id}`, { method: "POST" });
    loadPending();
  };

  const reject = async (id) => {
    await adminFetch(`/api/admin/pending/reject/${id}`, { method: "POST" });
    loadPending();
  };

  /* ================= APPROVE EDITED PENDING ================= */
  const approveEdited = async () => {
    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      alert("Invalid JSON format");
      return;
    }

    await adminFetch(`/api/admin/pending/approve-edited/${editingPlace._id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed)
    });

    setEditingPlace(null);
    setJsonText("");
    loadPending();
  };

  /* ================= LOAD DB PLACES ================= */
  const loadDbPlaces = async () => {
    setLoadingDb(true);
    setDbError("");

    try {
      const res = await adminFetch("/api/admin/places");
      const data = await res.json();
      setDbPlaces(Array.isArray(data) ? data : []);
    } catch {
      setDbError("Database places API not available.");
    } finally {
      setLoadingDb(false);
    }
  };

  /* ================= SAVE DB EDIT ================= */
  const saveDbEdit = async () => {
    let parsed;
    try {
      parsed = JSON.parse(dbJsonText);
      await adminFetch(`/api/admin/place/update/${editingDbPlace._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });

      alert("Database place updated");
      setEditingDbPlace(null);
      setDbJsonText("");
      loadDbPlaces();

    } catch (error) {
      console.error(error);
      alert("Update API not available or invalid JSON");
    }
  };

  /* ================= DELETE DB PLACE ================= */
  const deleteDbPlace = async (e, id) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    console.log("🖱️ [FRONTEND] Delete clicked for ID:", id);
    if (!id) {
      alert("Error: No Place ID found!");
      return;
    }

    // Checking if bypass helps - typically window.confirm blocks or is suppressed
    // if (!window.confirm("Delete this place permanently?")) return; 
    console.log("⚠️ [FRONTEND] Bypassing confirm dialog for debugging");

    try {
      console.log("📡 [FRONTEND] Sending DELETE request...");
      const res = await adminFetch(`/api/admin/place/${id}`, { method: "DELETE" });

      if (res.ok) {
        console.log("✅ [FRONTEND] Delete success!");
        await loadDbPlaces();
      } else {
        console.error("❌ [FRONTEND] Delete failed:", res.status);
        alert(`Failed to delete place. Server responded with ${res.status}`);
      }
    } catch (err) {
      console.error("🚨 [FRONTEND] Delete error:", err);
      alert("Error deleting place. Check console details.");
    }
  };

  /* ================= DB FILTER LOGIC ================= */
  const filteredDbPlaces = dbPlaces.filter((p) => {
    if (dbSearch && !p.name.toLowerCase().includes(dbSearch.toLowerCase())) return false;
    if (dbLat && dbLng && dbRadius) {
      const R = 6371;
      const dLat = ((p.location.lat - dbLat) * Math.PI) / 180;
      const dLng = ((p.location.lng - dbLng) * Math.PI) / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos((dbLat * Math.PI) / 180) * Math.cos((p.location.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
      const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return d <= dbRadius;
    }
    return true;
  });

  /* ================= RENDER HELPERS ================= */
  const getNavClass = (tab) => `nav-item ${activeTab === tab ? "active" : ""}`;

  return (
    <div className={`admin-layout ${sidebarOpen ? "" : "sidebar-collapsed"}`}>
      {/* ================= SIDEBAR ================= */}
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <div className="logo-area">
            <div className="logo-icon">W</div>
            <span className="logo-text">Waitly<span>Admin</span></span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-group">
            <span className="group-label">Overview</span>
            <button className={getNavClass("dashboard")} onClick={() => setActiveTab("dashboard")}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
              <span>Dashboard</span>
            </button>
          </div>

          <div className="nav-group">
            <span className="group-label">Management</span>
            <button className={getNavClass("staff")} onClick={() => setActiveTab("staff")}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              <span>Place Staff Requests</span>
              {staffRequests.length > 0 && <span className="badge">{staffRequests.length}</span>}
            </button>
            <button className={getNavClass("places")} onClick={() => setActiveTab("places")}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              <span>Database Places</span>
            </button>
          </div>

          <div className="nav-group">
            <span className="group-label">Data</span>
            <button className={getNavClass("fetch")} onClick={() => setActiveTab("fetch")}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
              <span>Fetch Data</span>
            </button>
            <button className={getNavClass("manual")} onClick={() => setActiveTab("manual")}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              <span>Manual Add</span>
            </button>
          </div>
        </nav>


      </aside>

      {/* ================= MAIN CONTENT ================= */}
      <main className="admin-main">
        <header className="main-header">
          <div className="header-info">
            <h1>Admin Console</h1>
            <p className="subtitle">Welcome back. Here's what's happening today.</p>
          </div>
          <div className="header-actions">
            <div className="header-actions">
              {activeTab === "dashboard" && (
                <button className={`refresh-btn ${refreshing ? "spinning" : ""}`} onClick={handleRefresh} disabled={refreshing} title="Refresh Dashboard Stats">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"></path><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="content-scroll">
          {activeTab === "dashboard" && (
            <div className="tab-pane dashboard-overview">
              <div className="stats-grid">
                <div className="stat-card blue">
                  <div className="stat-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg></div>
                  <div className="stat-info">
                    <h3>{staffRequests.length}</h3>
                    <p>New Place Staff Requests</p>
                  </div>
                </div>
                <div className="stat-card green">
                  <div className="stat-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></div>
                  <div className="stat-info">
                    <h3>{dbPlaces.length || "--"}</h3>
                    <p>Total Managed Places</p>
                  </div>
                </div>
                <div className="stat-card orange">
                  <div className="stat-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg></div>
                  <div className="stat-info">
                    <h3>{pending.length}</h3>
                    <p>Pending Place Approvals</p>
                  </div>
                </div>
              </div>

              {/* Quick View Sections */}
              <div className="dashboard-sections">
                <section className="dashboard-section compact">
                  <div className="section-head">
                    <h2>Recent Place Staff Requests</h2>
                    <button className="text-link" onClick={() => setActiveTab("staff")}>View All</button>
                  </div>
                  <div className="staff-list-mini">
                    {staffRequests.slice(0, 3).map(s => (
                      <div key={s._id} className="staff-mini-card">
                        <div className="staff-avatar">{s.username.charAt(0).toUpperCase()}</div>
                        <div className="staff-details">
                          <strong>{s.username}</strong>
                          <span>{s.email}</span>
                        </div>
                        <div className="mini-actions">
                          <button className="icon-btn check" onClick={() => approveStaff(s._id)} title="Approve">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          </button>
                          <button className="icon-btn close" onClick={() => rejectStaff(s._id)} title="Reject">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                          </button>
                        </div>
                      </div>
                    ))}
                    {staffRequests.length === 0 && <p className="empty-msg">No pending requests</p>}
                  </div>
                </section>
              </div>
            </div>
          )}

          {activeTab === "staff" && (
            <div className="tab-pane">
              <section className="management-card">
                <div className="section-header-styled">
                  <div className="icon-box blue"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg></div>
                  <div>
                    <h2>Place Staff Onboarding</h2>
                    <p>Manage applications from employees and places</p>
                  </div>
                </div>

                <div className="staff-grid-large">
                  {staffRequests.map(s => (
                    <div key={s._id} className="staff-card-detailed">
                      <div className="staff-card-top">
                        <div className="staff-info-header">
                          <div className="staff-avatar-large">{s.username.charAt(0).toUpperCase()}</div>
                          <div>
                            <h3>{s.username}</h3>
                            <p>{s.email}</p>
                          </div>
                        </div>
                        <div className="staff-tag pending">Incoming Request</div>
                      </div>

                      <div className="staff-request-context">
                        {s.application?.placeId ? (
                          <div className="workplace-link-card">
                            <span className="context-label">Requesting Access To:</span>
                            <h4>{s.application.placeId.name}</h4>
                            <p>{s.application.placeId.address}</p>
                          </div>
                        ) : (
                          <div className="workplace-link-card new">
                            <span className="context-label">Requesting NEW Workplace:</span>
                            <h4>{s.requestDetails?.placeName}</h4>
                            <p>{s.requestDetails?.address}</p>
                          </div>
                        )}
                      </div>

                      <div className="staff-card-actions">
                        <button className="btn-approve-large" onClick={() => approveStaff(s._id)}>Approve Application</button>
                        <button className="btn-reject-icon" onClick={() => rejectStaff(s._id)}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                  {staffRequests.length === 0 && (
                    <div className="hero-empty">
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><polyline points="16 11 18 13 22 9"></polyline></svg>
                      <p>All place staff requests have been processed.</p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}

          {activeTab === "places" && (
            <div className="tab-pane">
              <section className="management-card">
                <div className="section-header-styled">
                  <div className="icon-box green"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></div>
                  <div>
                    <h2>Managed Database</h2>
                    <p>Search and manage all places in the Waitly network</p>
                  </div>
                </div>

                <div className="search-filter-bar">
                  <div className="search-input-group">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    <input placeholder=" Search by name..." value={dbSearch} onChange={(e) => setDbSearch(e.target.value)} />
                  </div>
                  <div className="coord-filters">
                    <input placeholder="Lat" value={dbLat} onChange={(e) => setDbLat(e.target.value)} />
                    <input placeholder="Lng" value={dbLng} onChange={(e) => setDbLng(e.target.value)} />
                    <input placeholder="KM" value={dbRadius} onChange={(e) => setDbRadius(e.target.value)} />
                  </div>
                  <button className="btn-load-db" onClick={loadDbPlaces} disabled={loadingDb}>
                    {loadingDb ? "Loading..." : "Filter Results"}
                  </button>
                </div>

                <div className="db-results-grid">
                  {filteredDbPlaces.map(p => (
                    <div key={p._id} className="db-place-tile">
                      <div className="tile-main">
                        <h4>{p.name}</h4>
                        <span className="place-tag">{p.category}</span>
                      </div>
                      <div className="tile-actions">
                        <button className="tile-edit-btn" onClick={() => { setEditingDbPlace(p); setDbJsonText(JSON.stringify(p, null, 2)); }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button className="tile-delete-btn" onClick={(e) => deleteDbPlace(e, p._id)}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                  {filteredDbPlaces.length === 0 && <p className="no-db-results">No places found matching filters.</p>}
                </div>
              </section>
            </div>
          )}

          {activeTab === "fetch" && (
            <div className="tab-pane">
              <section className="management-card">
                <div className="section-header-styled">
                  <div className="icon-box purple"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg></div>
                  <div>
                    <h2>External Import</h2>
                    <p>Pull new places into the database</p>
                  </div>
                </div>

                <div className="fetch-form-grid">
                  <div className="fetch-inputs">
                    <div className="input-with-label">
                      <label>Category</label>
                      <select value={osmForm.category} onChange={(e) => setOsmForm({ ...osmForm, category: e.target.value })}>
                        <option value="bank">Bank</option>
                        <option value="hospital">Hospital</option>
                        <option value="government">Government Office</option>
                        <option value="courthouse">Courthouse</option>
                        <option value="police">Police Station</option>
                        <option value="college">College</option>
                        <option value="school">School</option>
                        <option value="post_office">Post Office</option>
                        <option value="passport_office">Passport Office</option>
                        <option value="railway_station">Railway Station</option>
                        <option value="bus_station">Bus Station</option>
                        <option value="restaurant">Restaurant</option>
                        <option value="cafe">Cafe</option>
                        <option value="mall">Mall</option>
                        <option value="electricity_office">Electricity Office</option>
                        <option value="water_office">Water Office</option>
                        <option value="gas_agency">Gas Agency</option>
                        <option value="telecom_office">Telecom Office</option>
                      </select>
                    </div>
                    <div className="input-with-label">
                      <label>Latitude</label>
                      <input placeholder="e.g. 24.8607" value={osmForm.lat} onChange={(e) => setOsmForm({ ...osmForm, lat: e.target.value })} />
                    </div>
                    <div className="input-with-label">
                      <label>Longitude</label>
                      <input placeholder="e.g. 67.0011" value={osmForm.lng} onChange={(e) => setOsmForm({ ...osmForm, lng: e.target.value })} />
                    </div>
                  </div>
                  <div className="fetch-actions-modern">
                    <button onClick={fetchOSM} disabled={loadingOSM} className="btn-fetch-osm">
                      {loadingOSM ? "Searching OSM..." : "Fetch from OSM"}
                    </button>
                    <button onClick={fetchGoogle} disabled={loadingGoogle} className="btn-fetch-google">
                      {loadingGoogle ? "Connecting..." : "Fetch from Google (Upcoming)"}
                    </button>
                  </div>
                </div>

                {osmResults.length > 0 && (
                  <div className="osm-results-pane">
                    <h3>Search Results ({osmResults.length})</h3>
                    <div className="osm-results-list">
                      {osmResults.map((p, i) => (
                        <div key={i} className="osm-result-row">
                          <div className="osm-info">
                            <strong>{p.name}</strong>
                            <span>{p.lat}, {p.lng}</span>
                          </div>
                          <button className="btn-add-mini" onClick={() => addPlaceDirect(p)}>Add to DB</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {pendingAddPlace && (
                <section className="selection-wizard-card">
                  <div className="wizard-header">
                    <span className="wizard-step">Final Step</span>
                    <h2>Configure Workplace</h2>
                  </div>

                  <div className="wizard-body">
                    <div className="place-preview-banner">
                      <div className="p-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg></div>
                      <div className="p-text">
                        <h4>{pendingAddPlace.name}</h4>
                        <p>{pendingAddPlace.address || "No address provided"}</p>
                      </div>
                    </div>

                    <div className="wizard-inputs">
                      <div className="input-group-full">
                        <label>Confirm Address</label>
                        <input value={pendingAddPlace.address} onChange={(e) => setPendingAddPlace({ ...pendingAddPlace, address: e.target.value })} placeholder="Edit address if needed" />
                      </div>

                      <div className="counter-config-section">
                        <label>Assign Service Counters</label>
                        <div className="preset-badges">
                          {presetCounters.map(c => (
                            <button key={c} className={`preset-badge ${counters.includes(c) ? "active" : ""}`} onClick={() => addPresetCounter(c)}>{c}</button>
                          ))}
                        </div>

                        <div className="custom-counter-box">
                          <input placeholder="Add custom counter name..." value={counterInput} onChange={(e) => setCounterInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCounter()} />
                          <button className="btn-add-counter" onClick={addCounter}>Add</button>
                        </div>

                        <div className="active-counters-list">
                          {counters.map((c, i) => (
                            <div key={i} className="active-counter-chip">
                              <span>{c}</span>
                              <button onClick={() => removeCounter(i)}>&times;</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="wizard-footer">
                    <button className="btn-cancel-wizard" onClick={() => setPendingAddPlace(null)}>Discard</button>
                    <button className="btn-save-wizard" onClick={confirmAddPlace}>Deploy Workplace</button>
                  </div>
                </section>
              )}
            </div>
          )}

          {activeTab === "manual" && (
            <div className="tab-pane">
              <section className="management-card narrow">
                <div className="section-header-styled">
                  <div className="icon-box orange"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></div>
                  <div>
                    <h2>Manual Creation</h2>
                    <p>Register a new place from scratch</p>
                  </div>
                </div>

                <div className="manual-form-stack">
                  <div className="form-group">
                    <label>Place Name</label>
                    <input value={manualForm.name} onChange={e => setManualForm({ ...manualForm, name: e.target.value })} placeholder="e.g. City Bank - Main Branch" />
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <select value={manualForm.category} onChange={e => setManualForm({ ...manualForm, category: e.target.value })}>
                      <option value="bank">Bank</option>
                      <option value="hospital">Hospital</option>
                      <option value="government">Government Office</option>
                      <option value="courthouse">Courthouse</option>
                      <option value="police">Police Station</option>
                      <option value="college">College</option>
                      <option value="school">School</option>
                      <option value="post_office">Post Office</option>
                      <option value="passport_office">Passport Office</option>
                      <option value="railway_station">Railway Station</option>
                      <option value="bus_station">Bus Station</option>
                      <option value="restaurant">Restaurant</option>
                      <option value="cafe">Cafe</option>
                      <option value="mall">Mall</option>
                      <option value="electricity_office">Electricity Office</option>
                      <option value="water_office">Water Office</option>
                      <option value="gas_agency">Gas Agency</option>
                      <option value="telecom_office">Telecom Office</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Address</label>
                    <input value={manualForm.address} onChange={e => setManualForm({ ...manualForm, address: e.target.value })} placeholder="Full street address" />
                  </div>
                  <div className="form-row-2">
                    <div className="form-group">
                      <label>Latitude</label>
                      <input value={manualForm.lat} onChange={e => setManualForm({ ...manualForm, lat: e.target.value })} placeholder="0.0000" />
                    </div>
                    <div className="form-group">
                      <label>Longitude</label>
                      <input value={manualForm.lng} onChange={e => setManualForm({ ...manualForm, lng: e.target.value })} placeholder="0.0000" />
                    </div>
                  </div>

                  <div className="manual-counter-setup">
                    <label>Assigned Counters</label>
                    <div className="active-counters-list">
                      {counters.map((c, i) => (
                        <div key={i} className="active-counter-chip">
                          <span>{c}</span>
                          <button onClick={() => removeCounter(i)}>&times;</button>
                        </div>
                      ))}
                    </div>
                    <div className="preset-badges">
                      {presetCounters.map(c => (
                        <button key={c} className={`preset-badge ${counters.includes(c) ? "active" : ""}`} onClick={() => addPresetCounter(c)}>{c}</button>
                      ))}
                    </div>
                    <div className="custom-counter-box compact">
                      <input placeholder="e.g. Reception" value={counterInput} onChange={(e) => setCounterInput(e.target.value)} />
                      <button className="btn-add-counter" onClick={addCounter}>Add</button>
                    </div>
                  </div>

                  <button className="btn-submit-manual" onClick={addManual}>Register Place</button>
                </div>
              </section>
            </div>
          )}
        </div>
      </main>

      {/* ================= MODALS ================= */}
      {editingDbPlace && (
        <div className="modal-overlay" onClick={() => setEditingDbPlace(null)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Database Object</h2>
              <button className="btn-close-modal" onClick={() => setEditingDbPlace(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <p className="modal-hint">Direct JSON edit for advanced configuration. Be careful with object IDs and types.</p>
              <textarea
                className="modal-json-editor"
                value={dbJsonText}
                onChange={(e) => setDbJsonText(e.target.value)}
              />
            </div>
            <div className="modal-footer">
              <button className="btn-modal-cancel" onClick={() => setEditingDbPlace(null)}>Cancel</button>
              <button className="btn-modal-save" onClick={saveDbEdit}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
