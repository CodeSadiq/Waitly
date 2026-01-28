import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AddPlaceModal.css";
import API_BASE from "../config/api";

export default function AddPlaceModal({ coords, onClose }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    category: "bank",
    address: "",
    lat: coords?.lat || "",
    lng: coords?.lng || "",
    counters: ["General"]
  });

  const [otherCategory, setOtherCategory] = useState("");
  const [counterInput, setCounterInput] = useState("");
  const [successPopup, setSuccessPopup] = useState(false);
  const [popupMsg, setPopupMsg] = useState("");

  const showPopup = (msg) => setPopupMsg(msg);

  const submit = async () => {
    if (!form.name) {
      showPopup("Place name required");
      return;
    }

    if (!form.counters.length) {
      showPopup("Please add at least one counter");
      return;
    }

    const token = localStorage.getItem("waitly_token");
    if (!token) {
      showPopup("Please login to your account to add a new place.");
      return;
    }

    const finalCategory =
      form.category === "other" ? otherCategory.trim() : form.category;

    try {
      const res = await fetch(`${API_BASE}/api/admin/pending/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name: form.name.trim(),
          category: finalCategory,
          address: form.address || "",
          location: {
            lat: Number(form.lat),
            lng: Number(form.lng)
          },
          counters: form.counters
        })
      });

      if (!res.ok) {
        if (res.status === 401) {
          showPopup("Session expired. Please login again.");
        } else {
          showPopup("Failed to submit place");
        }
        return;
      }

      setSuccessPopup(true);
    } catch (err) {
      console.error("Network error:", err);
      showPopup("Server error");
    }
  };

  const addCounter = () => {
    if (!counterInput.trim()) return;

    setForm({
      ...form,
      counters: [...form.counters, counterInput.trim()]
    });

    setCounterInput("");
  };

  const removeCounter = (i) => {
    setForm({
      ...form,
      counters: form.counters.filter((_, index) => index !== i)
    });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <h3>Add New Place</h3>

        <input
          placeholder="Place name *"
          value={form.name}
          onChange={(e) =>
            setForm({ ...form, name: e.target.value })
          }
        />

        <select
          value={form.category}
          onChange={(e) =>
            setForm({ ...form, category: e.target.value })
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
          <option value="other">Other</option>
        </select>

        {form.category === "other" && (
          <input
            placeholder="Other category"
            value={otherCategory}
            onChange={(e) => setOtherCategory(e.target.value)}
          />
        )}

        <input
          placeholder="Address (optional)"
          value={form.address}
          onChange={(e) =>
            setForm({ ...form, address: e.target.value })
          }
        />

        <div className="coords-display">
          <span>Lat: {form.lat}</span>
          <span>Lng: {form.lng}</span>
        </div>

        <h4>Counters</h4>

        {/* ADDED COUNTERS */}
        <div className="counter-tags">
          {form.counters.map((c, i) => (
            <span key={i} className="counter-tag">
              {c}
              <button onClick={() => removeCounter(i)}>×</button>
            </span>
          ))}
        </div>

        {/* INPUT */}
        <div className="counter-input">
          <input
            placeholder="Enter counter name"
            value={counterInput}
            onChange={(e) => setCounterInput(e.target.value)}
          />
          <button onClick={addCounter}>Add</button>
        </div>

        <div className="actions">
          <button onClick={submit} className="submit-btn">
            Submit
          </button>

          <button onClick={onClose} className="secondary">
            Cancel
          </button>
        </div>
      </div>

      {(successPopup || popupMsg) && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>{successPopup ? "✅ Submitted" : "⚠️ Message"}</h3>
            <p>
              {successPopup
                ? "Place sent for admin approval"
                : popupMsg}
            </p>
            <button
              onClick={() => {
                const isSessionExpired = popupMsg === "Session expired. Please login again.";

                setPopupMsg("");
                if (successPopup) onClose();
                setSuccessPopup(false);

                if (isSessionExpired) {
                  navigate("/login");
                }
              }}
              className="submit-btn"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
