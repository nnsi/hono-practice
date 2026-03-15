#!/usr/bin/env node

const { execFileSync, execSync } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");

const root = path.resolve(__dirname, "..");

function gitFiles(...patterns) {
  const args = ["ls-files", ...patterns];
  return execFileSync("git", args, { encoding: "utf-8", cwd: root })
    .trim()
    .split("\n")
    .filter(Boolean);
}

function clocFromList(files) {
  if (files.length === 0) return { files: 0, blank: 0, comment: 0, code: 0 };

  const tmp = path.join(os.tmpdir(), `cloc-list-${Date.now()}.txt`);
  fs.writeFileSync(tmp, files.join("\n"));

  try {
    const out = execSync(`cloc --list-file="${tmp}"`, {
      encoding: "utf-8",
      cwd: root,
    });
    const line = out
      .split("\n")
      .find((l) => /^TypeScript\s/.test(l) || /^SUM:\s/.test(l));
    if (!line) return { files: 0, blank: 0, comment: 0, code: 0 };
    const parts = line.split(/\s+/).filter(Boolean);
    return {
      files: Number(parts[1]),
      blank: Number(parts[2]),
      comment: Number(parts[3]),
      code: Number(parts[4]),
    };
  } finally {
    fs.unlinkSync(tmp);
  }
}

const allTs = gitFiles("*.ts");
const allTsx = gitFiles("*.tsx");

const testPattern = /\.(test|spec)\.(ts|tsx)$/;
const testFiles = [...allTs, ...allTsx].filter((f) => testPattern.test(f));
const prodFiles = [...allTs, ...allTsx].filter((f) => !testPattern.test(f));

const ts = clocFromList(allTs);
const tsx = clocFromList(allTsx);
const total = {
  files: ts.files + tsx.files,
  code: ts.code + tsx.code,
  blank: ts.blank + tsx.blank,
  comment: ts.comment + tsx.comment,
};
const test = clocFromList(testFiles);
const prod = clocFromList(prodFiles);
const ratio =
  total.code > 0 ? ((test.code / total.code) * 100).toFixed(1) : "0.0";

const pad = (s, n) => String(s).padStart(n);
const fmt = (n) => Number(n).toLocaleString();
const row = (label, d) =>
  `  ${label.padEnd(14)} ${pad(d.files, 6)}  ${pad(fmt(d.code), 10)}  ${pad(fmt(d.blank), 8)}  ${pad(fmt(d.comment), 8)}`;
const sep = `  ${"─".repeat(14)} ${"─".repeat(6)}  ${"─".repeat(10)}  ${"─".repeat(8)}  ${"─".repeat(8)}`;

console.log();
console.log("  TypeScript Lines of Code");
console.log("  ========================");
console.log();
console.log(
  `  ${"".padEnd(14)} ${pad("files", 6)}  ${pad("code", 10)}  ${pad("blank", 8)}  ${pad("comment", 8)}`,
);
console.log(sep);
console.log(row(".ts", ts));
console.log(row(".tsx", tsx));
console.log(sep);
console.log(row("Total", total));
console.log();
console.log(row("Production", prod));
console.log(row("Test", test));
console.log();
console.log(`  Test ratio: ${ratio}%`);
console.log();
