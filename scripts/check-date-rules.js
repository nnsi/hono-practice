#!/usr/bin/env node
/**
 * Date string production guard (repo-wide)
 *
 * Date オブジェクトから「YYYY-MM-DD 日付文字列」を直接作るパターンを禁止する。
 * これらのパターンはタイムゾーンに依存して挙動が変わり、過去に bug を引き起こした:
 *   - 3/15 doneDate UTC bug: `new Date().toISOString().split("T")[0]` が UTC 日付を返し、
 *     JST 00:10 のタスク完了が前日扱いになった
 *   - 3/30 timezone refactor: `toLocaleDateString("ja-JP")` ハードコードを除去
 *
 * 代替: `dayjs(...).format("YYYY-MM-DD")` または `packages/frontend-shared/utils/dateUtils` の `getToday()` 等
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();

const DISALLOWED_PATTERNS = [
  {
    name: "toISOString().split(\"T\")",
    regex: /\.toISOString\(\)\s*\.\s*split\s*\(\s*["']T["']/,
    message:
      'UTC 日付になります。`dayjs(...).format("YYYY-MM-DD")` を使ってください。',
  },
  {
    name: "toISOString().slice(0, 10)",
    regex: /\.toISOString\(\)\s*\.\s*slice\s*\(\s*0\s*,\s*10\s*\)/,
    message:
      'UTC 日付になります。`dayjs(...).format("YYYY-MM-DD")` を使ってください。',
  },
  {
    name: "toLocaleDateString(",
    regex: /\.toLocaleDateString\s*\(/,
    message:
      'タイムゾーン・ロケールに依存し、フォーマット不安定です。`dayjs(...).format("YYYY-MM-DD")` を使ってください。',
  },
  {
    name: "toDateString()",
    regex: /\.toDateString\s*\(\s*\)/,
    message:
      '"Mon Jan 01 2024" のような不安定フォーマットです。`dayjs(...).format(...)` を使ってください。',
  },
];

const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  ".worktrees",
  ".claude",
  "db-data",
  "dist-frontend",
  "ios",
  "android",
  ".expo",
  "build",
  // 開発ツール（seed / log整理 / レポート）は UTC 日付でも実害なし
  "scripts",
  "e2e",
]);

const SKIP_FILES = [
  // この guard スクリプト自身
  /scripts[\\/]check-date-rules\.js$/,
  // 過去 bug を文書化している ADR・regression test（パターン文字列を含むのが意図的）
  /docs[\\/]adr[\\/].*\.md$/,
  /[\\/]regression\.property\.test\.ts$/,
  // ルール文書
  /\.claude[\\/]rules[\\/].*\.md$/,
];

function walk(dir) {
  const entries = readdirSync(dir);
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      if (SKIP_DIRS.has(entry)) continue;
      files.push(...walk(fullPath));
      continue;
    }
    if (!/\.(ts|tsx|js|mjs)$/.test(entry)) continue;
    files.push(fullPath);
  }
  return files;
}

const violations = [];

for (const filePath of walk(ROOT)) {
  if (SKIP_FILES.some((re) => re.test(filePath))) continue;

  const lines = readFileSync(filePath, "utf8").split("\n");
  const relPath = relative(ROOT, filePath).replace(/\\/g, "/");
  lines.forEach((line, index) => {
    // 行コメント・ブロックコメント開始は無視
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;

    for (const pattern of DISALLOWED_PATTERNS) {
      if (!pattern.regex.test(line)) continue;
      // インラインコメント前のコードのみ確認
      const codeBeforeComment = line.split("//")[0];
      if (!pattern.regex.test(codeBeforeComment)) continue;
      violations.push({
        file: relPath,
        line: index + 1,
        pattern: pattern.name,
        message: pattern.message,
      });
    }
  });
}

if (violations.length > 0) {
  console.error("Date string production rule violations detected:");
  for (const v of violations) {
    console.error(`- ${v.file}:${v.line} \`${v.pattern}\` — ${v.message}`);
  }
  process.exit(1);
}
