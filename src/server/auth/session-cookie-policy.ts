// APGI portal cookies are independent of the AWS streaming session.
export const ACCESS_COOKIE = "alp_access_token";
export const REFRESH_COOKIE = "alp_refresh_token";
export const USER_COOKIE = "alp_user_id";
export const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 8;

export function portalCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS
  };
}
