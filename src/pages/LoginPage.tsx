import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/state/useAuth";
import { normalizeE164India } from "@/lib/phone";
import { requestPatientOtp, verifyPatientOtp } from "@/lib/patientOtp";

export default function LoginPage() {
  const { user, isReady } = useAuth();
  const navigate = useNavigate();
  const [phoneInput, setPhoneInput] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState<"phone" | "otp">("phone");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [debugOtp, setDebugOtp] = useState<string | null>(null);

  const phoneE164 = useMemo(() => normalizeE164India(phoneInput), [phoneInput]);

  useEffect(() => {
    if (!isReady) return;
    if (user) navigate("/profile", { replace: true });
  }, [user, isReady, navigate]);

  async function sendOtp() {
    setStatus(null);
    setDebugOtp(null);
    setBusy(true);
    try {
      const res = await requestPatientOtp(phoneE164);
      setStage("otp");
      setStatus("OTP sent. Please check SMS.");
      if (res?.debugOtp) setDebugOtp(res.debugOtp);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Failed to send OTP.");
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setStatus(null);
    setBusy(true);
    try {
      await verifyPatientOtp(phoneE164, otp);
      navigate("/profile", { replace: true });
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Invalid OTP.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="topbar">
        <div>
          <h1 className="h1">Login</h1>
          <p className="p">Enter your phone number to receive an OTP.</p>
        </div>
      </div>

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <label className="label">Phone number</label>
        <input
          className="input"
          inputMode="tel"
          placeholder="10-digit mobile (India) or +E.164"
          value={phoneInput}
          onChange={(e) => setPhoneInput(e.target.value)}
          disabled={busy || stage === "otp"}
        />

        {stage === "phone" ? (
          <button className="btn btn-dark" onClick={sendOtp} disabled={busy || phoneE164.length < 10}>
            {busy ? "Sending..." : "Send OTP"}
          </button>
        ) : (
          <>
            <label className="label">OTP</label>
            <input
              className="input"
              inputMode="numeric"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              disabled={busy}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-dark" style={{ flex: 1 }} onClick={verify} disabled={busy || otp.length < 4}>
                {busy ? "Verifying..." : "Verify"}
              </button>
              <button
                className="btn btn-outline"
                onClick={() => {
                  setStage("phone");
                  setOtp("");
                  setStatus(null);
                  setDebugOtp(null);
                }}
                disabled={busy}
              >
                Change
              </button>
            </div>
          </>
        )}

        {status ? <div className="error">{status}</div> : null}
        {debugOtp ? <div className="error">DEV OTP: {debugOtp}</div> : null}
      </div>
    </div>
  );
}

