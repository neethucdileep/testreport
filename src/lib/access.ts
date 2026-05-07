import { FirebaseError } from "firebase/app";
import { collection, doc, getDoc, getDocs, limit, query, serverTimestamp, setDoc } from "firebase/firestore/lite";
import { firestore } from "@/lib/firebase";

export type Access =
  | { kind: "admin"; uid: string; email: string }
  | { kind: "staff"; uid: string; email: string }
  | { kind: "none"; uid: string; email: string };

export type StaffRecord = {
  uid: string;
  email: string;
  name: string;
  active: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type AdminRecord = {
  uid: string;
  email: string;
  name?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

function isLocalhost() {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1";
}

async function hasAnyAdmin(): Promise<boolean> {
  const q = query(collection(firestore, "admins"), limit(1));
  const snaps = await getDocs(q);
  return snaps.size > 0;
}

export async function resolveAccessForUser(args: { uid: string; email: string }): Promise<Access> {
  const adminRef = doc(firestore, "admins", args.uid);
  const staffRef = doc(firestore, "staff", args.uid);
  const [adminSnap, staffSnap] = await Promise.all([getDoc(adminRef), getDoc(staffRef)]);

  if (adminSnap.exists()) return { kind: "admin", uid: args.uid, email: args.email };
  if (staffSnap.exists()) {
    const staff = staffSnap.data() as StaffRecord;
    if (!staff.active) return { kind: "none", uid: args.uid, email: args.email };
    return { kind: "staff", uid: args.uid, email: args.email };
  }

  // Dev convenience: first user becomes admin if no admins exist (localhost only)
  if (isLocalhost() && !(await hasAnyAdmin())) {
    const record: AdminRecord = {
      uid: args.uid,
      email: args.email,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(adminRef, record, { merge: true });
    return { kind: "admin", uid: args.uid, email: args.email };
  }

  return { kind: "none", uid: args.uid, email: args.email };
}

export function userFacingAuthError(e: unknown) {
  if (e instanceof FirebaseError) {
    const code = e.code || "unknown";
    if (code === "auth/user-not-found") return "Account not found. Create the account first (Admin: /admin/register).";
    if (code === "auth/wrong-password") return "Wrong password. Try again or reset password.";
    if (code === "auth/invalid-credential") return "Invalid email or password.";
    if (code === "auth/email-already-in-use") return "Email already in use. Please login instead.";
    if (code === "auth/too-many-requests") return "Too many attempts. Wait a bit and retry.";
    if (code === "auth/operation-not-allowed") return "Email/Password login is disabled in Firebase console.";
    return `${e.message} (code=${code})`;
  }
  return e instanceof Error ? e.message : "Something went wrong. Please try again.";
}

