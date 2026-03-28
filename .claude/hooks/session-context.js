#!/usr/bin/env node
/**
 * SessionStart Hook: 前セッションのcompactログが残っていれば存在を通知する。
 * ファイルが無ければ何も出力しない（ノイズゼロ）。
 */
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.env.CLAUDE_PROJECT_DIR || ".", "docs/diary-cc-logs");

if (existsSync(dir)) {
  const files = readdirSync(dir).filter((f) => f.endsWith(".md")).sort();
  if (files.length > 0) {
    const msg = [
      `前セッションのcompactログが ${files.length} 件あります: docs/diary-cc-logs/`,
      `最新: ${files[files.length - 1]}`,
      "必要に応じて読んでください。日記を書く際にはこれらを参照してください。",
    ].join("\n");
    process.stdout.write(
      JSON.stringify({ hookSpecificOutput: { additionalContext: msg } }),
    );
  }
}
