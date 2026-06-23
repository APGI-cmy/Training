import { validateServerEnv } from "@/lib/config/env";
import type { AlpSupabaseServerPlaceholder } from "@/lib/supabase/types";

export function createServerSupabasePlaceholder(): AlpSupabaseServerPlaceholder {
  const validation = validateServerEnv();

  return {
    kind: "alp-supabase-server-placeholder",
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    hasServiceRoleKey: validation.ok
  };
}
