const publicAccountPaths = new Set([
  "/alp-sign-in", "/register", "/forgot-password", "/reset-password", "/confirm-account", "/privacy",
]);

// These screens must remain usable after an intentional account switch. Access
// to learning/admin routes is still enforced by the server and database.
export function isPublicAccountPath(pathname: string) {
  return publicAccountPaths.has(pathname) || /^\/invitations\/[^/]+\/?$/.test(pathname);
}

export function registrationHref(returnTo?: string) {
  if (!returnTo?.startsWith("/") || returnTo.startsWith("//")) return "/register";
  const url = new URL(returnTo, "https://account-entry.invalid");
  const token = /^\/invitations\/([^/]+)\/?$/.exec(url.pathname)?.[1]
    ?? (url.pathname === "/register" ? url.searchParams.get("token") : null);
  return token && /^[A-Za-z0-9_-]{20,512}$/.test(token)
    ? `/register?token=${encodeURIComponent(token)}&setup=1`
    : "/register";
}
