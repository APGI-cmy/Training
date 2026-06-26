import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const ACCESS_COOKIE = "alp_access_token";
const REFRESH_COOKIE = "alp_refresh_token";
const USER_COOKIE = "alp_user_id";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 8;

type AlpAuthUser = {
  id: string;
  email?: string;
};

export type AlpSession = {
  accessToken: string;
  refreshToken?: string;
  user: AlpAuthUser;
};

export type AlpRole = "learner" | "admin" | "reviewer" | "course_publisher";

type SupabaseTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  user?: {
    id?: string;
    email?: string;
  };
  error?: string;
  error_description?: string;
  msg?: string;
};

function getSupabasePublicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

function supabaseHeaders(accessToken?: string) {
  const config = getSupabasePublicConfig();

  if (!config) {
    return null;
  }

  return {
    apikey: config.anonKey,
    authorization: `Bearer ${accessToken ?? config.anonKey}`,
    "content-type": "application/json"
  };
}

export function getSupabaseRestUrl(path: string) {
  const config = getSupabasePublicConfig();

  if (!config) {
    return null;
  }

  return `${config.url.replace(/\/$/, "")}${path}`;
}

export async function signInWithPassword(email: string, password: string) {
  const config = getSupabasePublicConfig();

  if (!config) {
    return { ok: false, error: "Supabase public environment variables are not configured." };
  }

  const response = await fetch(`${config.url.replace(/\/$/, "")}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: config.anonKey,
      "content-type": "application/json"
    },
    body: JSON.stringify({ email, password }),
    cache: "no-store"
  });

  const payload = (await response.json().catch(() => ({}))) as SupabaseTokenResponse;

  if (!response.ok || !payload.access_token || !payload.user?.id) {
    return {
      ok: false,
      error: payload.error_description ?? payload.error ?? payload.msg ?? "Unable to sign in."
    };
  }

  const cookieStore = await cookies();
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS
  };

  cookieStore.set(ACCESS_COOKIE, payload.access_token, cookieOptions);

  if (payload.refresh_token) {
    cookieStore.set(REFRESH_COOKIE, payload.refresh_token, cookieOptions);
  }

  cookieStore.set(USER_COOKIE, payload.user.id, cookieOptions);

  return { ok: true };
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_COOKIE);
  cookieStore.delete(REFRESH_COOKIE);
  cookieStore.delete(USER_COOKIE);
}

export async function getCurrentSession(): Promise<AlpSession | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;
  const userId = cookieStore.get(USER_COOKIE)?.value;

  if (!accessToken || !userId) {
    return null;
  }

  const headers = supabaseHeaders(accessToken);
  const userUrl = getSupabaseRestUrl("/auth/v1/user");

  if (!headers || !userUrl) {
    return null;
  }

  const response = await fetch(userUrl, {
    method: "GET",
    headers,
    cache: "no-store"
  });

  if (!response.ok) {
    return null;
  }

  const user = (await response.json().catch(() => ({}))) as AlpAuthUser;

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id ?? userId,
      email: user.email
    }
  };
}

export async function requireSession() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function getUserRoles(accessToken: string): Promise<AlpRole[]> {
  const headers = supabaseHeaders(accessToken);
  const url = getSupabaseRestUrl("/rest/v1/user_roles?select=role");

  if (!headers || !url) {
    return [];
  }

  const response = await fetch(url, {
    method: "GET",
    headers,
    cache: "no-store"
  });

  if (!response.ok) {
    return [];
  }

  const rows = (await response.json().catch(() => [])) as Array<{ role?: AlpRole }>;

  return rows.map((row) => row.role).filter((role): role is AlpRole => Boolean(role));
}

export async function requireRole(allowedRoles: AlpRole[]) {
  const session = await requireSession();
  const roles = await getUserRoles(session.accessToken);

  if (!roles.some((role) => allowedRoles.includes(role))) {
    redirect("/unauthorized");
  }

  return { session, roles };
}
