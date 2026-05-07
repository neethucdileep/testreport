import { userFacingAuthError } from "@/lib/access";
import { firebaseAuth } from "@/lib/firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";

type Props = {
  title: string;
  subtitle: string;
  mode: "login" | "register";
  onAuthed: (args: { uid: string; email: string }) => Promise<void> | void;
};

export default function EmailPasswordCard({ title, subtitle, mode, onAuthed }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function submit() {
    setStatus(null);
    setBusy(true);
    try {
      const cred =
        mode === "login"
          ? await signInWithEmailAndPassword(firebaseAuth, email.trim(), password)
          : await createUserWithEmailAndPassword(firebaseAuth, email.trim(), password);
      await onAuthed({ uid: cred.user.uid, email: cred.user.email ?? email.trim() });
    } catch (e) {
      setStatus(userFacingAuthError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="topbar">
        <div>
          <h1 className="h1">{title}</h1>
          <p className="p">{subtitle}</p>
        </div>
      </div>

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <label className="label">Email</label>
        <input
          className="input"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={busy}
          placeholder="name@company.com"
        />

        <label className="label">Password</label>
        <input
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={busy}
          placeholder="Min 6 characters"
        />

        <button className="btn btn-dark" onClick={submit} disabled={busy || email.trim().length < 5 || password.length < 6}>
          {busy ? "Please wait..." : mode === "login" ? "Login" : "Create account"}
        </button>

        {status ? <div className="error">{status}</div> : null}
      </div>
    </div>
  );
}

