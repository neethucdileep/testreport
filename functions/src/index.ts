import "dotenv/config";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";

admin.initializeApp();

const ALVO_SMS_TOKEN = defineSecret("ALVO_SMS_TOKEN");
const ALVO_SENDER_ID = defineSecret("ALVO_SENDER_ID");
const ALVO_DLT_TEMPLATE_ID = defineSecret("ALVO_DLT_TEMPLATE_ID");
const ALVO_ROUTE = defineSecret("ALVO_ROUTE");

function normalizeE164India(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.startsWith("91") && digits.length === 12) return `+${digits}`;
  if (raw.trim().startsWith("+")) return raw.trim();
  return raw.trim();
}

function otpCode(len = 6) {
  const max = 10 ** len;
  const n = Math.floor(Math.random() * max);
  return String(n).padStart(len, "0");
}

function isEmulator() {
  // Set by firebase-tools when running the Functions emulator.
  // Also consider presence of Emulator Hub env var.
  return process.env.FUNCTIONS_EMULATOR === "true" || !!process.env.FIREBASE_EMULATOR_HUB;
}

const callableCors = isEmulator()
  ? true
  : [
      "https://bloodlyf.in",
      "https://www.bloodlyf.in",
      // Amplify domains (explicit allowlist; regex matching is unreliable here)
      "https://main.d1r3chpcjgs5iy.amplifyapp.com",
      // add other allowed origins here (staging, etc.)
    ];

function hashOtp(phoneE164: string, otp: string) {
  // simple deterministic hash; not for crypto-grade security, but prevents plain OTP storage
  // (uses Firestore/Functions security boundary; still good to avoid plaintext)
  const data = `${phoneE164}|${otp}|v1`;
  let h = 0;
  for (let i = 0; i < data.length; i++) h = (h * 31 + data.charCodeAt(i)) >>> 0;
  return h.toString(16);
}

function redactOtpFromMessage(message: string) {
  // Remove likely OTP sequences from logs (4-8 digits).
  return message.replace(/\b\d{4,8}\b/g, "******");
}

function lastN(s: string, n: number) {
  return s.length <= n ? s : s.slice(-n);
}

async function sendAlvoSms(args: { token: string; numbers: string; route: string; sender: string; templateId: string; message: string }) {
  const url = new URL("https://alvosms.in/api/v1/send");
  url.searchParams.set("token", args.token);
  url.searchParams.set("numbers", args.numbers);
  url.searchParams.set("route", args.route);
  url.searchParams.set("message", args.message);
  url.searchParams.set("sender", args.sender);
  url.searchParams.set("template-id", args.templateId);

  const res = await fetch(url.toString(), { method: "GET" });
  const text = await res.text();

  // Always log a sanitized provider response for debugging production delivery issues.
  // DO NOT log token or raw OTP.
  console.log("[alvo] request", {
    status: res.status,
    ok: res.ok,
    numbersLast4: lastN(args.numbers, 4),
    route: args.route,
    sender: args.sender,
    templateId: args.templateId,
    message: redactOtpFromMessage(args.message),
    body: text.slice(0, 500),
  });

  if (!res.ok) {
    throw new HttpsError("internal", `AlvoSMS send failed (${res.status})`, { body: text });
  }
  return text;
}

export const adminSetStaffPassword = onCall({ cors: callableCors }, async (request) => {
  const caller = request.auth;
  if (!caller?.uid) {
    throw new HttpsError("unauthenticated", "Login required.");
  }

  const callerAdminDoc = await admin.firestore().doc(`admins/${caller.uid}`).get();
  if (!callerAdminDoc.exists) {
    throw new HttpsError("permission-denied", "Admin access required.");
  }

  const data = request.data as unknown;
  const staffUid =
    typeof data === "object" && data !== null && "staffUid" in data ? String((data as { staffUid: unknown }).staffUid).trim() : "";
  const newPassword =
    typeof data === "object" && data !== null && "newPassword" in data ? String((data as { newPassword: unknown }).newPassword) : "";

  if (!staffUid) throw new HttpsError("invalid-argument", "staffUid is required.");
  if (newPassword.length < 6) throw new HttpsError("invalid-argument", "Password must be at least 6 characters.");

  // Optional: verify staff record exists in Firestore
  const staffDoc = await admin.firestore().doc(`staff/${staffUid}`).get();
  if (!staffDoc.exists) {
    throw new HttpsError("not-found", "Staff record not found.");
  }

  await admin.auth().updateUser(staffUid, { password: newPassword });
  await admin.firestore().doc(`staff/${staffUid}`).set(
    {
      passwordUpdatedAt: FieldValue.serverTimestamp(),
      passwordUpdatedBy: caller.uid,
    },
    { merge: true },
  );

  return { ok: true };
});

