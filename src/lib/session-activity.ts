export const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
export const ACTIVITY_COOKIE = "alp_last_activity";
export function sessionIsIdle(value: string | undefined, now = Date.now()) {
  if (!value) return false; // Existing sign-ins migrate in Proxy; new sign-ins always stamp activity.
  const timestamp = Number(value);
  return !Number.isFinite(timestamp) || timestamp <= 0 || timestamp > now + 60000 || now - timestamp >= IDLE_TIMEOUT_MS;
}
export function tokenNeedsRefresh(token: string, now = Date.now()) {
  try { return JSON.parse(atob(token.split(".")[1].replace(/-/g,"+").replace(/_/g,"/"))).exp * 1000 < now + 5 * 60000; }
  catch { return true; } // The auth provider, never these unverified claims, authorises the session.
}
