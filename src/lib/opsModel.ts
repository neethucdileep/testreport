import { firestore } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  type DocumentData,
} from "firebase/firestore/lite";

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as T;
}

export type Camp = {
  id: string;
  employerName: string;
  campName: string;
  campCode: string;
  startDate: string; // ISO date for v1
  endDate: string; // ISO date for v1
  assignedStaffUids: string[];
  rosterSource: "upload" | "none";
  required: {
    email: boolean;
    empId: boolean;
    height: boolean;
    weight: boolean;
    bp: boolean;
    tubes: boolean;
    urine: boolean;
  };
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type Staff = {
  uid: string;
  email: string;
  name: string;
  active: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type RosterRow = {
  empId: string;
  fullName: string;
  phone?: string;
  email?: string;
  gender?: "male" | "female" | "other";
  age?: number;
  department?: string;
  updatedAt?: unknown;
  createdAt?: unknown;
};

export type Encounter = {
  id: string;
  campId: string;
  source: "roster" | "manual";
  empId: string;
  name: string;
  age: number;
  gender: "male" | "female" | "other";
  phone: string;
  email?: string;
  heightCm?: number;
  weightKg?: number;
  bpSys?: number;
  bpDia?: number;
  tubes: { sst: boolean; edta: boolean; fluoride: boolean };
  urine: boolean;
  registeredAt?: unknown;
  registeredByUid: string;
  collectedAt?: unknown;
  collectedByUid?: string;
};

export async function upsertStaffRecord(staff: Staff) {
  const ref = doc(firestore, "staff", staff.uid);
  const docData: Staff = {
    ...staff,
    name: staff.name.trim(),
    email: staff.email.trim().toLowerCase(),
    updatedAt: serverTimestamp(),
    createdAt: staff.createdAt ?? serverTimestamp(),
  };
  await setDoc(ref, docData, { merge: true });
}

export async function listStaff(): Promise<Staff[]> {
  const snaps = await getDocs(collection(firestore, "staff"));
  return snaps.docs
    .map((d) => d.data() as Staff)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function createCamp(input: Omit<Camp, "id" | "createdAt" | "updatedAt">) {
  const id = crypto.randomUUID();
  const ref = doc(firestore, "camps", id);
  const data: Camp = { ...input, id, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
  await setDoc(ref, data, { merge: true });
  return id;
}

export async function listCamps(): Promise<Camp[]> {
  const snaps = await getDocs(collection(firestore, "camps"));
  return snaps.docs
    .map((d) => d.data() as Camp)
    .sort((a, b) => (b.startDate ?? "").localeCompare(a.startDate ?? ""));
}

export async function getCamp(campId: string): Promise<Camp | null> {
  const snap = await getDoc(doc(firestore, "camps", campId));
  return snap.exists() ? (snap.data() as Camp) : null;
}

export async function setCampStaffUids(campId: string, uids: string[]) {
  await setDoc(
    doc(firestore, "camps", campId),
    { assignedStaffUids: uids, updatedAt: serverTimestamp() } satisfies Partial<Camp>,
    { merge: true },
  );
}

export async function listCampsForStaff(uid: string): Promise<Camp[]> {
  const q = query(collection(firestore, "camps"), where("assignedStaffUids", "array-contains", uid));
  const snaps = await getDocs(q);
  return snaps.docs.map((d) => d.data() as Camp).sort((a, b) => (b.startDate ?? "").localeCompare(a.startDate ?? ""));
}

export async function upsertRosterRow(campId: string, row: RosterRow) {
  const ref = doc(firestore, "camps", campId, "roster", row.empId);
  const data: DocumentData = stripUndefined({
    ...row,
    empId: row.empId.trim(),
    fullName: row.fullName.trim(),
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  });
  await setDoc(ref, data, { merge: true });
}

export async function getRosterRow(campId: string, empId: string): Promise<RosterRow | null> {
  const snap = await getDoc(doc(firestore, "camps", campId, "roster", empId.trim()));
  return snap.exists() ? (snap.data() as RosterRow) : null;
}

export async function createEncounter(campId: string, enc: Omit<Encounter, "id" | "campId" | "registeredAt">) {
  const id = crypto.randomUUID();
  const ref = doc(firestore, "camps", campId, "encounters", id);
  const data: Encounter = stripUndefined({
    ...enc,
    id,
    campId,
    registeredAt: serverTimestamp(),
  }) as Encounter;
  await setDoc(ref, data, { merge: true });
  return id;
}

export async function listEncounters(campId: string): Promise<Encounter[]> {
  const snaps = await getDocs(collection(firestore, "camps", campId, "encounters"));
  return snaps.docs
    .map((d) => d.data() as Encounter)
    .sort((a, b) => (String(b.registeredAt ?? "")).localeCompare(String(a.registeredAt ?? "")));
}

