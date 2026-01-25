import { useState } from "react";
import "./AddPlaceModal.css";
import API_BASE from "../config/api";

export default function AddPlaceModal({ coords, onClose }) {
  const [form, setForm] = useState({
    name: "",
    category: "bank",
    address: "",
    lat: coords?.lat || "",
    lng: coords?.lng || "",
    counters: ["General"] // 🔥 counter NAMES only
  });

  const submit = async () => {
    if (!form.name) {
      alert("Place name required");
      return;
    }

    if (!form.counters.length || form.counters.some((c) => !c.trim())) {
      alert("Please enter at least one valid counter name");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/admin/pending/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          category: form.category,
          address: form.address || "",
          location: {
            lat: Number(form.lat),
            lng: Number(form.lng)
          },
          counters: form.counters // 🔥 names only
        })
      });

      if (!res.ok) {
        const err = await res.json();
        console.error("Submit failed:", err);
        alert("Failed to submit place");
        return;
      }

      alert("Place sent for admin approval ✅");
      onClose();
    } catch (err) {
      console.error("Network error:", err);
      alert("Server error");
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <h3>Add New Place</h3>

        {/* PLACE NAME */}
        <input
          placeholder="Place name *"
          value={form.name}
          onChange={(e) =>
            setForm({ ...form, name: e.target.value })
          }
        />

        {/* CATEGORY */}
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
        </select>

        {/* ADDRESS */}
        <input
          placeholder="Address (optional)"
          value={form.address}
          onChange={(e) =>
            setForm({ ...form, address: e.target.value })
          }
        />

        {/* COORDS */}
        <div className="coords-display">
          <label>Selected Latitude & Longitude</label>
          <div className="coords-values">
            <span><strong>Lat:</strong> {form.lat}</span>
            <span><strong>Lng:</strong> {form.lng}</span>
          </div>
        </div>

        {/* COUNTERS */}
        <h4>Counters</h4>

        {form.counters.map((counter, index) => (
          <input
            key={index}
            placeholder={`Counter ${index + 1}`}
            value={counter}
            onChange={(e) => {
              const copy = [...form.counters];
              copy[index] = e.target.value;
              setForm({ ...form, counters: copy });
            }}
          />
        ))}

        <button
          onClick={() =>
            setForm({
              ...form,
              counters: [...form.counters, ""]
            })
          }
        >
          + Add Counter
        </button>

        <div className="actions">
          <button onClick={submit} className="submit-btn">
            Submit
          </button>

          <button onClick={onClose} className="secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
