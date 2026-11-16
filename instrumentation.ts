import { assertStagingIsolation } from "@/server/environment-isolation";

export function register() {
  assertStagingIsolation();
}
