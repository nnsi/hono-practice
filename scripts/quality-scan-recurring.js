#!/usr/bin/env node
/**
 * 3-strike検出 — 前回レポートと現在のスキャン結果を比較し、
 * 繰り返し出現する問題を「Recurring Issues」として出力する。
 *
 * Usage: node scripts/quality-scan-recurring.js <prev-report.md>
 * stdin: 現在のスキャンレポート（quality-scan.jsのstdout）
 * stdout: Recurring Issuesセクションを追記したレポート
 */
import { readFileSync, existsSync } from "node:fs";

function parseScanReport(markdown) {
  const issues = new Map();
  let currentCategory = "";
  for (const line of markdown.split("\n")) {
    const catMatch = line.match(/^### (.+?) \(\d+件\)/);
    if (catMatch) {
      currentCategory = catMatch[1];
      continue;
    }
    if (currentCategory && line.startsWith("- `")) {
      const fileMatch = line.match(/^- `([^`]+)`/);
      if (fileMatch) {
        const file = fileMatch[1].replace(/:\d+$/, "");
        const key = `${currentCategory}::${file}`;
        issues.set(key, { category: currentCategory, file });
      }
    }
  }
  return issues;
}

async function main() {
  const prevPath = process.argv[2];
  let input = "";
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  if (!prevPath || !existsSync(prevPath)) {
    process.stdout.write(input);
    return;
  }

  const prevReport = readFileSync(prevPath, "utf-8");
  const prevIssues = parseScanReport(prevReport);
  const currentIssues = parseScanReport(input);

  const recurring = [];
  for (const [key, info] of currentIssues) {
    if (prevIssues.has(key)) {
      recurring.push(info);
    }
  }

  process.stdout.write(input);

  if (recurring.length === 0) return;

  const byCategory = new Map();
  for (const { category, file } of recurring) {
    if (!byCategory.has(category)) byCategory.set(category, []);
    byCategory.get(category).push(file);
  }

  const lines = [
    "",
    "## Recurring Issues（前回から継続）",
    `前回レポートと比較して **${recurring.length}件** が未解決のまま残っています。`,
    "",
  ];

  for (const [category, files] of byCategory) {
    lines.push(`### ${category} (${files.length}件)`);
    for (const file of files) {
      lines.push(`- \`${file}\``);
    }
    lines.push("");
  }

  lines.push(
    "> 💡 3回以上繰り返し出現する問題は hook/linter への昇格を検討してください。",
  );

  process.stdout.write(lines.join("\n"));
}

main().catch(() => {});
