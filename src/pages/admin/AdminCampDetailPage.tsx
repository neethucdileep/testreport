import { downloadTextFile, parseCsv, toCsv } from "@/lib/csv";
import {
  getCamp,
  listEncounters,
  listStaff,
  setCampStaffUids,
  upsertRosterRow,
  type Camp,
  type Encounter,
} from "@/lib/opsModel";
import { normalizeE164India } from "@/lib/phone";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  // Firestore Timestamp-like: { seconds, nanoseconds }
  if (
    typeof value === "object" &&
    value !== null &&
    "seconds" in value &&
    typeof (value as { seconds: unknown }).seconds === "number"
  ) {
    const seconds = (value as { seconds: number }).seconds;
    const maybe = value as unknown as { nanoseconds?: number };
    const nanos = typeof maybe.nanoseconds === "number" ? maybe.nanoseconds : 0;
    return new Date(seconds * 1000 + Math.floor(nanos / 1e6));
  }
  return null;
}

function formatIstTime(value: unknown) {
  const d = toDate(value);
  if (!d) return "";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

function formatIstDateTime(value: unknown) {
  const d = toDate(value);
  if (!d) return "";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

export default function AdminCampDetailPage() {
  const { campId } = useParams();
  const id = campId ?? "";

  const [camp, setCamp] = useState<Camp | null>(null);
  const [staff, setStaff] = useState<{ uid: string; email: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [selectedStaffUid, setSelectedStaffUid] = useState("");

  const [encounters, setEncounters] = useState<Encounter[]>([]);

  async function refreshAll() {
    setErr(null);
    const [c, s] = await Promise.all([getCamp(id), listStaff()]);
    setCamp(c);
    setStaff(s.map((x) => ({ uid: x.uid, email: x.email, name: x.name })));
    if (c) {
      const e = await listEncounters(id);
      setEncounters(e);
    }
  }

  useEffect(() => {
    if (!id) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshAll();
    // refreshAll is intentionally not a dependency (it captures setState closures)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function addStaffToCamp() {
    if (!camp) return;
    setBusy(true);
    setErr(null);
    try {
      const uid = selectedStaffUid;
      if (!uid) throw new Error("Select a staff");
      const next = Array.from(new Set([...(camp.assignedStaffUids ?? []), uid]));
      await setCampStaffUids(camp.id, next);
      setSelectedStaffUid("");
      await refreshAll();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to assign staff");
    } finally {
      setBusy(false);
    }
  }

  async function onUploadRoster(file: File) {
    if (!camp) return;
    setBusy(true);
    setErr(null);
    try {
      const text = await file.text();
      const rows = parseCsv(text).filter((r) => r.some((x) => x.trim() !== ""));
      if (rows.length < 2) throw new Error("CSV is empty.");

      const headers = rows[0].map((h) => h.trim().toLowerCase());
      const idx = (key: string) => headers.indexOf(key);
      const iEmp = idx("emp_id");
      const iName = idx("full_name");
      if (iEmp === -1 || iName === -1) {
        throw new Error("CSV must have headers: emp_id, full_name (and optional phone, email, age, gender, department)");
      }

      for (const r of rows.slice(1)) {
        const empId = (r[iEmp] ?? "").trim();
        const fullName = (r[iName] ?? "").trim();
        if (!empId || !fullName) continue;
        const phone = idx("phone") >= 0 ? normalizeE164India(r[idx("phone")] ?? "") : undefined;
        const email = idx("email") >= 0 ? (r[idx("email")] ?? "").trim() : undefined;
        const ageStr = idx("age") >= 0 ? (r[idx("age")] ?? "").trim() : "";
        const age = ageStr ? Number(ageStr) : undefined;
        const genderStr = idx("gender") >= 0 ? (r[idx("gender")] ?? "").trim().toLowerCase() : "";
        const gender =
          genderStr === "male" || genderStr === "female" || genderStr === "other"
            ? (genderStr as "male" | "female" | "other")
            : undefined;
        const department = idx("department") >= 0 ? (r[idx("department")] ?? "").trim() : undefined;

        await upsertRosterRow(camp.id, {
          empId,
          fullName,
          phone: phone?.length ? phone : undefined,
          email: email?.length ? email : undefined,
          age: Number.isFinite(age) ? age : undefined,
          gender,
          department: department?.length ? department : undefined,
        });
      }
      await refreshAll();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Roster upload failed");
    } finally {
      setBusy(false);
    }
  }

  function exportEncountersCsv() {
    if (!camp) return;
    const staffNameByUid = new Map(staff.map((s) => [s.uid, s.name]));
    const rows = encounters.map((e) => ({
      camp_code: camp.campCode,
      camp_name: camp.campName,
      employer: camp.employerName,
      registered_by_staff_name: staffNameByUid.get(e.registeredByUid) ?? e.registeredByUid,
      collected_by_staff_name: e.collectedByUid ? (staffNameByUid.get(e.collectedByUid) ?? e.collectedByUid) : "",
      registration_time_ist: formatIstTime(e.registeredAt),
      collection_time_ist: formatIstTime(e.collectedAt),
      registration_datetime_ist: formatIstDateTime(e.registeredAt),
      collection_datetime_ist: formatIstDateTime(e.collectedAt),
      source: e.source,
      emp_id: e.empId,
      name: e.name,
      age: e.age,
      gender: e.gender,
      phone: e.phone,
      email: e.email ?? "",
      height_cm: e.heightCm ?? "",
      weight_kg: e.weightKg ?? "",
      bp_sys: e.bpSys ?? "",
      bp_dia: e.bpDia ?? "",
      tube_sst: e.tubes.sst ? "YES" : "NO",
      tube_edta: e.tubes.edta ? "YES" : "NO",
      tube_fluoride: e.tubes.fluoride ? "YES" : "NO",
      urine: e.urine ? "YES" : "NO",
    }));
    const csv = toCsv(rows);
    downloadTextFile(
      `camp_${camp.campCode}_${camp.startDate || "date"}_registrations.csv`,
      csv,
      "text/csv;charset=utf-8",
    );
  }

  if (!camp) {
    return (
      <div className="a-card a-col-12">
        <h1 className="a-h1">Camp</h1>
        <p className="a-p">{id ? "Loading..." : "Missing camp id"}</p>
        {err ? <div style={{ color: "#fecaca" }}>{err}</div> : null}
      </div>
    );
  }

  return (
    <div className="a-grid">
      <div className="a-card a-col-12">
        <h1 className="a-h1">
          {camp.campCode} — {camp.campName}
        </h1>
        <p className="a-p">{camp.employerName}</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <span className="a-badge">
            Dates: {camp.startDate || "—"} → {camp.endDate || "—"}
          </span>
          <span className="a-badge">Roster: {camp.rosterSource === "upload" ? "Upload" : "None"}</span>
          <span className="a-badge">Assigned staff: {camp.assignedStaffUids?.length ?? 0}</span>
          <span className="a-badge">Patients: {encounters.length}</span>
        </div>
      </div>

      <div className="a-card a-col-6">
        <h2 style={{ margin: "0 0 10px", color: "#f8fafc", fontSize: 16 }}>Assign staff</h2>
        <label className="a-label">Staff</label>
        <select className="a-select" value={selectedStaffUid} onChange={(e) => setSelectedStaffUid(e.target.value)}>
          <option value="">Select staff…</option>
          {staff.map((s) => (
            <option key={s.uid} value={s.uid}>
              {s.name} — {s.email}
            </option>
          ))}
        </select>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
          <button className="a-btn a-btn-primary" onClick={addStaffToCamp} disabled={busy || !selectedStaffUid}>
            {busy ? "Saving..." : "Assign"}
          </button>
        </div>
        <div style={{ marginTop: 12, fontSize: 13, opacity: 0.85 }}>
          Current: {(camp.assignedStaffUids ?? []).length ? camp.assignedStaffUids.join(", ") : "—"}
        </div>
      </div>

      <div className="a-card a-col-6">
        <h2 style={{ margin: "0 0 10px", color: "#f8fafc", fontSize: 16 }}>Roster upload (CSV)</h2>
        <p className="a-p" style={{ marginBottom: 10 }}>
          Headers: <code>emp_id</code>, <code>full_name</code>, optional <code>phone</code>, <code>email</code>, <code>age</code>, <code>gender</code>, <code>department</code>
        </p>
        <input
          className="a-input"
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            void onUploadRoster(f);
            e.currentTarget.value = "";
          }}
          disabled={busy || camp.rosterSource !== "upload"}
        />
        {camp.rosterSource !== "upload" ? (
          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
            This camp is set to “No roster”. You can still register patients manually.
          </div>
        ) : null}
      </div>

      <div className="a-card a-col-12">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <h2 style={{ margin: 0, color: "#f8fafc", fontSize: 16 }}>Registered patients</h2>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="a-btn a-btn-ghost" onClick={() => void refreshAll()} disabled={busy}>
              Refresh
            </button>
            <button className="a-btn a-btn-primary" onClick={exportEncountersCsv} disabled={encounters.length === 0}>
              Export CSV (Excel)
            </button>
          </div>
        </div>
        <div style={{ marginTop: 10, overflowX: "auto" }}>
          <table className="a-table">
            <thead>
              <tr>
                <th>Emp ID</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Tubes</th>
                <th>Urine</th>
                <th>Collected by</th>
              </tr>
            </thead>
            <tbody>
              {encounters.map((e) => (
                <tr key={e.id}>
                  <td>{e.empId}</td>
                  <td>{e.name}</td>
                  <td>{e.phone}</td>
                  <td>
                    {[
                      e.tubes.sst ? "SST" : null,
                      e.tubes.edta ? "EDTA" : null,
                      e.tubes.fluoride ? "Fluoride" : null,
                    ]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </td>
                  <td>{e.urine ? "YES" : "NO"}</td>
                  <td>
                    {e.collectedByUid
                      ? staff.find((s) => s.uid === e.collectedByUid)?.name ?? e.collectedByUid
                      : "—"}
                  </td>
                </tr>
              ))}
              {encounters.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ opacity: 0.7, padding: 12 }}>
                    No registrations yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {err ? (
        <div className="a-card a-col-12" style={{ borderColor: "rgba(239,68,68,0.35)" }}>
          <div style={{ color: "#fecaca" }}>{err}</div>
        </div>
      ) : null}
    </div>
  );
}

