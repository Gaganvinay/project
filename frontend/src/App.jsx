import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import VendorGraph from "./pages/VendorGraph";
import EventTimeline from "./pages/EventTimeline";
import Analytics from "./pages/Analytics";
export default function App() {
  return (
    <Router>
      <Navbar />
      <div className="container">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/vendor/:id" element={<VendorGraph />} />
          <Route path="/timeline" element={<EventTimeline />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/analytics/:id" element={<Analytics />} />
        </Routes>
      </div>
    </Router>
  );
}
