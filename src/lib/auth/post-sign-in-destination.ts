export function getPostSignInDestination(roles: readonly string[]): "/admin" | "/dashboard" {
  return roles.includes("admin") ? "/admin" : "/dashboard";
}
