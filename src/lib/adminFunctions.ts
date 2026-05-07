import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

export async function adminSetStaffPassword(args: { staffUid: string; newPassword: string }) {
  const fn = httpsCallable(functions, "adminSetStaffPassword");
  await fn(args);
}

