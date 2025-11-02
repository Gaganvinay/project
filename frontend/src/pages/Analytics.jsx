import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function Analytics() {
  const [vendors, setVendors] = useState([]);
  const [vendorId, setVendorId] = useState("");
  const [scores, setScores] = useState([]);

  // ✅ Load unique vendors from event history
  useEffect(() => {
    axios.get(`${API_URL}/events/all`)
      .then(res => {
        const uniqueVendors = [...new Set(res.data.events.map(e => e.vendorId))];
        setVendors(uniqueVendors);
      })
      .catch(err => {
        console.error("Failed to load vendors", err);
        alert("Failed to load vendor list. Check backend /api/events/all");
      });
  }, []);

  // ✅ Load scores when vendor selected
  const loadVendorScores = async (vid) => {
    setVendorId(vid);
    if (!vid) return;

    try {
      const res = await axios.get(`${API_URL}/events/${vid}`);
      const data = res.data.events.reverse();

      const formatted = data.map(e => {
  console.log("Event Prediction:", e.prediction); // ✅ debug print

  const p = e.prediction || {};
  return {
    time: new Date(e.timestamp).toLocaleTimeString(),

    // handle all possible score field names
    gnn:
      p.gnn_score ??
      p.engagement_prob ??
      p.predicted_prob ??
      p.score ??
      p.probability ??
      null
  };
});


      setScores(formatted);
    } catch (err) {
      console.error("Failed to load vendor data", err);
      alert("Failed to load vendor data. Check backend endpoint /api/events/:vendorId");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>📈 GNN Engagement Score Analytics</h2>

      <label>Select Vendor: </label>
      <select
        value={vendorId}
        onChange={(e) => loadVendorScores(e.target.value)}
      >
        <option value="">-- Choose Vendor --</option>
        {vendors.map(v => (
          <option key={v} value={v}>{v}</option>
        ))}
      </select>

      <div style={{ height: "400px", marginTop: 30 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={scores}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis domain={[0,1]} />
            <Tooltip />
<XAxis dataKey="time" stroke="#000" />
<YAxis domain={[0, 1]} stroke="#000" label={{ value: "GNN Score", angle: -90, position: "insideLeft" }}/>

            <Line
              type="monotone"
              dataKey="gnn"
              stroke="#000"
              name="GNN Score"
              dot={{ r: 4 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
