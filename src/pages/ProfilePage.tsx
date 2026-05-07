import { useAuth } from "@/state/useAuth";
import {
  ensureUserDocument,
  getUserProfile,
  type FamilyMember,
  type Sex,
  upsertUserProfile,
} from "@/lib/profile";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function toInt(v: string) {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
}

export default function ProfilePage() {
  const { user, isReady, signOut } = useAuth();
  const navigate = useNavigate();

  const phone = user?.phoneNumber ?? "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<Sex>("male");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);

  function updateMember(id: string, patch: Partial<FamilyMember>) {
    setFamilyMembers((all) =>
      all.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    );
  }

  useEffect(() => {
    if (!isReady) return;
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      navigate("/login", { replace: true });
    }
  }, [user, isReady, navigate]);

  useEffect(() => {
    async function load() {
      if (!isReady) return;
      if (!user) return;
      setLoading(true);
      setLoadError(null);
      try {
        console.log("[profile] loading", { uid: user.uid });

        // Give Firestore a moment to establish transport after auth resolves.
        await new Promise((r) => setTimeout(r, 800));

        await ensureUserDocument(user.uid, user.phoneNumber ?? "");
        const p = await getUserProfile(user.uid);
        if (p) {
          setName(p.name ?? "");
          setAge(String(p.age ?? ""));
          setSex((p.sex as Sex) ?? "male");
          setDob(p.dob ?? "");
          setAddress(p.address ?? "");
          setPincode(p.pincode ?? "");
          setFamilyMembers(Array.isArray(p.familyMembers) ? p.familyMembers : []);
        }
      } catch (e) {
        console.error("[profile] load failed", e);
        setLoadError(e instanceof Error ? e.message : "Could not load profile.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [user, isReady]);

  const isValid = useMemo(() => {
    if (!user) return false;
    if (!phone) return false;
    if (!name.trim()) return false;
    if (toInt(age) <= 0) return false;
    if (!dob) return false;
    if (!address.trim()) return false;
    if (!/^\d{6}$/.test(pincode.trim())) return false;
    return true;
  }, [user, phone, name, age, dob, address, pincode]);

  async function save() {
    if (!isReady) return;
    if (!user) return;
    setStatus(null);
    setSaving(true);
    try {
      console.log("[profile] saving", { uid: user.uid });
      await upsertUserProfile({
        uid: user.uid,
        phone,
        name: name.trim(),
        age: toInt(age),
        sex,
        dob,
        address: address.trim(),
        pincode: pincode.trim(),
        familyMembers,
      });
      setStatus("Saved.");
    } catch (e) {
      console.error("[profile] save failed", e);
      setStatus(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="muted">
        {!isReady ? "Checking login..." : "Loading profile..."}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {loadError ? <div className="error">{loadError}</div> : null}

      <div className="topbar">
        <div>
          <h1 className="h1">Your profile</h1>
          <p className="p">Please complete your details.</p>
        </div>
        <button
          className="btn btn-outline"
          onClick={async () => {
            await signOut();
            navigate("/login", { replace: true });
          }}
        >
          Sign out
        </button>
      </div>

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <label className="label">Phone (already collected)</label>
        <input className="input" value={phone} readOnly />

        <label className="label">Name</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />

        <div className="row">
          <div>
            <label className="label">Age</label>
            <input className="input" inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} />
          </div>
          <div>
            <label className="label">Sex</label>
            <select className="select" value={sex} onChange={(e) => setSex(e.target.value as Sex)}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <label className="label">DOB</label>
        <input className="input" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />

        <label className="label">Address</label>
        <textarea className="textarea" value={address} onChange={(e) => setAddress(e.target.value)} />

        <label className="label">Pincode</label>
        <input className="input" inputMode="numeric" value={pincode} onChange={(e) => setPincode(e.target.value)} />
        <div className="muted">6 digits</div>
      </div>

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div>
            <div style={{ fontWeight: 700 }}>Family members (optional)</div>
            <div className="muted">Add family members with details</div>
          </div>
          <button
            className="btn btn-dark"
            onClick={() =>
              setFamilyMembers((m) => [
                ...m,
                {
                  id: uid(),
                  name: "",
                  age: 0,
                  sex: "male",
                  dob: "",
                  phone: "",
                  address: "",
                  pincode: "",
                },
              ])
            }
          >
            Add
          </button>
        </div>

        {familyMembers.length === 0 ? (
          <div className="muted">No family members added.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {familyMembers.map((m, idx) => (
              <div key={m.id} className="card" style={{ padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                  <div style={{ fontWeight: 700 }}>Member {idx + 1}</div>
                  <button
                    className="btn btn-outline"
                    onClick={() => setFamilyMembers((all) => all.filter((x) => x.id !== m.id))}
                  >
                    Remove
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
                  <label className="label">Name</label>
                  <input
                    className="input"
                    value={m.name}
                    onChange={(e) => updateMember(m.id, { name: e.target.value })}
                  />

                  <div className="row">
                    <div>
                      <label className="label">Age</label>
                      <input
                        className="input"
                        inputMode="numeric"
                        value={String(m.age ?? "")}
                        onChange={(e) => updateMember(m.id, { age: toInt(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="label">Sex</label>
                      <select
                        className="select"
                        value={m.sex}
                        onChange={(e) => updateMember(m.id, { sex: e.target.value as Sex })}
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <label className="label">DOB</label>
                  <input
                    className="input"
                    type="date"
                    value={m.dob}
                    onChange={(e) => updateMember(m.id, { dob: e.target.value })}
                  />

                  <label className="label">Phone (optional)</label>
                  <input
                    className="input"
                    inputMode="tel"
                    value={m.phone ?? ""}
                    onChange={(e) => updateMember(m.id, { phone: e.target.value })}
                  />

                  <label className="label">Address</label>
                  <textarea
                    className="textarea"
                    value={m.address}
                    onChange={(e) => updateMember(m.id, { address: e.target.value })}
                  />

                  <label className="label">Pincode</label>
                  <input
                    className="input"
                    inputMode="numeric"
                    value={m.pincode}
                    onChange={(e) => updateMember(m.id, { pincode: e.target.value })}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button className="btn btn-primary" onClick={save} disabled={!isValid || saving}>
        {saving ? "Saving..." : "Save profile"}
      </button>

      {status ? <div className="muted">{status}</div> : null}
    </div>
  );
}

