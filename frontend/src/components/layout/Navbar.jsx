import { ChevronDown, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { logout } from '../../redux/slices/authSlice';

import './Navbar.css';

function Navbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { user, vehicle } = useSelector((state) => state.auth);
  const { status } = useSelector((state) => state.vehicle);

  const [showMenu, setShowMenu] = useState(false);

  const username = user?.username || 'Unavailable';
  const role = user?.role || 'Unavailable';
  const vehicleId = vehicle?.vehicleId || 'Unavailable';

  const initials = username !== 'Unavailable' ? username.slice(0, 2).toUpperCase() : '--';

  const isOnline = status === 'online';

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login', { replace: true });
  };

  return (
    <header className="apex-navbar">
      <div className="apex-navbar-vehicle">
        <span className="apex-navbar-label">VEHICLE</span>

        <div className="apex-navbar-vehicle-name">
          <span className={`apex-navbar-status-dot ${isOnline ? 'online' : 'offline'}`} />

          <span>{vehicleId}</span>
        </div>
      </div>

      <div className="apex-navbar-actions">
        <div className="apex-account">
          <button
            type="button"
            className="apex-account-button"
            onClick={() => setShowMenu((value) => !value)}
            aria-expanded={showMenu}
          >
            <span className="apex-avatar">{initials}</span>

            <span className="apex-account-details">
              <strong>{username}</strong>
              <small>{role}</small>
            </span>

            <ChevronDown size={16} strokeWidth={1.8} />
          </button>

          {showMenu && (
            <div className="apex-account-menu">
              <div className="apex-account-menu-user">
                <strong>{username}</strong>
                <span>{role}</span>
              </div>

              <button type="button" className="apex-logout-button" onClick={handleLogout}>
                <LogOut size={15} />
                <span>Sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
