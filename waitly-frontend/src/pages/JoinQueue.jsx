import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./JoinQueue.css";
import API_BASE from "../config/api";
import { io } from "socket.io-client";

export default function JoinQueue() {
  const { placeId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [place, setPlace] = useState(null);
  const [loading, setLoading] = useState(true);

  /* =========================
     STATE MANAGEMENT
     ========================= */
  const [step, setStep] = useState(1); // 1: Identity, 2: Category, 3: Type, 4: Details/Pay, 5: Success
  const [bookingType, setBookingType] = useState(null); // 'walkin' | 'slot'

  const [form, setForm] = useState({
    name: "",
    counterIndex: "",
    slotDateTime: "",
    categoryId: "general"
  });

  const [queueStats, setQueueStats] = useState(null);
  const [generatedToken, setGeneratedToken] = useState(null);

  // Date & Slot Logic
  const [selectedDate, setSelectedDate] = useState("");
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotInfo, setSlotInfo] = useState(null); // { openingTime, backlogMinutes }

  // Socket Trigger
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  useEffect(() => {
    const socket = io(API_BASE);
    socket.on("token-updated", () => setLastUpdate(Date.now()));
    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    if (form.counterIndex === "" || form.counterIndex === undefined) {
      setQueueStats(null);
      setAvailableSlots([]);
      return;
    }

    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/queue/stats?placeId=${placeId}&counterIndex=${form.counterIndex}&categoryId=${form.categoryId}`);
        if (res.ok) {
          const data = await res.json();
          setQueueStats(data);
        }
      } catch (e) {
        console.error("Failed to fetch queue stats", e);
      }
    };

    const fetchSlots = async () => {
      if (!selectedDate) {
        setAvailableSlots([]);
        return;
      }
      setLoadingSlots(true);
      try {
        const res = await fetch(`${API_BASE}/api/queue/available-slots?placeId=${placeId}&counterIndex=${form.counterIndex}&date=${selectedDate}&categoryId=${form.categoryId}`);
        if (res.ok) {
          const data = await res.json();
          setAvailableSlots(data.slots || []);
          setSlotInfo({
            openingTime: data.openingTime,
            closingTime: data.closingTime,
            backlogMinutes: data.backlogMinutes,
            message: data.message // Store the message
          });
        } else {
          setAvailableSlots([]);
        }
      } catch (e) {
        console.error("Slot fetch error", e);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchStats();
    fetchSlots();
  }, [form.counterIndex, placeId, selectedDate, form.categoryId, lastUpdate]);

  /* =========================
     FETCH PLACE BY ID
     ========================= */
  useEffect(() => {
    const loadPlace = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/location/place/${placeId}`
        );

        if (!res.ok) throw new Error("Place not found");

        const data = await res.json();
        setPlace(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadPlace();
  }, [placeId]);

  if (loading) {
    return <p style={{ padding: 20 }}>Loading place…</p>;
  }

  if (!place) {
    return <p style={{ padding: 20 }}>Invalid place</p>;
  }

  const counters = place.counters || [];

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const selectType = (type) => {
    setBookingType(type);
    if (type === 'walkin') {
      setForm(f => ({ ...f, slotDateTime: "" }));
    } else {
      // For slots, reset to default state so it shows "choose date..." message
      setSelectedDate("");
      setForm(f => ({ ...f, slotDateTime: "" }));
    }
    nextStep();
  };

  /* =========================
     STEP 2 → CREATE TOKEN
     ========================= */
  const confirmPayment = async () => {
    try {
      const token = localStorage.getItem('waitly_token');
      const headers = { "Content-Type": "application/json" };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const payload = {
        placeId,
        counterIndex: form.counterIndex,
        userName: form.name,
        categoryId: form.categoryId
      };

      if (bookingType === 'slot' && form.slotDateTime) {
        const dateObj = new Date(form.slotDateTime);
        payload.scheduledTime = dateObj.toISOString();

        // Format label: "10:30 AM" or "Feb 23, 10:30 AM"
        // Let's keep it simple: "Happy Hours: 10:30 AM"
        // actually just time is better
        const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateStr = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });

        payload.timeSlotLabel = `${dateStr}, ${timeStr}`;
      }

      const res = await fetch(`${API_BASE}/api/queue/join`, {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Unable to create ticket");
      }

      const data = await res.json();

      localStorage.setItem("waitly_token_id", data.tokenId);
      setGeneratedToken(data.tokenCode);

      setStep(5);
    } catch (err) {
      console.error(err);
      alert(err.message || "Unable to create ticket");
    }
  };

  /* =========================
     RENDER STEPS
     ========================= */

  /* SVG icon shortcuts */
  const SvgPin = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
  );
  const SvgMonitor = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" />
    </svg>
  );
  const SvgChevron = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
  const SvgBack = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );

  /* Place + Counter info — shown at the top of every card */
  const InfoBar = ({ showCounter = true }) => (
    <div className="info-bar">
      <div className="info-item">
        <span className="info-label">Place</span>
        <span className="info-value">{place.name}</span>
      </div>
      {showCounter && form.counterIndex !== "" && (
        <div className="info-item">
          <span className="info-label">Counter</span>
          <span className="info-value">{counters[form.counterIndex]?.name}</span>
        </div>
      )}
    </div>
  );

  /* Step progress indicator */
  const StepBar = ({ current }) => (
    <div className="step-bar">
      {[1, 2, 3, 4].map(n => (
        <div key={n} className={`step-seg ${n < current ? 'done' : n === current ? 'active' : ''}`} />
      ))}
    </div>
  );

  return (
    <div className="join-page">

      {/* ── STEP 1: IDENTITY ── */}
      {step === 1 && (
        <div className="join-card fade-in">
          <div className="place-header" style={{ flexDirection: 'column', alignItems: 'center' }}>
            <h1 className="place-header-name" style={{ margin: 0 }}>{place.name}</h1>
            {form.counterIndex !== "" && form.counterIndex !== undefined && counters[form.counterIndex] && (
              <div style={{ fontSize: '0.85rem', color: '#6366f1', fontWeight: '600', marginTop: '4px', textAlign: 'center' }}>
                {counters[form.counterIndex].name}
              </div>
            )}
          </div>

          <div className="card-header">
            <h2>Join Queue</h2>
            <p className="modal-sub">Enter your details to get started</p>
          </div>

          <div className="input-group">
            <div className="input-icon-wrap">
              <span className="input-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="7" r="4" /><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
                </svg>
              </span>
              <input
                placeholder="Enter your full name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                autoFocus
              />
            </div>
          </div>

          <div className="input-group">
            <div className="input-icon-wrap">
              <span className="input-icon"><SvgMonitor /></span>
              <select
                value={form.counterIndex}
                onChange={(e) => setForm({ ...form, counterIndex: e.target.value })}
              >
                <option value="" disabled hidden>Choose a counter…</option>
                {counters.map((counter, index) => (
                  <option key={counter.name} value={index}>{counter.name}</option>
                ))}
              </select>
            </div>
          </div>

          <button className="pay-btn" disabled={!form.name || form.counterIndex === ""} onClick={nextStep}>
            Continue <SvgChevron />
          </button>
          <button className="text-btn" onClick={() => navigate("/map")}>Cancel</button>
        </div>
      )}

      {/* ── STEP 2: CATEGORY ── */}
      {step === 2 && (
        <div className="join-card fade-in">
          <button className="back-link-btn" onClick={prevStep}><SvgBack /> Back</button>
          <div className="place-header" style={{ flexDirection: 'column', alignItems: 'center' }}>
            <h1 className="place-header-name" style={{ margin: 0 }}>{place.name}</h1>
            {form.counterIndex !== "" && form.counterIndex !== undefined && counters[form.counterIndex] && (
              <div style={{ fontSize: '0.85rem', color: '#6366f1', fontWeight: '600', marginTop: '4px', textAlign: 'center' }}>
                {counters[form.counterIndex].name}
              </div>
            )}
          </div>

          <div className="card-header">
            <h2>Type of Work</h2>
            <p className="modal-sub">What do you need help with?</p>
          </div>

          <div className="category-selection-grid">
            {(counters[form.counterIndex]?.services?.length > 0
              ? counters[form.counterIndex].services
              : [{ name: "General Service", categoryId: "general" }]
            ).map((cat) => (
              <button
                key={cat.categoryId}
                className={`category-chip ${form.categoryId === cat.categoryId ? 'selected' : ''}`}
                onClick={() => { setForm({ ...form, categoryId: cat.categoryId }); nextStep(); }}
              >
                <span className="chip-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </span>
                <span className="cat-name">{cat.name}</span>
                <span className="cat-arrow"><SvgChevron /></span>
              </button>
            ))}

          </div>
        </div>
      )}

      {/* ── STEP 3: BOOKING TYPE ── */}
      {step === 3 && (
        <div className="join-card fade-in">
          <button className="back-link-btn" onClick={prevStep}><SvgBack /> Back</button>
          <div className="place-header" style={{ flexDirection: 'column', alignItems: 'center' }}>
            <h1 className="place-header-name" style={{ margin: 0 }}>{place.name}</h1>
            {form.counterIndex !== "" && form.counterIndex !== undefined && counters[form.counterIndex] && (
              <div style={{ fontSize: '0.85rem', color: '#6366f1', fontWeight: '600', marginTop: '4px', textAlign: 'center' }}>
                {counters[form.counterIndex].name}
              </div>
            )}
          </div>

          <div className="card-header">
            <h2>Choose Option</h2>
            <p className="modal-sub">How would you like to join?</p>
          </div>

          <div className="booking-options">
            <button
              className={`option-card ${counters[form.counterIndex]?.walkinPercent === 0 ? "faded" : ""}`}
              onClick={() => selectType('walkin')}
              disabled={counters[form.counterIndex]?.walkinPercent === 0}
            >
              <div className="icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div className="info">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                  <h3>Tatkal</h3>
                  {queueStats && (
                    <span style={{ fontSize: '11px', fontWeight: '700', color: queueStats?.remainingTatkal > 0 ? '#10b981' : '#ef4444', background: queueStats?.remainingTatkal > 0 ? '#f0fdf4' : '#fef2f2', padding: '2px 6px', borderRadius: '4px' }}>
                      {queueStats?.remainingTatkal || 0} Left
                    </span>
                  )}
                </div>
                <p>Get your token now and wait your turn in the live queue.</p>
              </div>
              <div className="arrow"><SvgChevron /></div>
            </button>

            <button
              className={`option-card ${counters[form.counterIndex]?.walkinPercent === 100 ? "faded" : ""}`}
              onClick={() => selectType('slot')}
              disabled={counters[form.counterIndex]?.walkinPercent === 100}
            >
              <div className="icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div className="info">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                  <h3>Book a Future Slot</h3>
                  {queueStats && (
                    <span style={{ fontSize: '11px', fontWeight: '700', color: queueStats?.remainingSlotted > 0 ? '#3b82f6' : '#ef4444', background: queueStats?.remainingSlotted > 0 ? '#eff6ff' : '#fef2f2', padding: '2px 6px', borderRadius: '4px' }}>
                      {queueStats?.remainingSlotted || 0} Left
                    </span>
                  )}
                </div>
                <p>Pick a time slot and arrive when it's your turn.</p>
              </div>
              <div className="arrow"><SvgChevron /></div>
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: DETAILS & PAYMENT ── */}
      {step === 4 && (
        <div className="join-card fade-in">
          <button className="back-link-btn" onClick={prevStep}><SvgBack /> Back</button>
          <div className="place-header" style={{ flexDirection: 'column', alignItems: 'center' }}>
            <h1 className="place-header-name" style={{ margin: 0 }}>{place.name}</h1>
            {form.counterIndex !== "" && form.counterIndex !== undefined && counters[form.counterIndex] && (
              <div style={{ fontSize: '0.85rem', color: '#6366f1', fontWeight: '600', marginTop: '4px', textAlign: 'center' }}>
                {counters[form.counterIndex].name}
              </div>
            )}
          </div>

          {bookingType === 'walkin' ? (
            <>
              <div className="card-header">
                <h2>Queue Overview</h2>
                <p className="modal-sub">Live queue status</p>
              </div>
              {queueStats && (
                <div className="stats-summary-box">
                  <div className="stat-item">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                    </svg>
                    <span className="lbl">People Ahead</span>
                    <span className="val">{queueStats.peopleAhead}</span>
                  </div>
                  <div className="stat-divider" />
                  <div className="stat-item">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span className="lbl">Est. Wait</span>
                    <span className="val">{queueStats.estimatedWait}<small>m</small></span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="card-header">
                <h2>Select Time Slot</h2>
                <p className="modal-sub">Pick your preferred time</p>
              </div>
              <div className="slot-selection-area">
                <label className="form-label-small">Select Date</label>
                <input
                  type="date"
                  min={(() => {
                    const d = new Date();
                    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                  })()}
                  value={selectedDate}
                  onChange={e => { setSelectedDate(e.target.value); setForm({ ...form, slotDateTime: "" }); }}
                  className="date-input-styled"
                />
                {loadingSlots ? (
                  <div className="loading-slots">Finding available slots…</div>
                ) : (
                  <div className="slots-reveal-wrapper">
                    <label className="form-label-small">Available Slots</label>
                    {availableSlots.length > 0 ? (
                      <div className="slots-grid">
                        {availableSlots.map(slot => {
                          const timeLabel = new Date(slot).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                          return (
                            <button
                              key={slot}
                              className={`slot-btn ${form.slotDateTime === slot ? 'selected' : ''}`}
                              onClick={() => setForm({ ...form, slotDateTime: slot })}
                            >
                              {timeLabel}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="no-slots-msg">
                        {!selectedDate ? "Choose a date to see available slots" : (slotInfo?.message || "No slots available for this date.")}
                      </div>
                    )}
                  </div>
                )}
                {form.slotDateTime && (
                  <div className="selected-slot-msg">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <strong>{new Date(form.slotDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong> — Slotted Ticket
                  </div>
                )}
              </div>
            </>
          )}

          <div className="payment-footer">
            <div className="price-tag">
              <span>Total to Pay</span>
              <strong>₹20</strong>
            </div>
            <button
              className="pay-btn"
              onClick={confirmPayment}
              disabled={bookingType === 'slot' && !form.slotDateTime}
            >
              Pay &amp; Join Queue <SvgChevron />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 5: SUCCESS ── */}
      {step === 5 && (
        <div className="join-card fade-in">
          <div className="place-header" style={{ flexDirection: 'column', alignItems: 'center' }}>
            <h1 className="place-header-name" style={{ margin: 0 }}>{place.name}</h1>
            {form.counterIndex !== "" && form.counterIndex !== undefined && counters[form.counterIndex] && (
              <div style={{ fontSize: '0.85rem', color: '#6366f1', fontWeight: '600', marginTop: '4px', textAlign: 'center' }}>
                {counters[form.counterIndex].name}
              </div>
            )}
          </div>


          <div className="success-icon-wrap">
            <div className="success-ring">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>

          <div className="card-header center">
            <h2>You're In!</h2>
            <p className="modal-sub">
              {bookingType === 'slot' ? "Scheduled slot confirmed." : "Added to the live queue."}
            </p>
          </div>

          <div className="token-reveal">
            <span className="lbl">YOUR TOKEN</span>
            <span className="val">{generatedToken}</span>
          </div>

          <button className="pay-btn" onClick={() => navigate("/user/dashboard")}>
            View My Ticket
          </button>
          <button className="text-btn" onClick={() => navigate("/map")}>Return to Map</button>
        </div>
      )}
    </div>
  );
}
