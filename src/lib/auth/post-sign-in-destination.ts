export function getPostSignInDestination(roles: readonly string[]): "/admin" | "/dashboard" {
  return roles.includes("admin") ? "/admin" : "/dashboard";
}

export function getPortalEntryDestination(roles?: readonly string[] | null): "/alp-sign-in" | "/admin" | "/dashboard" {
  if (!roles) {
    return "/alp-sign-in";
  }

  return getPostSignInDestination(roles);
}
