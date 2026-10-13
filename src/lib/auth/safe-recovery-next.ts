export function safeRecoveryNext(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\r\n\x00]/.test(value)) return "/dashboard";
  return value;
}
