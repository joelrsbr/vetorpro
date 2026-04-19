import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Reads a key/value pair from the public app_settings table.
 * Allows runtime configuration without rebuild.
 */
export function useAppSetting(key: string, fallback: string = "") {
  const [value, setValue] = useState<string>(fallback);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase
        .from("app_settings" as any)
        .select("value")
        .eq("key", key)
        .maybeSingle();
      if (mounted) {
        if (!error && data && (data as any).value) {
          setValue((data as any).value as string);
        }
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [key]);

  return { value, loading };
}
