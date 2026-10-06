import { Menu } from 'lucide-react';
import { Link } from 'react-router-dom';

function LandingNavbar() {
  return (
    <header className="landing-navbar">
      <Link to="/" className="navbar-logo">
        <img src="/brand/logo.svg" alt="APEX" />
      </Link>

      <nav className="navbar-links">
        <a href="#features">Features</a>
        <a href="#platform">Platform</a>

        <Link to="/login">Login</Link>

        <Link to="/signup" className="navbar-signup">
          Sign Up
        </Link>
      </nav>

      <button type="button" className="navbar-menu" aria-label="Open menu">
        <Menu size={22} />
      </button>
    </header>
  );
}

export default LandingNavbar;
