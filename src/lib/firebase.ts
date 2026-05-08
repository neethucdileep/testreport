import { getApp, getApps, initializeApp } from "firebase/app";
import { browserLocalPersistence, connectAuthEmulator, getAuth, setPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore/lite";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

console.log("VITE_FIREBASE_PROJECT_ID =", import.meta.env.VITE_FIREBASE_PROJECT_ID);

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);

// Keep users logged in across refreshes/reopens (saves OTP/SMS credits).
// If persistence cannot be set (e.g. blocked storage), Auth will fall back gracefully.
setPersistence(firebaseAuth, browserLocalPersistence).catch((e) => {
  console.warn("[auth] failed to set persistence", e);
});

// Firestore Lite uses REST/fetch and avoids WebChannel transport issues.
export const firestore = getFirestore(firebaseApp);

// Secondary auth instance for admin to create staff accounts without logging out.
export const secondaryFirebaseApp = initializeApp(firebaseConfig, "secondary");
export const secondaryAuth = getAuth(secondaryFirebaseApp);

export const functions = getFunctions(firebaseApp);

const useEmulators = import.meta.env.VITE_USE_EMULATORS === "true";
const emulatorHost = (import.meta.env.VITE_EMULATOR_HOST as string | undefined) ?? "127.0.0.1";

if (import.meta.env.DEV && useEmulators) {
  // Keep these ports in sync with firebase.json.
  connectFunctionsEmulator(functions, emulatorHost, Number(import.meta.env.VITE_FUNCTIONS_EMULATOR_PORT ?? 5001));
  connectAuthEmulator(firebaseAuth, `http://${emulatorHost}:${Number(import.meta.env.VITE_AUTH_EMULATOR_PORT ?? 9500)}`);

  // Secondary auth should also use the emulator in local dev.
  connectAuthEmulator(secondaryAuth, `http://${emulatorHost}:${Number(import.meta.env.VITE_AUTH_EMULATOR_PORT ?? 9500)}`);
}

