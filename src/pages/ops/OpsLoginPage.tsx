import { useNavigate } from "react-router-dom";
import MobileShell from "@/ui/MobileShell";
import EmailPasswordCard from "@/ui/auth/EmailPasswordCard";
import { resolveAccessForUser } from "@/lib/access";

export default function OpsLoginPage() {
  const navigate = useNavigate();

  return (
    <MobileShell>
      <EmailPasswordCard
        title="Staff login"
        subtitle="Login with your staff email and password."
        mode="login"
        onAuthed={async ({ email, uid }) => {
          const access = await resolveAccessForUser({ uid, email });
          if (access.kind !== "staff") {
            throw new Error("This account is not registered as staff. Please contact admin.");
          }
          navigate("/ops", { replace: true });
        }}
      />
    </MobileShell>
  );
}

