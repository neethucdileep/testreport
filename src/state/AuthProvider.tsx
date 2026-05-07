import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import React, { useEffect, useMemo, useState } from "react";
import { firebaseAuth } from "@/lib/firebase";
import { AuthContext, type AuthContextValue } from "@/state/authContext";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(firebaseAuth, (u) => {
      console.log("[auth] onAuthStateChanged", { uid: u?.uid ?? null });
      setUser(u);
      setIsReady(true);
    });
    return () => unsub();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isReady,
      signOut: async () => {
        await signOut(firebaseAuth);
      },
    }),
    [user, isReady],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
