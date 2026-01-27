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

  const [loadingOSM, setLoadingOSM] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  /* ================= COUNTERS ================= */
  const [counterInput, setCounterInput] = useState("");
  const [counters, setCounters] = useState([]);

  /* ================= DB PLACES ================= */
  const [dbPlaces, setDbPlaces] = useState([]);
  const [loadingDb, setLoadingDb] = useState(false);
  const [dbError, setDbError] = useState("");
  const [editingDbPlace, setEditingDbPlace] = useState(null);
  const [dbJsonText, setDbJsonText] = useState("");

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

  const loadStaffRequests = async () => { // ✅ NEW
    try {
      const res = await adminFetch("/api/admin/staff-requests");
      const data = await res.json();
      setStaffRequests(Array.isArray(data) ? data : []);
    } catch { setStaffRequests([]); }
  };

  useEffect(() => {
    loadPending();
    loadStaffRequests();
  }, []);

  /* ================= STAFF REQUEST ACTIONS ================= */
  const approveStaff = async (id) => {
    if (!window.confirm("Approve this staff and create their place?")) return;
    try {
      const res = await adminFetch(`/api/admin/staff-requests/approve/${id}`, { method: "POST" });
      if (res.ok) {
        alert("Staff approved & Place created!");
        loadStaffRequests();
      } else {
        alert("Failed to approve");
      }
    } catch (e) { console.error(e); alert("Error"); }
  };

  const rejectStaff = async (id) => {
    if (!window.confirm("Reject this request?")) return;
    try {
      await adminFetch(`/api/admin/staff-requests/reject/${id}`, { method: "POST" });
      loadStaffRequests();
    } catch { alert("Error"); }
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
    }
    );

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
  const deleteDbPlace = async (id) => {
    if (!window.confirm("Delete this place permanently?")) return;
    await adminFetch(`/api/admin/place/${id}`, { method: "DELETE" });
    loadDbPlaces();
  };

  /* ================= DB FILTER LOGIC ================= */
  const filteredDbPlaces = dbPlaces.filter((p) => {
    if (
      dbSearch &&
      !p.name.toLowerCase().includes(dbSearch.toLowerCase())
    )
      return false;

    if (dbLat && dbLng && dbRadius) {
      const R = 6371;
      const dLat = ((p.location.lat - dbLat) * Math.PI) / 180;
      const dLng = ((p.location.lng - dbLng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((dbLat * Math.PI) / 180) *
        Math.cos((p.location.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
      const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return d <= dbRadius;
    }

    return true;
  });

  /* ================= UI ================= */
  return (
    <div className="admin-page">
      <button className="logout-btn" onClick={logout}>Logout</button>
      <h1 className="admin-title">WAITLY Admin Dashboard</h1>

      {/* ================= FETCH ================= */}
      <section className="admin-card">
        <h2> Fetch Places (OSM / Google)</h2>

        <div className="form-row">
          <select
            value={osmForm.category}
            onChange={(e) => setOsmForm({ ...osmForm, category: e.target.value })}
          >
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

          <input
            placeholder="Latitude"
            value={osmForm.lat}
            onChange={(e) =>
              setOsmForm({ ...osmForm, lat: e.target.value })
            }
          />

          <input
            placeholder="Longitude"
            value={osmForm.lng}
            onChange={(e) =>
              setOsmForm({ ...osmForm, lng: e.target.value })
            }
          />

          <button onClick={fetchOSM} disabled={loadingOSM}>
            {loadingOSM ? "Fetching OSM…" : "Fetch OSM"}
          </button>

          <button onClick={fetchGoogle} disabled={loadingGoogle}>
            {loadingGoogle ? "Fetching Google…" : "Fetch Google (currently not available)"}
          </button>
        </div>

        {fetchMessage && <p className="error-text">{fetchMessage}</p>}

        {osmResults.map((p, i) => (
          <div key={i} className="result-item">
            <strong>{p.name}</strong>
            <button className="primary" onClick={() => addPlaceDirect(p)}>
              Add Place
            </button>
          </div>
        ))}
      </section>

      {/* ================= SELECTED API PLACE ================= */}
      {pendingAddPlace && (
        <section className="admin-card">
          <h2>📍 Selected Place</h2>

          <p><strong>Name:</strong> {pendingAddPlace.name}</p>
          <p><strong>Latitude:</strong> {pendingAddPlace.lat}</p>
          <p><strong>Longitude:</strong> {pendingAddPlace.lng}</p>

          <input
            placeholder="Physical Address (optional)"
            value={pendingAddPlace.address}
            onChange={(e) =>
              setPendingAddPlace({
                ...pendingAddPlace,
                address: e.target.value
              })
            }
          />
        </section>
      )}

      {/* ================= COUNTERS ================= */}
      <section className="admin-card">
        <h2> Counters (Required)</h2>

        <div className="preset-counters">
          {presetCounters.map((c) => (
            <button
              key={c}
              className="secondary"
              onClick={() => addPresetCounter(c)}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="form-row">
          <input
            placeholder="Custom counter name"
            value={counterInput}
            onChange={(e) => setCounterInput(e.target.value)}
          />
          <button onClick={addCounter}>Add</button>
        </div>

        <div className="counter-list">
          {counters.map((c, i) => (
            <span key={i} className="counter-chip">
              {c}
              <button onClick={() => removeCounter(i)}>×</button>
            </span>
          ))}
        </div>
      </section>

      {/* ================= CONFIRM SAVE ================= */}
      {pendingAddPlace && (
        <section className="admin-card">
          <button className="approve" onClick={confirmAddPlace}>
            Confirm & Save Place
          </button>
        </section>
      )}

      {/* ================= MANUAL ADD ================= */}
      <section className="admin-card">
        <h2> Add Place Manually</h2>

        <div className="form-col">
          <input
            placeholder="Place name"
            value={manualForm.name}
            onChange={(e) =>
              setManualForm({ ...manualForm, name: e.target.value })
            }
          />

          <select
            value={manualForm.category}
            onChange={(e) =>
              setManualForm({ ...manualForm, category: e.target.value })
            }
          >
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

          <input
            placeholder="Address"
            value={manualForm.address}
            onChange={(e) =>
              setManualForm({ ...manualForm, address: e.target.value })
            }
          />

          <input
            placeholder="Latitude"
            value={manualForm.lat}
            onChange={(e) =>
              setManualForm({ ...manualForm, lat: e.target.value })
            }
          />

          <input
            placeholder="Longitude"
            value={manualForm.lng}
            onChange={(e) =>
              setManualForm({ ...manualForm, lng: e.target.value })
            }
          />

          <button className="primary" onClick={addManual}>
            Add Place
          </button>
        </div>
      </section>

      {/* ================= STAFF REQUESTS ================= */}
      <section className="admin-card">
        <h2>👨‍💼 Pending Staff Requests</h2>
        {staffRequests.length === 0 && <p className="muted">No pending staff requests</p>}

        {staffRequests.map(s => (
          <div key={s._id} className="result-item" style={{ borderLeft: "4px solid #3b82f6" }}>
            <div>
              <strong>{s.username}</strong> ({s.email})
              {s.application?.placeId ? (
                <div style={{ fontSize: "0.9em", color: "#007bff", marginTop: "5px" }}>
                  Requesting Access to: <strong>{s.application.placeId.name}</strong><br />
                  <span style={{ color: '#666' }}>{s.application.placeId.address}</span>
                </div>
              ) : (
                <div style={{ fontSize: "0.9em", color: "#555", marginTop: "5px" }}>
                  Requesting NEW Place: <strong>{s.requestDetails?.placeName}</strong><br />
                  Address: {s.requestDetails?.address}<br />
                  Counters: {s.requestDetails?.counters?.join(", ") || "General"}
                </div>
              )}
            </div>
            <div className="actions">
              <button className="approve" onClick={() => approveStaff(s._id)}>Approve</button>
              <button className="reject" onClick={() => rejectStaff(s._id)}>Reject</button>
            </div>
          </div>
        ))}
      </section>

      {/* ================= PENDING ================= */}
      <section className="admin-card">
        <h2> Pending Place Requests</h2>

        {pending.length === 0 && (
          <p className="muted">No pending requests</p>
        )}

        {pending.map((p) => (
          <div key={p._id} className="result-item">
            <strong>{p.name}</strong>

            <div className="actions">
              <button
                className="primary"
                onClick={() => {
                  setEditingPlace(p);
                  setJsonText(JSON.stringify(p, null, 2));
                }}
              >
                Edit JSON
              </button>

              <button className="approve" onClick={() => approve(p._id)}>
                Approve
              </button>

              <button className="reject" onClick={() => reject(p._id)}>
                Reject
              </button>
            </div>
          </div>
        ))}
      </section>

      {/* ================= JSON EDITOR (PENDING) ================= */}
      {editingPlace && (
        <section className="admin-card">
          <h2> Edit Pending JSON</h2>

          <textarea
            rows={18}
            className="json-editor"
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
          />

          <div className="actions">
            <button className="approve" onClick={approveEdited}>
              Approve & Save
            </button>

            <button
              className="reject"
              onClick={() => {
                setEditingPlace(null);
                setJsonText("");
              }}
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      {/* ================= DATABASE PLACES ================= */}
      <section className="admin-card">
        <h2> Database Places</h2>

        <input
          placeholder="Search by name"
          value={dbSearch}
          onChange={(e) => setDbSearch(e.target.value)}
        />

        <input
          placeholder="Center Latitude"
          value={dbLat}
          onChange={(e) => setDbLat(e.target.value)}
        />

        <input
          placeholder="Center Longitude"
          value={dbLng}
          onChange={(e) => setDbLng(e.target.value)}
        />

        <input
          placeholder="Radius (km)"
          value={dbRadius}
          onChange={(e) => setDbRadius(e.target.value)}
        />

        <button onClick={loadDbPlaces} disabled={loadingDb}>
          {loadingDb ? "Loading…" : "Load Database Places"}
        </button>

        {dbError && <p className="error-text">{dbError}</p>}

        {filteredDbPlaces.map((p) => (
          <div key={p._id} className="result-item">
            <strong>{p.name}</strong>

            <button
              className="primary"
              onClick={() => {
                setEditingDbPlace(p);
                setDbJsonText(JSON.stringify(p, null, 2));
              }}
            >
              Edit JSON
            </button>

            <button
              className="reject"
              onClick={() => deleteDbPlace(p._id)}
            >
              Delete
            </button>
          </div>
        ))}
      </section>

      {/* ================= DB JSON EDITOR ================= */}
      {editingDbPlace && (
        <section className="admin-card">
          <h2> Edit Database Place JSON</h2>

          <textarea
            rows={18}
            className="json-editor"
            value={dbJsonText}
            onChange={(e) => setDbJsonText(e.target.value)}
          />

          <div className="actions">
            <button className="approve" onClick={saveDbEdit}>
              Save Changes
            </button>

            <button
              className="reject"
              onClick={() => {
                setEditingDbPlace(null);
                setDbJsonText("");
              }}
            >
              Cancel
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
