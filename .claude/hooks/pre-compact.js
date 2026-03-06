#!/usr/bin/env node

import { execSync } from "child_process";
import { mkdirSync, existsSync } from "fs";
import { join } from "path";

const projectDir = process.env.CLAUDE_PROJECT_DIR;
if (!projectDir) {
  console.error("CLAUDE_PROJECT_DIR is not set");
  process.exit(1);
}

let input = "";
process.stdin.on("data", (d) => (input += d));
process.stdin.on("end", () => {
  try {
    const { transcript_path } = JSON.parse(input);
    if (!transcript_path) {
      console.error("transcript_path not found in hook input");
      process.exit(1);
    }

    const outDir = join(projectDir, "docs", "diary-cc-logs");
    if (!existsSync(outDir)) {
      mkdirSync(outDir, { recursive: true });
    }

    const now = new Date();
    const ts = now.toISOString().replace(/[-:T]/g, "").slice(0, 14);
    const outPath = join(outDir, `${ts}.md`);

    const script = join(projectDir, "scripts", "cc-log-to-md.js");
    execSync(`node "${script}" "${transcript_path}" -o "${outPath}"`, {
      stdio: "inherit",
    });
  } catch (err) {
    console.error("pre-compact hook failed:", err.message);
    process.exit(1);
  }
});
