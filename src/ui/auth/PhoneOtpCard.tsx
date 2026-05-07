import { firebaseAuth } from "@/lib/firebase";
import { normalizeE164India } from "@/lib/phone";
import { userFacingAuthError } from "@/lib/access";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from "firebase/auth";
import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  title: string;
  subtitle: string;
  onAuthed: (args: { phoneE164: string; uid: string }) => Promise<void> | void;
  recaptchaSize?: "invisible" | "normal";
};

export default function PhoneOtpCard({ title, subtitle, onAuthed, recaptchaSize = "invisible" }: Props) {
  const [phoneInput, setPhoneInput] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const e164 = useMemo(() => normalizeE164India(phoneInput), [phoneInput]);

  const recaptchaElRef = useRef<HTMLDivElement | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const recaptchaRenderPromiseRef = useRef<Promise<number> | null>(null);

  function initVerifier() {
    if (!recaptchaElRef.current) return;
    // clear any existing verifier + widget
    recaptchaVerifierRef.current?.clear();
    recaptchaVerifierRef.current = null;
    recaptchaRenderPromiseRef.current = null;

    const verifier = new RecaptchaVerifier(firebaseAuth, recaptchaElRef.current, {
      size: recaptchaSize,
    });
    recaptchaVerifierRef.current = verifier;
    recaptchaRenderPromiseRef.current = verifier.render();
  }

  useEffect(() => {
    if (!recaptchaElRef.current) return;
    if (recaptchaVerifierRef.current) return;

    initVerifier();

    return () => {
      recaptchaVerifierRef.current?.clear();
      recaptchaVerifierRef.current = null;
      recaptchaRenderPromiseRef.current = null;
    };
    // initVerifier depends on recaptchaSize; we re-init if size changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function requestOtp() {
    setStatus(null);
    setBusy(true);
    try {
      const verifier = recaptchaVerifierRef.current;
      if (!verifier) throw new Error("reCAPTCHA not ready. Refresh and try again.");
      await (recaptchaRenderPromiseRef.current ?? verifier.render());
      // In "normal" mode, force an explicit verification step so we can reliably
      // use the solved checkbox token before requesting OTP.
      if (recaptchaSize === "normal") {
        await verifier.verify();
      }
      const result = await signInWithPhoneNumber(firebaseAuth, e164, verifier);
      setConfirmation(result);
      setStatus("OTP sent. Please check SMS.");
    } catch (e) {
      setStatus(userFacingAuthError(e));
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp() {
    if (!confirmation) return;
    setStatus(null);
    setBusy(true);
    try {
      const cred = await confirmation.confirm(otp);
      const phoneE164 = cred.user.phoneNumber ?? e164;
      await onAuthed({ phoneE164, uid: cred.user.uid });
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

      <div
        ref={recaptchaElRef}
        style={recaptchaSize === "normal" ? { marginTop: 6, marginBottom: 6 } : undefined}
      />

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <label className="label">Phone number</label>
        <input
          className="input"
          inputMode="tel"
          placeholder="10-digit mobile (India) or +E.164"
          value={phoneInput}
          onChange={(e) => setPhoneInput(e.target.value)}
          disabled={busy || !!confirmation}
        />

        {!confirmation ? (
          <button className="btn btn-dark" onClick={requestOtp} disabled={busy || e164.length < 10}>
            {busy ? "Sending..." : "Send OTP"}
          </button>
        ) : (
          <>
            <label className="label">OTP</label>
            <input
              className="input"
              inputMode="numeric"
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              disabled={busy}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="btn btn-dark"
                style={{ flex: 1 }}
                onClick={verifyOtp}
                disabled={busy || otp.replace(/\D/g, "").length < 6}
              >
                {busy ? "Verifying..." : "Verify"}
              </button>
              <button
                className="btn btn-outline"
                onClick={() => {
                  setConfirmation(null);
                  setOtp("");
                  setStatus(null);
                }}
                disabled={busy}
              >
                Change
              </button>
            </div>
          </>
        )}

        {status ? <div className="error">{status}</div> : null}
      </div>
    </div>
  );
}

