import { useState } from "react";
import API_BASE from "../config/api";

export default function AddPlace() {
  const [form, setForm] = useState({
    name: "",
    category: "",
    address: "",
    lat: "",
    lng: ""
  });

  const submit = async () => {
    await fetch(`${API_BASE}/api/admin/add-place", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    alert("Place added");
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Add Place Manually</h2>

      {["name","category","address","lat","lng"].map(f => (
        <input
          key={f}
          placeholder={f}
          value={form[f]}
          onChange={e => setForm({ ...form, [f]: e.target.value })}
        />
      ))}

      <button onClick={submit}>Add</button>
    </div>
  );
}
