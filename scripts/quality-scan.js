#!/usr/bin/env node
/**
 * 週次品質スキャン — コードベース全体をスキャンし、
 * autoFixable / judgment-required に分類されたレポートを出力する。
 *
 * Usage: node scripts/quality-scan.js
 */
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "../..");
const SCAN_DIRS = ["apps", "packages"];
const DOC_DIRS = ["docs/knowledges", "docs/adr"];
const INSTRUCTION_FILES = [
  "CLAUDE.md",
  "apps/backend/CLAUDE.md",
  "apps/frontend/CLAUDE.md",
  "apps/mobile/CLAUDE.md",
  ".claude/rules/parallel-agents.md",
  ".claude/rules/response-style.md",
];
const LONG_FILE_LIMIT = 200;

// ── helpers ──────────────────────────────────────────────
function walkTs(dir) {
  const abs = join(ROOT, dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs, { recursive: true, withFileTypes: false })
    .filter((f) => /\.(ts|tsx)$/.test(f) && !f.includes("node_modules"))
    .map((f) => join(dir, f).replace(/\\/g, "/"));
}

function countLines(relPath) {
  return readFileSync(join(ROOT, relPath), "utf-8").split("\n").length;
}

function isTestFile(f) {
  return /\.(test|spec)\.(ts|tsx)$/.test(f);
}

function isGenerated(f) {
  return /\.gen\.(ts|tsx)$/.test(f);
}

// ── scanners ─────────────────────────────────────────────
function scanConsoleLog(files) {
  const hits = [];
  for (const f of files) {
    if (isTestFile(f) || isGenerated(f) || f.includes("logger")) continue;
    const lines = readFileSync(join(ROOT, f), "utf-8").split("\n");
    lines.forEach((line, i) => {
      if (/\bconsole\.log\b/.test(line) && !/\/\//.test(line.split("console.log")[0])) {
        hits.push({ file: f, line: i + 1, detail: line.trim() });
      }
    });
  }
  return { category: "console.log 残存", severity: "autoFixable", items: hits };
}

function scanLongFiles(files) {
  const hits = [];
  for (const f of files) {
    if (isTestFile(f) || f.endsWith(".gen.ts")) continue;
    const n = countLines(f);
    if (n > LONG_FILE_LIMIT) {
      hits.push({ file: f, detail: `${n} lines` });
    }
  }
  hits.sort((a, b) => Number.parseInt(b.detail) - Number.parseInt(a.detail));
  return { category: "200行超ファイル", severity: "judgment-required", items: hits };
}

function scanTypeCasts(files) {
  const autoFix = [];
  const judgment = [];
  for (const f of files) {
    if (isTestFile(f) || isGenerated(f)) continue;
    const lines = readFileSync(join(ROOT, f), "utf-8").split("\n");
    lines.forEach((line, i) => {
      if (/\bas any\b/.test(line)) {
        autoFix.push({ file: f, line: i + 1, detail: line.trim() });
      } else if (/\bas unknown as\b/.test(line)) {
        judgment.push({ file: f, line: i + 1, detail: line.trim() });
      }
    });
  }
  return [
    { category: "`as any` 使用", severity: "autoFixable", items: autoFix },
    { category: "`as unknown as` 使用", severity: "judgment-required", items: judgment },
  ];
}

function scanStaleDocs() {
  const pathPattern = /(?:apps|packages|infra|feature|scripts|src)\/[\w\-/.]+(?:\.\w+)/g;
  const hits = [];
  for (const dir of DOC_DIRS) {
    const abs = join(ROOT, dir);
    if (!existsSync(abs)) continue;
    for (const f of readdirSync(abs)) {
      if (extname(f) !== ".md") continue;
      const relDoc = `${dir}/${f}`;
      const content = readFileSync(join(abs, f), "utf-8");
      const matches = content.match(pathPattern) || [];
      for (const ref of [...new Set(matches)]) {
        if (!existsSync(join(ROOT, ref))) {
          hits.push({ file: relDoc, detail: `存在しない参照: ${ref}` });
        }
      }
    }
  }
  return { category: "陳腐化ドキュメント参照", severity: "judgment-required", items: hits };
}

function scanInstructionSurface() {
  const rows = [];
  let totalLines = 0;
  let totalBullets = 0;
  for (const f of INSTRUCTION_FILES) {
    const abs = join(ROOT, f);
    if (!existsSync(abs)) continue;
    const content = readFileSync(abs, "utf-8");
    const lines = content.split("\n");
    const bullets = lines.filter((l) => /^\s*-\s/.test(l)).length;
    rows.push({ file: f, detail: `${lines.length} lines / ${bullets} bullets` });
    totalLines += lines.length;
    totalBullets += bullets;
  }
  rows.push({ file: "**合計**", detail: `${totalLines} lines / ${totalBullets} bullets` });
  return { category: "Instruction Surface", severity: "info", items: rows };
}

// ── report ────────────────────────────────────────────────
function formatReport(results) {
  const lines = ["# Quality Scan Report", `> ${new Date().toISOString().slice(0, 10)}`, ""];

  const auto = results.filter((r) => r.severity === "autoFixable" && r.items.length);
  const judg = results.filter((r) => r.severity === "judgment-required" && r.items.length);
  const info = results.filter((r) => r.severity === "info");

  // summary
  const autoCount = auto.reduce((s, r) => s + r.items.length, 0);
  const judgCount = judg.reduce((s, r) => s + r.items.length, 0);
  lines.push("## Summary");
  lines.push(`- autoFixable: **${autoCount}** 件`);
  lines.push(`- judgment-required: **${judgCount}** 件`);
  lines.push("");

  if (auto.length) {
    lines.push("## AutoFixable");
    for (const r of auto) {
      lines.push(`### ${r.category} (${r.items.length}件)`);
      for (const item of r.items.slice(0, 30)) {
        const loc = item.line ? `:${item.line}` : "";
        lines.push(`- \`${item.file}${loc}\` — ${item.detail}`);
      }
      if (r.items.length > 30) lines.push(`- ...他 ${r.items.length - 30} 件`);
      lines.push("");
    }
  }

  if (judg.length) {
    lines.push("## Judgment Required");
    for (const r of judg) {
      lines.push(`### ${r.category} (${r.items.length}件)`);
      for (const item of r.items.slice(0, 30)) {
        const loc = item.line ? `:${item.line}` : "";
        lines.push(`- \`${item.file}${loc}\` — ${item.detail}`);
      }
      if (r.items.length > 30) lines.push(`- ...他 ${r.items.length - 30} 件`);
      lines.push("");
    }
  }

  if (info.length) {
    lines.push("## Info");
    for (const r of info) {
      lines.push(`### ${r.category}`);
      for (const item of r.items) {
        lines.push(`- \`${item.file}\` — ${item.detail}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

// ── main ──────────────────────────────────────────────────
const allFiles = SCAN_DIRS.flatMap(walkTs);
const results = [
  scanConsoleLog(allFiles),
  scanLongFiles(allFiles),
  ...scanTypeCasts(allFiles),
  scanStaleDocs(),
  scanInstructionSurface(),
];
process.stdout.write(formatReport(results));
