"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.patientVerifyOtp = exports.patientRequestOtp = exports.adminSetStaffPassword = void 0;
require("dotenv/config");
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
admin.initializeApp();
const ALVO_SMS_TOKEN = (0, params_1.defineSecret)("ALVO_SMS_TOKEN");
const ALVO_SENDER_ID = (0, params_1.defineSecret)("ALVO_SENDER_ID");
const ALVO_DLT_TEMPLATE_ID = (0, params_1.defineSecret)("ALVO_DLT_TEMPLATE_ID");
const ALVO_ROUTE = (0, params_1.defineSecret)("ALVO_ROUTE");
function normalizeE164India(raw) {
    const digits = raw.replace(/\D/g, "");
    if (digits.length === 10)
        return `+91${digits}`;
    if (digits.startsWith("91") && digits.length === 12)
        return `+${digits}`;
    if (raw.trim().startsWith("+"))
        return raw.trim();
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
        // Amplify preview / prod domains
        /https:\/\/.*\.amplifyapp\.com$/,
        "https://main.d1r3chpcjgs5iy.amplifyapp.com",
        // add other allowed origins here (staging, etc.)
    ];
function hashOtp(phoneE164, otp) {
    // simple deterministic hash; not for crypto-grade security, but prevents plain OTP storage
    // (uses Firestore/Functions security boundary; still good to avoid plaintext)
    const data = `${phoneE164}|${otp}|v1`;
    let h = 0;
    for (let i = 0; i < data.length; i++)
        h = (h * 31 + data.charCodeAt(i)) >>> 0;
    return h.toString(16);
}
async function sendAlvoSms(args) {
    const url = new URL("https://alvosms.in/api/v1/send");
    url.searchParams.set("token", args.token);
    url.searchParams.set("numbers", args.numbers);
    url.searchParams.set("route", args.route);
    url.searchParams.set("message", args.message);
    url.searchParams.set("sender", args.sender);
    url.searchParams.set("template-id", args.templateId);
    const res = await fetch(url.toString(), { method: "GET" });
    const text = await res.text();
    if (isEmulator()) {
        // Alvo sometimes returns 200 with an error message in body (e.g. DLT mismatch).
        console.log("[alvo] status=", res.status, "body=", text);
    }
    if (!res.ok) {
        throw new https_1.HttpsError("internal", `AlvoSMS send failed (${res.status})`, { body: text });
    }
    return text;
}
exports.adminSetStaffPassword = (0, https_1.onCall)({ cors: callableCors }, async (request) => {
    const caller = request.auth;
    if (!caller?.uid) {
        throw new https_1.HttpsError("unauthenticated", "Login required.");
    }
    const callerAdminDoc = await admin.firestore().doc(`admins/${caller.uid}`).get();
    if (!callerAdminDoc.exists) {
        throw new https_1.HttpsError("permission-denied", "Admin access required.");
    }
    const data = request.data;
    const staffUid = typeof data === "object" && data !== null && "staffUid" in data ? String(data.staffUid).trim() : "";
    const newPassword = typeof data === "object" && data !== null && "newPassword" in data ? String(data.newPassword) : "";
    if (!staffUid)
        throw new https_1.HttpsError("invalid-argument", "staffUid is required.");
    if (newPassword.length < 6)
        throw new https_1.HttpsError("invalid-argument", "Password must be at least 6 characters.");
    // Optional: verify staff record exists in Firestore
    const staffDoc = await admin.firestore().doc(`staff/${staffUid}`).get();
    if (!staffDoc.exists) {
        throw new https_1.HttpsError("not-found", "Staff record not found.");
    }
    await admin.auth().updateUser(staffUid, { password: newPassword });
    await admin.firestore().doc(`staff/${staffUid}`).set({
        passwordUpdatedAt: firestore_1.FieldValue.serverTimestamp(),
        passwordUpdatedBy: caller.uid,
    }, { merge: true });
    return { ok: true };
});
exports.patientRequestOtp = (0, https_1.onCall)({
    cors: callableCors,
    secrets: [ALVO_SMS_TOKEN, ALVO_SENDER_ID, ALVO_DLT_TEMPLATE_ID, ALVO_ROUTE],
}, async (request) => {
    const data = request.data;
    const rawPhone = typeof data === "object" && data !== null && "phone" in data ? String(data.phone) : "";
    const phoneE164 = normalizeE164India(rawPhone);
    const digits = phoneE164.replace(/\D/g, "");
    if (digits.length < 10)
        throw new https_1.HttpsError("invalid-argument", "Invalid phone number.");
    const token = ALVO_SMS_TOKEN.value();
    const sender = ALVO_SENDER_ID.value();
    const route = ALVO_ROUTE.value() || "otp";
    const templateId = ALVO_DLT_TEMPLATE_ID.value();
    if (!token || !sender || !templateId) {
        throw new https_1.HttpsError("failed-precondition", "SMS provider not configured.");
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
    await admin.firestore().doc(`patient_otps/${docId}`).set({
        phoneE164,
        otpHash,
        attempts: 0,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        expiresAtMs,
    }, { merge: true });
    // Must match the approved DLT template exactly (spacing/punctuation/newlines).
    const message = `Welcome to Optimech.\nYour One Time Password is ${otp} - Powered by ALVO`;
    const numbers = digits.length === 10 ? digits : digits.slice(-10);
    await sendAlvoSms({ token, numbers, route, sender, templateId, message });
    // Never return OTP in production responses.
    return isEmulator() ? { ok: true, debugOtp: otp } : { ok: true };
});
exports.patientVerifyOtp = (0, https_1.onCall)({ cors: callableCors }, async (request) => {
    const data = request.data;
    const rawPhone = typeof data === "object" && data !== null && "phone" in data ? String(data.phone) : "";
    const otp = typeof data === "object" && data !== null && "otp" in data ? String(data.otp) : "";
    const phoneE164 = normalizeE164India(rawPhone);
    const digits = phoneE164.replace(/\D/g, "");
    if (digits.length < 10)
        throw new https_1.HttpsError("invalid-argument", "Invalid phone number.");
    if (!/^\d{4,8}$/.test(otp))
        throw new https_1.HttpsError("invalid-argument", "Invalid OTP.");
    const docId = digits;
    const ref = admin.firestore().doc(`patient_otps/${docId}`);
    const snap = await ref.get();
    if (!snap.exists)
        throw new https_1.HttpsError("not-found", "OTP not requested.");
    const rec = snap.data();
    if (Date.now() > rec.expiresAtMs)
        throw new https_1.HttpsError("deadline-exceeded", "OTP expired.");
    if ((rec.attempts ?? 0) >= 10)
        throw new https_1.HttpsError("resource-exhausted", "Too many attempts.");
    const expected = rec.otpHash;
    const got = hashOtp(phoneE164, otp);
    if (got !== expected) {
        await ref.set({ attempts: firestore_1.FieldValue.increment(1) }, { merge: true });
        throw new https_1.HttpsError("permission-denied", "Wrong OTP.");
    }
    // OTP success: delete record (one-time)
    await ref.delete();
    // Create/get Firebase Auth user and mint custom token
    const uid = `p_${digits}`;
    try {
        await admin.auth().getUser(uid);
    }
    catch {
        await admin.auth().createUser({ uid, phoneNumber: phoneE164 });
    }
    const customToken = await admin.auth().createCustomToken(uid, { phone: phoneE164, role: "patient" });
    return { ok: true, customToken, uid, phoneE164 };
});
