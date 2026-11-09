import { spawnSync } from "node:child_process";

const result = spawnSync("npx", ["vitest", "run", "tests/qa-to-red/alp/w4-2-invitation-lifecycle-red.spec.ts"], {
  encoding: "utf8",
  shell: process.platform === "win32"
});
const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
process.stdout.write(output);

if (result.status === 0) {
  console.error("RED acceptance failed: lifecycle suite unexpectedly passed.");
  process.exit(1);
}
const required = ["QA-IL-001", "QA-IL-002", "QA-IL-003", "QA-IL-004", "QA-IL-005", "QA-IL-006", "QA-IL-007", "QA-IL-008", "QA-IL-009", "QA-IL-010"];
const missing = required.filter((id) => !output.includes(id));
if (missing.length) {
  console.error(`RED acceptance failed: expected lifecycle failures were not observed: ${missing.join(", ")}`);
  process.exit(1);
}
if (!output.includes("QA-IL-011")) {
  console.error("RED acceptance failed: AMC manifest check did not execute.");
  process.exit(1);
}
console.log("Correct RED accepted: QA-IL-001..010 fail for absent persistent lifecycle capabilities; QA-IL-011 executes against the filed manifest.");
