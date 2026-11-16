import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect } from "vitest";

export function root(): string {
  return process.env.ALP_REPO_ROOT ?? process.cwd();
}

export function exists(path: string): boolean {
  return existsSync(join(root(), path));
}

export function read(path: string): string {
  return readFileSync(join(root(), path), "utf8");
}

export function expectPath(path: string, qaId: string): void {
  expect(exists(path), `${qaId}: expected repository path ${path}`).toBe(true);
}

export function expectContains(path: string, text: string, qaId: string): void {
  expectPath(path, qaId);
  expect(read(path).includes(text), `${qaId}: expected ${path} to contain ${text}`).toBe(true);
}

export function expectAnyPath(paths: string[], qaId: string): void {
  expect(paths.some(exists), `${qaId}: expected one of ${paths.join(", ")}`).toBe(true);
}
