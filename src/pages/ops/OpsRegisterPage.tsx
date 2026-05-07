import { createEncounter, getCamp, getRosterRow, type Camp } from "@/lib/opsModel";
import { useAuth } from "@/state/useAuth";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

type FormState = {
  source: "roster" | "manual";
  empId: string;
  name: string;
  age: string;
  gender: "male" | "female" | "other";
  phone: string;
  email: string;
  heightCm: string;
  weightKg: string;
  bpSys: string;
  bpDia: string;
  tubeSst: boolean;
  tubeEdta: boolean;
  tubeFluoride: boolean;
  urine: boolean;
  collectedNow: boolean;
};

const initial: FormState = {
  source: "manual",
  empId: "",
  name: "",
  age: "",
  gender: "other",
  phone: "",
  email: "",
  heightCm: "",
  weightKg: "",
  bpSys: "",
  bpDia: "",
  tubeSst: true,
  tubeEdta: false,
  tubeFluoride: false,
  urine: false,
  collectedNow: true,
};

export default function OpsRegisterPage() {
  const { campId } = useParams();
  const id = campId ?? "";
  const nav = useNavigate();
  const { user } = useAuth();

  const [camp, setCamp] = useState<Camp | null>(null);
  const [state, setState] = useState<FormState>(initial);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const canUseRoster = camp?.rosterSource === "upload";
  const required = camp?.required;

  const isValid = useMemo(() => {
    if (!camp) return false;
    if (!state.name.trim()) return false;
    if (!state.phone.trim()) return false;
    if (required?.empId && !state.empId.trim()) return false;
    if (required?.email && !state.email.trim()) return false;
    if (required?.height && !state.heightCm.trim()) return false;
    if (required?.weight && !state.weightKg.trim()) return false;
    if (required?.bp && (!state.bpSys.trim() || !state.bpDia.trim())) return false;
    if (required?.tubes && !(state.tubeSst || state.tubeEdta || state.tubeFluoride)) return false;
    if (required?.urine && !state.urine) return false;
    return true;
  }, [camp, required, state]);

  useEffect(() => {
    async function run() {
      if (!id) return;
      const c = await getCamp(id);
      setCamp(c);
      if (c) {
        setState((s) => ({
          ...s,
          tubeSst: c.required.tubes ? true : s.tubeSst,
        }));
      }
    }
    void run();
  }, [id]);

  async function fetchFromRoster() {
    if (!camp) return;
    setStatus(null);
    setBusy(true);
    try {
      const row = await getRosterRow(camp.id, state.empId.trim());
      if (!row) throw new Error("Not found in roster. Use manual entry.");
      setState((s) => ({
        ...s,
        source: "roster",
        name: row.fullName ?? s.name,
        phone: row.phone ?? s.phone,
        email: row.email ?? s.email,
        age: row.age ? String(row.age) : s.age,
        gender: row.gender ?? s.gender,
      }));
      setStatus("Prefilled from roster.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Roster lookup failed");
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!camp || !user?.uid) return;
    setStatus(null);
    setBusy(true);
    try {
      await createEncounter(camp.id, {
        source: state.source,
        empId: state.empId.trim(),
        name: state.name.trim(),
        age: Number(state.age || 0),
        gender: state.gender,
        phone: state.phone.trim(),
        email: state.email.trim() || undefined,
        heightCm: state.heightCm.trim() ? Number(state.heightCm) : undefined,
        weightKg: state.weightKg.trim() ? Number(state.weightKg) : undefined,
        bpSys: state.bpSys.trim() ? Number(state.bpSys) : undefined,
        bpDia: state.bpDia.trim() ? Number(state.bpDia) : undefined,
        tubes: {
          sst: state.tubeSst,
          edta: state.tubeEdta,
          fluoride: state.tubeFluoride,
        },
        urine: state.urine,
        registeredByUid: user.uid,
        collectedAt: state.collectedNow ? new Date().toISOString() : undefined,
        collectedByUid: state.collectedNow ? user.uid : undefined,
      });
      setState(initial);
      setStatus("Saved.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  if (!camp) {
    return (
      <div>
        <div className="topbar">
          <div>
            <h1 className="h1">Register</h1>
            <p className="p">{id ? "Loading camp..." : "Missing camp id"}</p>
          </div>
          <button className="btn btn-outline" onClick={() => nav("/ops")}>
            Back
          </button>
        </div>
        {status ? <div className="error">{status}</div> : null}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="topbar">
        <div>
          <h1 className="h1">Register patient</h1>
          <p className="p">
            {camp.campCode} — {camp.employerName}
          </p>
        </div>
        <button className="btn btn-outline" onClick={() => nav("/ops")}>
          Back
        </button>
      </div>

      {canUseRoster ? (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontWeight: 800 }}>Roster lookup (optional)</div>
          <label className="label">Employee ID</label>
          <input
            className="input"
            placeholder="Enter emp id and fetch"
            value={state.empId}
            onChange={(e) => setState((s) => ({ ...s, empId: e.target.value }))}
            disabled={busy}
          />
          <button className="btn btn-dark" onClick={fetchFromRoster} disabled={busy || !state.empId.trim()}>
            {busy ? "Fetching..." : "Fetch from roster"}
          </button>
          <div className="muted">If not found, continue with manual entry below.</div>
        </div>
      ) : null}

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="row">
          <div>
            <label className="label">Name {camp.required.empId ? "" : ""}</label>
            <input
              className="input"
              value={state.name}
              onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))}
              disabled={busy}
            />
          </div>
          <div>
            <label className="label">Emp ID {camp.required.empId ? "(required)" : "(optional)"}</label>
            <input
              className="input"
              value={state.empId}
              onChange={(e) => setState((s) => ({ ...s, empId: e.target.value }))}
              disabled={busy}
            />
          </div>
        </div>

        <div className="row">
          <div>
            <label className="label">Age</label>
            <input
              className="input"
              inputMode="numeric"
              value={state.age}
              onChange={(e) => setState((s) => ({ ...s, age: e.target.value.replace(/\D/g, "") }))}
              disabled={busy}
            />
          </div>
          <div>
            <label className="label">Gender</label>
            <select
              className="select"
              value={state.gender}
              onChange={(e) => setState((s) => ({ ...s, gender: e.target.value as FormState["gender"] }))}
              disabled={busy}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <label className="label">Phone</label>
        <input
          className="input"
          inputMode="tel"
          value={state.phone}
          onChange={(e) => setState((s) => ({ ...s, phone: e.target.value }))}
          disabled={busy}
        />

        <label className="label">Email {camp.required.email ? "(required)" : "(optional)"}</label>
        <input
          className="input"
          inputMode="email"
          value={state.email}
          onChange={(e) => setState((s) => ({ ...s, email: e.target.value }))}
          disabled={busy}
        />

        <div className="row">
          <div>
            <label className="label">Height (cm) {camp.required.height ? "(required)" : "(optional)"}</label>
            <input
              className="input"
              inputMode="numeric"
              value={state.heightCm}
              onChange={(e) => setState((s) => ({ ...s, heightCm: e.target.value.replace(/[^\d.]/g, "") }))}
              disabled={busy}
            />
          </div>
          <div>
            <label className="label">Weight (kg) {camp.required.weight ? "(required)" : "(optional)"}</label>
            <input
              className="input"
              inputMode="numeric"
              value={state.weightKg}
              onChange={(e) => setState((s) => ({ ...s, weightKg: e.target.value.replace(/[^\d.]/g, "") }))}
              disabled={busy}
            />
          </div>
        </div>

        <div className="row">
          <div>
            <label className="label">BP Sys {camp.required.bp ? "(required)" : "(optional)"}</label>
            <input
              className="input"
              inputMode="numeric"
              value={state.bpSys}
              onChange={(e) => setState((s) => ({ ...s, bpSys: e.target.value.replace(/\D/g, "") }))}
              disabled={busy}
            />
          </div>
          <div>
            <label className="label">BP Dia {camp.required.bp ? "(required)" : "(optional)"}</label>
            <input
              className="input"
              inputMode="numeric"
              value={state.bpDia}
              onChange={(e) => setState((s) => ({ ...s, bpDia: e.target.value.replace(/\D/g, "") }))}
              disabled={busy}
            />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontWeight: 800 }}>Tubes collected</div>
          <label className="muted">
            <input
              type="checkbox"
              checked={state.tubeSst}
              onChange={(e) => setState((s) => ({ ...s, tubeSst: e.target.checked }))}
              disabled={busy}
            />{" "}
            SST
          </label>
          <label className="muted">
            <input
              type="checkbox"
              checked={state.tubeEdta}
              onChange={(e) => setState((s) => ({ ...s, tubeEdta: e.target.checked }))}
              disabled={busy}
            />{" "}
            EDTA
          </label>
          <label className="muted">
            <input
              type="checkbox"
              checked={state.tubeFluoride}
              onChange={(e) => setState((s) => ({ ...s, tubeFluoride: e.target.checked }))}
              disabled={busy}
            />{" "}
            Fluoride
          </label>
        </div>

        <label className="muted">
          <input
            type="checkbox"
            checked={state.urine}
            onChange={(e) => setState((s) => ({ ...s, urine: e.target.checked }))}
            disabled={busy}
          />{" "}
          Urine collected
        </label>

        <label className="muted">
          <input
            type="checkbox"
            checked={state.collectedNow}
            onChange={(e) => setState((s) => ({ ...s, collectedNow: e.target.checked }))}
            disabled={busy}
          />{" "}
          Collection done now (save time + collector)
        </label>

        <button className="btn btn-primary" onClick={submit} disabled={busy || !isValid}>
          {busy ? "Saving..." : "Submit"}
        </button>

        {status ? <div className="error">{status}</div> : null}
      </div>
    </div>
  );
}

