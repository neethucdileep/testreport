import { httpsCallable } from "firebase/functions";
import { functions, firebaseAuth } from "@/lib/firebase";
import { signInWithCustomToken } from "firebase/auth";

export async function requestPatientOtp(phone: string) {
  const fn = httpsCallable(functions, "patientRequestOtp");
  const res = await fn({ phone });
  const data = res.data as { debugOtp?: string } | undefined;
  return { debugOtp: data?.debugOtp };
}

export async function verifyPatientOtp(phone: string, otp: string) {
  const fn = httpsCallable(functions, "patientVerifyOtp");
  const res = await fn({ phone, otp });
  const data = res.data as { customToken: string };
  await signInWithCustomToken(firebaseAuth, data.customToken);
}

