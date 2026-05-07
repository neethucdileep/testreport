import { listStaff, upsertStaffRecord, type Staff } from "@/lib/opsModel";
import { secondaryAuth } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useEffect, useMemo, useState } from "react";
import { adminSetStaffPassword } from "@/lib/adminFunctions";

export default function AdminStaffPage() {
  const [items, setItems] = useState<Staff[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pwTarget, setPwTarget] = useState<Staff | null>(null);
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const emailNorm = useMemo(() => email.trim().toLowerCase(), [email]);

  async function refresh() {
    setErr(null);
    setNotice(null);
    const data = await listStaff();
    setItems(data);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, []);

  async function onAdd() {
    setErr(null);
    setNotice(null);
    setBusy(true);
    try {
      const cred = await createUserWithEmailAndPassword(secondaryAuth, emailNorm, password);
      await upsertStaffRecord({
        uid: cred.user.uid,
        email: emailNorm,
        name,
        active: true,
      });
      setName("");
      setEmail("");
      setPassword("");
      await refresh();
      setNotice(`Created staff account for ${emailNorm}.`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to create staff");
    } finally {
      setBusy(false);
    }
  }

  async function setStaffPassword() {
    if (!pwTarget) return;
    setErr(null);
    setNotice(null);
    if (pw1.length < 6) {
      setErr("Password must be at least 6 characters.");
      return;
    }
    if (pw1 !== pw2) {
      setErr("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await adminSetStaffPassword({ staffUid: pwTarget.uid, newPassword: pw1 });
      setNotice(`Password updated for ${pwTarget.email}.`);
      setPwTarget(null);
      setPw1("");
      setPw2("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to set password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="a-grid">
      <div className="a-card a-col-12">
        <h1 className="a-h1">Staff</h1>
        <p className="a-p">Create staff accounts and manage password resets.</p>
        {notice ? (
          <div style={{ marginTop: 10, padding: 10, borderRadius: 12, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.18)", color: "var(--text-h)", fontSize: 13 }}>
            {notice}
          </div>
        ) : null}
      </div>

      {pwTarget ? (
        <div className="a-card a-col-6">
          <h2 style={{ margin: "0 0 10px", color: "var(--text-h)", fontSize: 16 }}>Set staff password</h2>
          <div className="a-p" style={{ marginBottom: 10 }}>
            {pwTarget.name} — <b>{pwTarget.email}</b>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <label className="a-label">New password</label>
              <input className="a-input" type="password" value={pw1} onChange={(e) => setPw1(e.target.value)} />
            </div>
            <div>
              <label className="a-label">Confirm password</label>
              <input className="a-input" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                className="a-btn a-btn-ghost"
                onClick={() => {
                  setPwTarget(null);
                  setPw1("");
                  setPw2("");
                }}
                disabled={busy}
              >
                Cancel
              </button>
              <button className="a-btn a-btn-primary" onClick={setStaffPassword} disabled={busy}>
                {busy ? "Saving..." : "Save password"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="a-card a-col-6">
        <h2 style={{ margin: "0 0 10px", color: "#f8fafc", fontSize: 16 }}>Add staff</h2>
        <div className="a-row">
          <div>
            <label className="a-label">Name</label>
            <input className="a-input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="a-label">Email</label>
            <input
              className="a-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="staff@company.com"
            />
            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>Saved as {emailNorm || "—"}</div>
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <label className="a-label">Temporary password</label>
          <input
            className="a-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 6 characters"
          />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
          <button
            className="a-btn a-btn-primary"
            onClick={onAdd}
            disabled={busy || name.trim().length < 2 || emailNorm.length < 5 || password.length < 6}
          >
            {busy ? "Saving..." : "Create staff"}
          </button>
        </div>
        {err ? <div style={{ marginTop: 10, color: "#fecaca" }}>{err}</div> : null}
      </div>

      <div className="a-card a-col-12">
        <h2 style={{ margin: "0 0 10px", color: "#f8fafc", fontSize: 16 }}>All staff</h2>
        <table className="a-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.uid}>
                <td>{s.name}</td>
                <td>{s.email}</td>
                <td>{s.active ? <span className="a-badge">Active</span> : <span className="a-badge">Disabled</span>}</td>
                <td style={{ textAlign: "right" }}>
                  <button
                    className="a-btn a-btn-ghost"
                    onClick={() => {
                      setErr(null);
                      setNotice(null);
                      setPwTarget(s);
                      setPw1("");
                      setPw2("");
                    }}
                    disabled={busy}
                    title="Set a new password for this staff"
                  >
                    Set password
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ opacity: 0.7, padding: 12 }}>
                  No staff yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

