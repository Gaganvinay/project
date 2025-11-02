import { useState } from "react";
import EventForm from "../components/EventForm";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const [result, setResult] = useState(null);

  return (
    <div>
      <h2>Vendor Engagement Dashboard</h2>
      <EventForm onResult={setResult} />

      {result && (
        <div className="result-box">
          <h3>Prediction Result</h3>
          <p><strong>Vendor:</strong> {result.event?.vendorId ?? result.vendorId}</p>
          <pre>{JSON.stringify(result.prediction ?? result, null, 2)}</pre>
          <Link to={`/vendor/${result.event?.vendorId ?? result.vendorId}`}>View Graph →</Link>
        </div>
      )}
    </div>
  );
}
