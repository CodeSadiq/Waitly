import { useState } from "react";
import "./AddPlaceModal.css";

export default function AddPlaceModal({ coords, onClose }) {
  const [form, setForm] = useState({
    name: "",
    category: "bank",
    address: "",
    lat: coords?.lat || "",
    lng: coords?.lng || "",
    counters: [{ name: "General" }]
  });

  const submit = async () => {
    if (!form.name) {
      alert("Place name required");
      return;
    }

    await fetch("http://localhost:5000/api/admin/pending/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        category: form.category,
        address: form.address || "User submitted",
        location: {
          lat: form.lat,
          lng: form.lng
        },
        counters: form.counters,
        source: "user-map"
      })
    });

    alert("Place sent for admin approval ✅");
    onClose();
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
          <option value="college">College</option>
        </select>

        {/* ADDRESS (OPTIONAL) */}
        <input
          placeholder="Address (optional)"
          value={form.address}
          onChange={(e) =>
            setForm({ ...form, address: e.target.value })
          }
        />

        {/* SELECTED LATITUDE & LONGITUDE (PROFESSIONAL VIEW) */}
        <div className="coords-display">
          <label>Selected Latitude & Longitude</label>
          <div className="coords-values">
            <span>
              <strong>Lat:</strong> {form.lat}
            </span>
            <span>
              <strong>Lng:</strong> {form.lng}
            </span>
          </div>
        </div>

        {/* COUNTERS */}
        <h4>Counters</h4>
        {form.counters.map((c, i) => (
          <input
            key={i}
            placeholder="Counter name"
            value={c.name}
            onChange={(e) => {
              const copy = [...form.counters];
              copy[i].name = e.target.value;
              setForm({ ...form, counters: copy });
            }}
          />
        ))}

        <button
          onClick={() =>
            setForm({
              ...form,
              counters: [...form.counters, { name: "" }]
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
