import { createCamp, listCamps, type Camp } from "@/lib/opsModel";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminCampsPage() {
  const [items, setItems] = useState<Camp[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const nav = useNavigate();

  const [employerName, setEmployerName] = useState("");
  const [campName, setCampName] = useState("");
  const [campCode, setCampCode] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rosterSource, setRosterSource] = useState<"upload" | "none">("none");

  async function refresh() {
    setErr(null);
    const data = await listCamps();
    setItems(data);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, []);

  async function onCreate() {
    setErr(null);
    setBusy(true);
    try {
      const id = await createCamp({
        employerName: employerName.trim(),
        campName: campName.trim(),
        campCode: campCode.trim(),
        startDate,
        endDate,
        assignedStaffUids: [],
        rosterSource,
        required: {
          email: false,
          empId: true,
          height: false,
          weight: false,
          bp: false,
          tubes: true,
          urine: false,
        },
      });
      setEmployerName("");
      setCampName("");
      setCampCode("");
      setStartDate("");
      setEndDate("");
      setRosterSource("none");
      await refresh();
      nav(`/admin/camps/${id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to create camp");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="a-grid">
      <div className="a-card a-col-12">
        <h1 className="a-h1">Camps</h1>
        <p className="a-p">Create camps and assign staff. One camp = one employer.</p>
      </div>

      <div className="a-card a-col-6">
        <h2 style={{ margin: "0 0 10px", color: "#f8fafc", fontSize: 16 }}>Create camp</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <label className="a-label">Employer name</label>
            <input className="a-input" value={employerName} onChange={(e) => setEmployerName(e.target.value)} />
          </div>
          <div className="a-row">
            <div>
              <label className="a-label">Camp name</label>
              <input className="a-input" value={campName} onChange={(e) => setCampName(e.target.value)} />
            </div>
            <div>
              <label className="a-label">Camp code</label>
              <input className="a-input" value={campCode} onChange={(e) => setCampCode(e.target.value)} placeholder="e.g. KL162" />
            </div>
          </div>
          <div className="a-row">
            <div>
              <label className="a-label">Start date</label>
              <input className="a-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="a-label">End date</label>
              <input className="a-input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="a-label">Roster mode</label>
            <select className="a-select" value={rosterSource} onChange={(e) => setRosterSource(e.target.value as "upload" | "none")}>
              <option value="none">No roster (staff will add manually)</option>
              <option value="upload">Roster will be uploaded (staff can pick by emp id)</option>
            </select>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              className="a-btn a-btn-primary"
              onClick={onCreate}
              disabled={busy || employerName.trim().length < 2 || campName.trim().length < 2 || campCode.trim().length < 2}
            >
              {busy ? "Creating..." : "Create camp"}
            </button>
          </div>
          {err ? <div style={{ color: "#fecaca" }}>{err}</div> : null}
        </div>
      </div>

      <div className="a-card a-col-12">
        <h2 style={{ margin: "0 0 10px", color: "#f8fafc", fontSize: 16 }}>All camps</h2>
        <table className="a-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Camp</th>
              <th>Employer</th>
              <th>Dates</th>
              <th>Roster</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id}>
                <td><span className="a-badge">{c.campCode}</span></td>
                <td>{c.campName}</td>
                <td>{c.employerName}</td>
                <td>{c.startDate || "—"} → {c.endDate || "—"}</td>
                <td>{c.rosterSource === "upload" ? "Upload" : "None"}</td>
                <td>
                  <button className="a-btn a-btn-ghost" onClick={() => nav(`/admin/camps/${c.id}`)}>
                    Open
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ opacity: 0.7, padding: 12 }}>
                  No camps yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

