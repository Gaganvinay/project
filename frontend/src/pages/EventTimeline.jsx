import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import axios from "axios";

export default function EventTimeline() {
  const [events, setEvents] = useState([]);
  const vendorId = "TEST1"; // Hardcoded for demo (you can replace with dynamic later)

  useEffect(() => {
    axios
      .get(`http://localhost:5000/api/events/${vendorId}`)
      .then((res) => {
        // Format events into timeline-friendly data
        const formatted = res.data.map((e, idx) => ({
          time: new Date(e.timestamp).toLocaleTimeString(),
          eventType: e.eventType,
          index: idx + 1,
        }));
        setEvents(formatted);
      })
      .catch((err) => console.error("Error fetching events", err));
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h2>Event Timeline for {vendorId}</h2>
      {events.length > 0 ? (
        <LineChart
          width={800}
          height={400}
          data={events}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis dataKey="index" />
          <Tooltip formatter={(val, name, props) => props.payload.eventType} />
          <Line
            type="monotone"
            dataKey="index"
            stroke="#8884d8"
            activeDot={{ r: 8 }}
          />
        </LineChart>
      ) : (
        <p>No events found for this vendor.</p>
      )}
    </div>
  );
}
