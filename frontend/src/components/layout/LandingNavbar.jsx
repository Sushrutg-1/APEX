import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Link } from 'react-router-dom';

function LandingNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="landing-navbar">
      <Link to="/" className="navbar-logo">
        <img src="/brand/logo.svg" alt="APEX" />
      </Link>

      <nav className={`navbar-links${menuOpen ? ' is-open' : ''}`} id="landing-navigation">
        <a href="#features" onClick={() => setMenuOpen(false)}>Features</a>
        <a href="#platform" onClick={() => setMenuOpen(false)}>Platform</a>

        <Link to="/login" onClick={() => setMenuOpen(false)}>Login</Link>

        <Link to="/signup" className="navbar-signup" onClick={() => setMenuOpen(false)}>
          Sign Up
        </Link>
      </nav>

      <button
        type="button"
        className="navbar-menu"
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={menuOpen}
        aria-controls="landing-navigation"
        onClick={() => setMenuOpen((isOpen) => !isOpen)}
      >
        <Menu size={22} />
      </button>
    </header>
  );
}

export default LandingNavbar;
