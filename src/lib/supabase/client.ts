import { getClientEnv } from "@/lib/config/env";
import type { AlpSupabaseClientPlaceholder } from "@/lib/supabase/types";

export function createBrowserSupabasePlaceholder(): AlpSupabaseClientPlaceholder {
  const env = getClientEnv();

  return {
    kind: "alp-supabase-client-placeholder",
    url: env.supabaseUrl,
    hasAnonKey: env.supabaseAnonKey.length > 0
  };
}
