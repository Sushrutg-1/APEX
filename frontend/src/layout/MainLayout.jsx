import { Outlet } from "react-router-dom";

import Navbar from "../components/layout/Navbar";
import Sidebar from "../components/layout/Sidebar";

import "../styles/dashboard-layout.css";

function MainLayout() {
  return (
    <div className="apex-dashboard-layout">
      <Sidebar />

      <div className="apex-dashboard-main">
        <Navbar />

        <main className="apex-dashboard-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default MainLayout;