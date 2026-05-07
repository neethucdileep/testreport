import { listCampsForStaff, type Camp } from "@/lib/opsModel";
import { useAuth } from "@/state/useAuth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function OpsHomePage() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const [camps, setCamps] = useState<Camp[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    async function run() {
      if (!user?.uid) return;
      setErr(null);
      try {
        const data = await listCampsForStaff(user.uid);
        setCamps(data);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load camps");
      }
    }
    void run();
  }, [user?.uid]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="topbar">
        <div>
          <h1 className="h1">Select camp</h1>
          <p className="p">Logged in as {user?.email ?? "—"}</p>
        </div>
        <button className="btn btn-outline" onClick={() => signOut()}>
          Sign out
        </button>
      </div>

      {err ? <div className="error">{err}</div> : null}

      {camps.map((c) => (
        <button
          key={c.id}
          className="card"
          style={{ textAlign: "left", cursor: "pointer" }}
          onClick={() => nav(`/ops/camps/${c.id}/register`)}
        >
          <div style={{ fontWeight: 800, marginBottom: 6 }}>
            {c.campCode} — {c.campName}
          </div>
          <div className="muted">{c.employerName}</div>
          <div className="muted" style={{ marginTop: 6 }}>
            {c.startDate || "—"} → {c.endDate || "—"} • Roster: {c.rosterSource}
          </div>
        </button>
      ))}

      {camps.length === 0 ? (
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 6 }}>No camps assigned</div>
          <div className="muted">Ask admin to assign you to a camp.</div>
        </div>
      ) : null}
    </div>
  );
}

