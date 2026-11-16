export type AlpSupabaseConfig = {
  url: string;
  anonKey: string;
};

export type AlpSupabaseServerConfig = AlpSupabaseConfig & {
  serviceRoleKey: string;
};

export type AlpSupabaseClientPlaceholder = {
  kind: "alp-supabase-client-placeholder";
  url: string;
  hasAnonKey: boolean;
};

export type AlpSupabaseServerPlaceholder = {
  kind: "alp-supabase-server-placeholder";
  url: string;
  hasServiceRoleKey: boolean;
};
