import { useState } from "react";
import axios from "axios";

export default function EventForm({ onResult }) {
  const [vendorId, setVendorId] = useState("");
  const [eventType, setEventType] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:5000/api/events", {
        vendorId,
        eventType,
        metadata: {},
      });
      onResult(res.data);
    } catch (err) {
      console.error(err);
      alert("Error submitting event. See console.");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" placeholder="Vendor ID" value={vendorId} onChange={(e)=>setVendorId(e.target.value)} required />
      <input type="text" placeholder="Event Type" value={eventType} onChange={(e)=>setEventType(e.target.value)} required />
      <button type="submit">Submit</button>
    </form>
  );
}
