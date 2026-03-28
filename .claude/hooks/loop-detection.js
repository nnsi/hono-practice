#!/usr/bin/env node
/**
 * PostToolUse Hook: 同一ファイルの繰り返し編集を検出してループ警告を出す
 *
 * - セッション（ppid）ごとにtmpファイルで編集回数を追跡
 * - 5回以上でアプローチ見直し警告、8回以上でエスカレーション
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const WARN_THRESHOLD = 5;
const ESCALATE_THRESHOLD = 8;
const MAX_AGE_MS = 12 * 60 * 60 * 1000;

async function main() {
  let input = "";
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  let parsed;
  try {
    parsed = JSON.parse(input);
  } catch {
    return;
  }

  const filePath = parsed.tool_input?.file_path || "";
  if (!filePath) return;

  const normalized = filePath.replace(/\\/g, "/");

  // .claude/ や docs/diary/ 内のファイルはカウントしない
  if (/(?:^|\/)\.claude\//.test(normalized)) return;
  if (/(?:^|\/)docs\/diary\//.test(normalized)) return;

  const stateFile = join(tmpdir(), `claude-loop-${process.ppid}.json`);

  let state = { createdAt: Date.now(), edits: {} };
  if (existsSync(stateFile)) {
    try {
      const raw = readFileSync(stateFile, "utf-8");
      const loaded = JSON.parse(raw);
      if (Date.now() - loaded.createdAt > MAX_AGE_MS) {
        state = { createdAt: Date.now(), edits: {} };
      } else {
        state = loaded;
      }
    } catch {
      state = { createdAt: Date.now(), edits: {} };
    }
  }

  state.edits[normalized] = (state.edits[normalized] || 0) + 1;
  const count = state.edits[normalized];

  writeFileSync(stateFile, JSON.stringify(state), "utf-8");

  if (count >= ESCALATE_THRESHOLD) {
    const msg = `🚨 ${filePath} を${count}回編集しました。一旦手を止めて、ユーザーに状況を報告してください。`;
    process.stdout.write(
      JSON.stringify({ hookSpecificOutput: { additionalContext: msg } }),
    );
  } else if (count >= WARN_THRESHOLD) {
    const msg = [
      `⚠️ ループ検出: ${filePath} をこのセッションで${count}回編集しています。アプローチを見直してください:`,
      "- 型エラーループ → tscの出力を全て読んでから一括修正",
      "- lint修正ループ → biomeの全エラーを確認してから修正",
      "- テスト失敗ループ → テストの期待値が旧実装を前提にしていないか確認",
    ].join("\n");
    process.stdout.write(
      JSON.stringify({ hookSpecificOutput: { additionalContext: msg } }),
    );
  }
}

main().catch(() => {});
