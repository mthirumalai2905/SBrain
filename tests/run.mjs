import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const result = spawnSync("npx", ["tsx", "--test", "tests/unit/harness.test.ts", "tests/integration/fakes.test.ts"], {
  cwd: root,
  encoding: "utf8",
  shell: true,
  env: { ...process.env, BRAIN_SMOKE: "" },
});
const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
mkdirSync(path.join(root, "reports"), { recursive: true });
const status = result.status === 0 ? "PASS" : "FAIL";
writeFileSync(
  path.join(root, "reports", "latest.md"),
  `# Test report\n\n${status}\n\n\`\`\`\n${output}\n\`\`\`\n`,
);
process.stdout.write(`${output}\n`);
process.exit(result.status ?? 1);
