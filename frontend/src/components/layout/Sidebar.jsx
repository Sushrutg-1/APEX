import { Activity, Clock3, Image, LayoutDashboard, ShieldAlert } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';

import './Sidebar.css';

function Sidebar() {
  const { deviceStatus } = useSelector((state) => state.vehicle);

  const isOnline = deviceStatus === 'online';

  return (
    <aside className="apex-sidebar">
      <div className="apex-sidebar-brand">
        <img src="/brand/logo-dark.svg" alt="APEX" />
      </div>

      <nav className="apex-sidebar-nav">
        <span className="apex-sidebar-title">WORKSPACE</span>

        <NavLink
          to="/dashboard"
          end
          className={({ isActive }) => `apex-sidebar-link ${isActive ? 'active' : ''}`}
        >
          <LayoutDashboard size={18} strokeWidth={1.8} />
          <span>Overview</span>
        </NavLink>

        <NavLink
          to="/dashboard/control"
          className={({ isActive }) => `apex-sidebar-link ${isActive ? 'active' : ''}`}
        >
          <Activity size={18} strokeWidth={1.8} />
          <span>Control</span>
        </NavLink>

        <NavLink
          to="/dashboard/events"
          className={({ isActive }) => `apex-sidebar-link ${isActive ? 'active' : ''}`}
        >
          <ShieldAlert size={18} strokeWidth={1.8} />
          <span>Events</span>
        </NavLink>

        <NavLink
          to="/dashboard/snapshots"
          className={({ isActive }) => `apex-sidebar-link ${isActive ? 'active' : ''}`}
        >
          <Image size={18} strokeWidth={1.8} />
          <span>Snapshots</span>
        </NavLink>

        <NavLink
          to="/dashboard/history"
          className={({ isActive }) => `apex-sidebar-link ${isActive ? 'active' : ''}`}
        >
          <Clock3 size={18} strokeWidth={1.8} />
          <span>History</span>
        </NavLink>
      </nav>

      <div className="apex-sidebar-bottom">
        <div className="apex-sidebar-connection">
          <span className={`apex-sidebar-connection-dot ${isOnline ? 'online' : 'offline'}`} />

          <div>
            <strong>{isOnline ? 'Rover Online' : 'Rover Offline'}</strong>

            <span>{isOnline ? 'Authenticated device connected' : 'No device connection'}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
