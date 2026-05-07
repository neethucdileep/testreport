import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "@/pages/LoginPage";
import ProfilePage from "@/pages/ProfilePage";
import { AuthProvider } from "@/state/AuthProvider";
import { useAuth } from "@/state/useAuth";
import MobileShell from "@/ui/MobileShell";
import AdminShell from "@/ui/admin/AdminShell";
import RequireAdmin from "@/ui/routing/RequireAdmin";
import RequireStaff from "@/ui/routing/RequireStaff";
import AdminLoginPage from "@/pages/admin/AdminLoginPage";
import AdminRegisterPage from "@/pages/admin/AdminRegisterPage";
import AdminHomePage from "@/pages/admin/AdminHomePage";
import AdminStaffPage from "@/pages/admin/AdminStaffPage";
import AdminCampsPage from "@/pages/admin/AdminCampsPage";
import AdminCampDetailPage from "@/pages/admin/AdminCampDetailPage";
import OpsLoginPage from "@/pages/ops/OpsLoginPage";
import OpsHomePage from "@/pages/ops/OpsHomePage";
import OpsRegisterPage from "@/pages/ops/OpsRegisterPage";

function RootRedirect() {
  const { user, isReady } = useAuth();
  if (!isReady) return null;
  return <Navigate to={user ? "/profile" : "/login"} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<RootRedirect />} />

        {/* Patient/public (existing flow) */}
        <Route
          path="/login"
          element={
            <MobileShell>
              <LoginPage />
            </MobileShell>
          }
        />
        <Route
          path="/profile"
          element={
            <MobileShell>
              <ProfilePage />
            </MobileShell>
          }
        />

        {/* Staff ops (mobile) */}
        <Route path="/ops/login" element={<OpsLoginPage />} />
        <Route element={<RequireStaff />}>
          <Route
            path="/ops"
            element={
              <MobileShell>
                <OpsHomePage />
              </MobileShell>
            }
          />
          <Route
            path="/ops/camps/:campId/register"
            element={
              <MobileShell>
                <OpsRegisterPage />
              </MobileShell>
            }
          />
        </Route>

        {/* Admin (desktop) */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/register" element={<AdminRegisterPage />} />
        <Route element={<RequireAdmin />}>
          <Route element={<AdminShell />}>
            <Route path="/admin" element={<AdminHomePage />} />
            <Route path="/admin/staff" element={<AdminStaffPage />} />
            <Route path="/admin/camps" element={<AdminCampsPage />} />
            <Route path="/admin/camps/:campId" element={<AdminCampDetailPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}
