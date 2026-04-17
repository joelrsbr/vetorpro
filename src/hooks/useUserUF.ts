import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const UF_OPTIONS = ["RS", "SP", "MG", "RJ", "PR"] as const;
export type UF = typeof UF_OPTIONS[number];
export const AVAILABLE_UFS: readonly UF[] = UF_OPTIONS;

export function useUserUF() {
  const { user } = useAuth();
  const [uf, setUfState] = useState<UF>("RS");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("uf")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const value = (data as { uf?: string } | null)?.uf;
      if (value && (UF_OPTIONS as readonly string[]).includes(value)) {
        setUfState(value as UF);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const setUf = useCallback(async (next: UF) => {
    setUfState(next);
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ uf: next })
      .eq("user_id", user.id);
  }, [user]);

  return { uf, setUf, loading };
}
