import MobileShell from "@/ui/MobileShell";
import EmailPasswordCard from "@/ui/auth/EmailPasswordCard";
import { resolveAccessForUser } from "@/lib/access";
import { doc, serverTimestamp, setDoc } from "firebase/firestore/lite";
import { firestore } from "@/lib/firebase";
import { useNavigate } from "react-router-dom";

export default function AdminRegisterPage() {
  const nav = useNavigate();

  return (
    <MobileShell>
      <EmailPasswordCard
        title="Admin registration"
        subtitle="Create the first admin account (use only once)."
        mode="register"
        onAuthed={async ({ uid, email }) => {
          // resolveAccessForUser will auto-bootstrap on localhost if no admins exist.
          const access = await resolveAccessForUser({ uid, email });
          if (access.kind !== "admin") {
            // Fallback: explicitly create admin record (useful if rules allow it)
            await setDoc(
              doc(firestore, "admins", uid),
              { uid, email, createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
              { merge: true },
            );
          }
          nav("/admin", { replace: true });
        }}
      />
    </MobileShell>
  );
}