export const patientRequestOtp = onCall(
  {
    cors: callableCors,
    secrets: [ALVO_SMS_TOKEN, ALVO_SENDER_ID, ALVO_DLT_TEMPLATE_ID, ALVO_ROUTE],
  },
  async (request) => {
  const data = request.data as unknown;
  const rawPhone =
    typeof data === "object" && data !== null && "phone" in data ? String((data as { phone: unknown }).phone) : "";

  const phoneE164 = normalizeE164India(rawPhone);
  const digits = phoneE164.replace(/\D/g, "");
  if (digits.length < 10) throw new HttpsError("invalid-argument", "Invalid phone number.");

  const token = ALVO_SMS_TOKEN.value();
  const sender = ALVO_SENDER_ID.value();
  const route = ALVO_ROUTE.value() || "otp";
  const templateId = ALVO_DLT_TEMPLATE_ID.value();
  if (!token || !sender || !templateId) {
    throw new HttpsError("failed-precondition", "SMS provider not configured.");
  }

  const now = Date.now();
  // In some provider/test setups, the SMS gateway might send a fixed OTP
  // (or rewrite the message to match an approved DLT template). To avoid
  // a confusing mismatch during local development, allow forcing a fixed OTP.
  const forcedOtp = (process.env.ALVO_FIXED_OTP ?? "").trim();
  const otp = forcedOtp || (isEmulator() ? "123456" : otpCode(6));
  const otpHash = hashOtp(phoneE164, otp);
  const expiresAtMs = now + 5 * 60_000;

  const docId = digits; // stable per phone
  await admin.firestore().doc(`patient_otps/${docId}`).set(
    {
      phoneE164,
      otpHash,
      attempts: 0,
      createdAt: FieldValue.serverTimestamp(),
      expiresAtMs,
    },
    { merge: true },
  );

  // Must match the approved DLT template exactly (spacing/punctuation/newlines).
  const message = `Welcome to Optimech.\nYour One Time Password is ${otp} - Powered by ALVO`;
  const numbers = digits.length === 10 ? digits : digits.slice(-10);
  try {
    await sendAlvoSms({ token, numbers, route, sender, templateId, message });
  } catch (err) {
    console.error("[patientRequestOtp] send failed", {
      numbersLast4: lastN(numbers, 4),
      route,
      sender,
      templateId,
      message: redactOtpFromMessage(message),
      error: err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : String(err),
    });
    throw err;
  }

  // Never return OTP in production responses.
  return isEmulator() ? { ok: true, debugOtp: otp } : { ok: true };
  },
);

export const patientVerifyOtp = onCall({ cors: callableCors }, async (request) => {
  const data = request.data as unknown;
  const rawPhone =
    typeof data === "object" && data !== null && "phone" in data ? String((data as { phone: unknown }).phone) : "";
  const otp = typeof data === "object" && data !== null && "otp" in data ? String((data as { otp: unknown }).otp) : "";

  const phoneE164 = normalizeE164India(rawPhone);
  const digits = phoneE164.replace(/\D/g, "");
  if (digits.length < 10) throw new HttpsError("invalid-argument", "Invalid phone number.");
  if (!/^\d{4,8}$/.test(otp)) throw new HttpsError("invalid-argument", "Invalid OTP.");

  const docId = digits;
  const ref = admin.firestore().doc(`patient_otps/${docId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "OTP not requested.");

  const rec = snap.data() as { phoneE164: string; otpHash: string; attempts: number; expiresAtMs: number };
  if (Date.now() > rec.expiresAtMs) throw new HttpsError("deadline-exceeded", "OTP expired.");
  if ((rec.attempts ?? 0) >= 10) throw new HttpsError("resource-exhausted", "Too many attempts.");

  const expected = rec.otpHash;
  const got = hashOtp(phoneE164, otp);
  if (got !== expected) {
    await ref.set({ attempts: FieldValue.increment(1) }, { merge: true });
    throw new HttpsError("permission-denied", "Wrong OTP.");
  }

  // OTP success: delete record (one-time)
  await ref.delete();

  // Create/get Firebase Auth user and mint custom token
  const desiredUid = `p_${digits}`;
  let uid = desiredUid;

  try {
    await admin.auth().getUser(desiredUid);
  } catch {
    try {
      await admin.auth().createUser({ uid: desiredUid, phoneNumber: phoneE164 });
    } catch (err) {
      // If this phone number was already used by a different UID, reuse that account.
      const code = typeof err === "object" && err !== null ? (err as { errorInfo?: { code?: unknown } }).errorInfo?.code : undefined;
      if (code === "auth/phone-number-already-exists") {
        const existing = await admin.auth().getUserByPhoneNumber(phoneE164);
        uid = existing.uid;
      } else {
        throw err;
      }
    }
  }

  const customToken = await admin.auth().createCustomToken(uid, { phone: phoneE164, role: "patient" });
  return { ok: true, customToken, uid, phoneE164 };
});

