import { Navigate, Outlet } from "react-router-dom";
import { useAccess } from "@/state/useAccess";

export default function RequireStaff() {
  const { isReady, isAuthed, access, loading } = useAccess();

  if (!isReady) return null;
  if (!isAuthed) return <Navigate to="/ops/login" replace />;
  if (loading || !access) return null;
  if (access?.kind !== "staff") return <Navigate to="/ops/login" replace />;
  return <Outlet />;
}

