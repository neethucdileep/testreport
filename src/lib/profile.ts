import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore/lite";
import { FirebaseError } from "firebase/app";
import { firestore } from "@/lib/firebase";

export type Sex = "male" | "female" | "other";

export type FamilyMember = {
  id: string;
  name: string;
  age: number;
  sex: Sex;
  dob: string;
  phone?: string;
  address: string;
  pincode: string;
};

export type UserProfile = {
  uid: string;
  phone: string;
  name: string;
  age: number;
  sex: Sex;
  dob: string;
  address: string;
  pincode: string;
  familyMembers: FamilyMember[];
  updatedAt?: unknown;
  createdAt?: unknown;
};

function wrapFirestoreError(context: string, e: unknown): Error {
  const online =
    typeof navigator !== "undefined" ? (navigator.onLine ? "online" : "offline") : "unknown";

  if (e instanceof FirebaseError) {
    console.error(`[firestore] ${context} FirebaseError`, {
      code: e.code,
      message: e.message,
      online,
    });
    return new Error(`${context}: ${e.message} (code=${e.code}, navigator=${online})`);
  }

  console.error(`[firestore] ${context} unknown error`, { e, online });
  return e instanceof Error ? e : new Error(`${context}: unknown error (navigator=${online})`);
}

async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 1500,
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      const isUnavailable = e instanceof FirebaseError && e.code === "unavailable";
      if (!isUnavailable) throw e;
      if (i < retries - 1) {
        console.warn(
          `[firestore] unavailable, retrying in ${delayMs}ms (attempt ${i + 1}/${retries})`,
        );
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }
  throw lastError;
}

export async function ensureUserDocument(uid: string, phone: string) {
  try {
    return await withRetry(async () => {
      const ref = doc(firestore, "users", uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        console.log("[firestore] creating users/{uid}", { uid });
        await setDoc(
          ref,
          {
            uid,
            phone,
            name: "",
            age: 0,
            sex: "other",
            dob: "",
            address: "",
            pincode: "",
            familyMembers: [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          } satisfies UserProfile,
          { merge: true },
        );
        return null;
      }
      return snap.data() as UserProfile;
    });
  } catch (e) {
    throw wrapFirestoreError("ensureUserDocument(users/{uid})", e);
  }
}

export async function getUserProfile(uid: string) {
  try {
    const ref = doc(firestore, "users", uid);
    const snap = await getDoc(ref);
    return snap.exists() ? (snap.data() as UserProfile) : null;
  } catch (e) {
    throw wrapFirestoreError("getUserProfile(users/{uid})", e);
  }
}

export async function upsertUserProfile(profile: UserProfile) {
  try {
    const ref = doc(firestore, "users", profile.uid);
    const existing = await getDoc(ref);
    const base = {
      ...profile,
      updatedAt: serverTimestamp(),
      createdAt: existing.exists() ? existing.data().createdAt : serverTimestamp(),
    };
    await setDoc(ref, base, { merge: true });
  } catch (e) {
    throw wrapFirestoreError("upsertUserProfile(users/{uid})", e);
  }
}

