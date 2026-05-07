import { Navigate, Outlet } from "react-router-dom";
import { useAccess } from "@/state/useAccess";

export default function RequireAdmin() {
  const { isReady, isAuthed, access, loading } = useAccess();

  if (!isReady) return null;
  if (!isAuthed) return <Navigate to="/admin/login" replace />;
  if (loading || !access) return null;
  if (access?.kind !== "admin") return <Navigate to="/admin/login" replace />;
  return <Outlet />;
}

