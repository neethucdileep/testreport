import MobileShell from "@/ui/MobileShell";
import { useNavigate } from "react-router-dom";
import EmailPasswordCard from "@/ui/auth/EmailPasswordCard";
import { resolveAccessForUser } from "@/lib/access";
import { Link } from "react-router-dom";

export default function AdminLoginPage() {
  const navigate = useNavigate();

  return (
    <MobileShell>
      <div>
        <EmailPasswordCard
          title="Admin login"
          subtitle="Login with your admin email and password."
          mode="login"
          onAuthed={async ({ email, uid }) => {
            const access = await resolveAccessForUser({ uid, email });
            if (access.kind !== "admin") {
              throw new Error("This account is not an admin.");
            }
            navigate("/admin", { replace: true });
          }}
        />
        <div className="card" style={{ marginTop: 12, textAlign: "left" }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>First time?</div>
          <div className="muted" style={{ marginBottom: 10 }}>
            Create the first admin account here (localhost only auto-bootstrap).
          </div>
          <Link className="btn btn-outline" to="/admin/register" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
            Create admin account
          </Link>
        </div>
      </div>
    </MobileShell>
  );
}

