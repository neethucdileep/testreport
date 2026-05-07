import "@/ui/admin/admin.css";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/state/useAuth";

export default function AdminShell() {
  const { signOut } = useAuth();

  return (
    <div className="admin-root">
      <header className="admin-header">
        <div className="admin-brand">
          <div className="admin-logo">B</div>
          <div>
            <div className="admin-title">Bloodlyf Ops</div>
            <div className="admin-subtitle">Admin</div>
          </div>
        </div>

        <div className="admin-actions">
          <button className="a-btn a-btn-ghost" onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      </header>

      <div className="admin-body">
        <aside className="admin-nav">
          <NavLink to="/admin" end className={({ isActive }) => (isActive ? "a-nav a-nav-on" : "a-nav")}>
            Overview
          </NavLink>
          <NavLink
            to="/admin/staff"
            className={({ isActive }) => (isActive ? "a-nav a-nav-on" : "a-nav")}
          >
            Staff
          </NavLink>
          <NavLink
            to="/admin/camps"
            className={({ isActive }) => (isActive ? "a-nav a-nav-on" : "a-nav")}
          >
            Camps
          </NavLink>
        </aside>

        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

