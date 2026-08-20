#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

export const MINIMUM_UNIT_TEST_FILES = 195;

const TEST_FILE = /\.(?:test|spec)\.(?:js|mjs|cjs|ts|mts|cts|jsx|tsx)$/;
const EXCLUDED_DIRECTORIES = new Set([
  ".git",
  ".worktrees",
  "dist",
  "e2e",
  "node_modules",
]);

export function collectTestFiles(root) {
  const found = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && EXCLUDED_DIRECTORIES.has(entry.name)) continue;
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(fullPath);
      else if (TEST_FILE.test(entry.name)) found.push(path.relative(root, fullPath));
    }
  };
  visit(root);
  return found;
}

export function assertTestBaseline(files, minimum = MINIMUM_UNIT_TEST_FILES) {
  if (files.length < minimum) {
    throw new Error(`Unit/integration test files dropped below baseline: ${files.length} < ${minimum}`);
  }
  return files.length;
}

if (process.argv[1]?.endsWith("check-test-baseline.js")) {
  const count = assertTestBaseline(collectTestFiles(process.cwd()));
  console.log(`Unit/integration test file baseline OK: ${count} >= ${MINIMUM_UNIT_TEST_FILES}`);
}
