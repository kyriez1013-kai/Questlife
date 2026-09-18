import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const out = mkdtempSync(join(tmpdir(), "questlife-sync-v2-"));
const compile = spawnSync(
  process.execPath,
  [
    "node_modules/typescript/bin/tsc",
    "--module",
    "commonjs",
    "--target",
    "es2022",
    "--moduleResolution",
    "node",
    "--jsx",
    "react-jsx",
    "--resolveJsonModule",
    "--esModuleInterop",
    "--skipLibCheck",
    "--rootDir",
    ".",
    "--outDir",
    out,
    "tests/sync-v2/engine.test.ts",
  ],
  { stdio: "inherit" },
);
if (compile.status) process.exit(compile.status);
const run = spawnSync(
  process.execPath,
  ["--test", join(out, "tests/sync-v2/engine.test.js")],
  {
    stdio: "inherit",
    env: { ...process.env, NODE_PATH: join(process.cwd(), "node_modules") },
  },
);
process.exit(run.status ?? 1);
