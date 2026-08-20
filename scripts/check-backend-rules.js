#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const BACKEND_DIR = join(ROOT, "apps", "backend");
const DISALLOWED_PATTERNS = [
  {
    name: "`c.req.json<T>()`",
    regex: /\bc\.req\.json\s*</,
    message:
      "Use Zod + zValidator instead of generic c.req.json<T>() in backend code.",
  },
];

const DISALLOWED_DEPENDENCIES = [
  {
    appliesTo:
      /^apps\/backend\/(?:context|feature|feature-sync|middleware|port)\//,
    regex:
      /from\s+["'](?:@backend\/infra\/rateLimit|(?:\.\.\/)+infra\/rateLimit)(?:\/|["'])/,
    message:
      "Inner layers must depend on the application-owned rate-limit port, not its infrastructure adapters.",
  },
  {
    appliesTo:
      /^apps\/backend\/(?:feature|feature-sync)\/.*(?:Usecase|Service|Guard|Policy|Handler)\.ts$/,
    regex:
      /from\s+["'](?:@backend\/context(?:\/[^"']*)?|(?:\.\.\/)+context(?:\/[^"']*)?)["']/,
    message:
      "Application services must receive narrow dependencies instead of importing the Hono AppContext.",
  },
];

function walk(dir) {
  const entries = readdirSync(dir);
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === "dist") continue;
      files.push(...walk(fullPath));
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry)) continue;
    if (/\.(test|spec)\.(ts|tsx)$/.test(entry)) continue;
    files.push(fullPath);
  }
  return files;
}

const violations = [];

for (const filePath of walk(BACKEND_DIR)) {
  const relPath = relative(ROOT, filePath).replace(/\\/g, "/");
  const lines = readFileSync(filePath, "utf8").split("\n");
  lines.forEach((line, index) => {
    for (const pattern of DISALLOWED_PATTERNS) {
      if (!pattern.regex.test(line)) continue;
      const prefix = line.split("c.req.json")[0] ?? "";
      if (prefix.includes("//")) continue;
      violations.push({
        file: relPath,
        line: index + 1,
        pattern: pattern.name,
        message: pattern.message,
      });
    }
    for (const dependency of DISALLOWED_DEPENDENCIES) {
      if (!dependency.appliesTo.test(relPath) || !dependency.regex.test(line)) {
        continue;
      }
      violations.push({
        file: relPath,
        line: index + 1,
        pattern: "dependency direction",
        message: dependency.message,
      });
    }
  });
}

if (violations.length > 0) {
  console.error("Backend rule violations detected:");
  for (const violation of violations) {
    console.error(
      `- ${violation.file}:${violation.line} ${violation.pattern} — ${violation.message}`,
    );
  }
  process.exit(1);
}
