import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/state/useAuth";
import { normalizeE164India } from "@/lib/phone";
import { requestPatientOtp, verifyPatientOtp } from "@/lib/patientOtp";

function onlyDigits(s: string) {
  return s.replace(/\D/g, "");
}

function OtpBoxes({
  value,
  onChange,
  disabled,
  length = 6,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  length?: number;
}) {
  const digits = onlyDigits(value).slice(0, length);
  return (
    <div className="otp" role="group" aria-label="One time password">
      {Array.from({ length }).map((_, i) => (
        <div key={i} className={`otp__box ${digits[i] ? "is-filled" : ""}`} aria-hidden="true">
          {digits[i] ?? ""}
        </div>
      ))}
      <input
        className="otp__hidden"
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="Enter OTP"
        value={digits}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </div>
  );
}

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
    <div className="auth">
      <div className="auth__header">
        <div className="auth__brand">
          <div className="auth__logo" aria-hidden="true">
            <span>Blood</span>
            <span className="auth__lyf">Lyf</span>
          </div>
          <div className="auth__tag">Re-imagining Home Diagnostics</div>
        </div>
        <div className="auth__drop" aria-hidden="true" />
      </div>

      <div className="auth__welcome">
        <div className="auth__title">Welcome Back</div>
        <div className="auth__sub">Enter your phone number to receive an OTP and login</div>
      </div>

      <div className="auth__card">
        <div className="auth__step">
          <div className="auth__stepNum">1</div>
          <div>
            <div className="auth__stepTitle">Enter Phone Number</div>
            <div className="auth__stepHint">We’ll send you a one-time password</div>
          </div>
        </div>

        <div className="auth__phoneRow">
          <button className="auth__cc" type="button" disabled>
            +91 <span className="auth__caret">▾</span>
          </button>
          <input
            className="auth__phoneInput"
            inputMode="tel"
            autoComplete="tel"
            placeholder="Enter 10-digit mobile number"
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
            disabled={busy || stage === "otp"}
          />
        </div>

        <button className="auth__cta" onClick={sendOtp} disabled={busy || phoneE164.length < 10 || stage !== "phone"}>
          {busy ? "Sending..." : "Send OTP"}
        </button>

        <div className="auth__trust">
          <span className="auth__shield" aria-hidden="true">
            ⛨
          </span>
          Your number is safe with us
        </div>
      </div>

      <div className="auth__divider" aria-hidden="true">
        <span>2</span>
      </div>

      <div className="auth__card">
        <div className="auth__rowBetween">
          <div>
            <div className="auth__stepTitle">Enter OTP</div>
            <div className="auth__stepHint">
              Enter the 6-digit code sent to <span className="auth__phoneEm">{phoneE164 || "+91 XXXXX XXXXX"}</span>
            </div>
          </div>
          <button
            className="auth__link"
            type="button"
            onClick={sendOtp}
            disabled={busy || stage !== "otp" || phoneE164.length < 10}
          >
            Resend OTP
          </button>
        </div>

        <OtpBoxes value={otp} onChange={setOtp} disabled={busy || stage !== "otp"} />

        <div className="auth__row">
          <button className="auth__cta is-muted" onClick={verify} disabled={busy || stage !== "otp" || otp.length < 4}>
            {busy ? "Verifying..." : "Verify & Login"}
          </button>
          <button
            className="auth__ghost"
            type="button"
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

        {status ? <div className="error">{status}</div> : null}
        {debugOtp ? <div className="error">DEV OTP: {debugOtp}</div> : null}
      </div>

      <div className="auth__features">
        <div className="auth__feat">
          <div className="auth__featIcon" aria-hidden="true">
            🛡
          </div>
          <div className="auth__featLabel">Secure & Private</div>
        </div>
        <div className="auth__feat">
          <div className="auth__featIcon" aria-hidden="true">
            ⌂
          </div>
          <div className="auth__featLabel">Home Sample Collection</div>
        </div>
        <div className="auth__feat">
          <div className="auth__featIcon" aria-hidden="true">
            🧾
          </div>
          <div className="auth__featLabel">Accurate Reports</div>
        </div>
        <div className="auth__feat">
          <div className="auth__featIcon" aria-hidden="true">
            🎧
          </div>
          <div className="auth__featLabel">24×7 Support</div>
        </div>
      </div>
    </div>
  );
}

