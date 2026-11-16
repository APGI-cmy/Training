export function safeRecoveryNext(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\r\n\x00]/.test(value)) return "/dashboard";
  if (["/alp-sign-in", "/forgot-password", "/reset-password", "/confirm-account"].includes(value.split(/[?#]/)[0].replace(/\/$/, ""))) return "/dashboard";
  return value;
}
