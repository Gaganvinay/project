import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav>
      <h1>Vendor BGAC Dashboard</h1>
      <div>
        <Link to="/">Dashboard</Link>
        <Link to="/analytics">Analytics</Link>
      </div>
    </nav>
  );
}
