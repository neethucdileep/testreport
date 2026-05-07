import { resolveAccessForUser, type Access } from "@/lib/access";
import { useAuth } from "@/state/useAuth";
import { useEffect, useState } from "react";

export function useAccess() {
  const { user, isReady } = useAuth();
  const [access, setAccess] = useState<Access | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function run() {
      if (!isReady) return;
      if (!user?.email) {
        setAccess(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await resolveAccessForUser({ uid: user.uid, email: user.email });
        if (alive) setAccess(res);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Failed to load access");
      } finally {
        if (alive) setLoading(false);
      }
    }
    void run();
    return () => {
      alive = false;
    };
  }, [user?.email, user?.uid, isReady]);

  return { access, loading, error, isAuthed: !!user, isReady };
}

