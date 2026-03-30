#!/usr/bin/env node

/**
 * Claude Code 会話ログ → Markdown 変換スクリプト
 *
 * Usage:
 *   node cc-log-to-md.js <jsonl-file>                  # 単一ファイル変換（stdout）
 *   node cc-log-to-md.js <jsonl-file> -o output.md     # 単一ファイル変換（ファイル出力）
 *   node cc-log-to-md.js --list                        # セッション一覧を表示
 *   node cc-log-to-md.js --latest                      # 最新セッションを変換
 *   node cc-log-to-md.js --batch --since 2026-02-01    # 期間指定で一括変換
 *   node cc-log-to-md.js --batch --since 2026-02-01 --outdir ./logs
 */

import {
  readFileSync,
  readdirSync,
  writeFileSync,
  statSync,
  mkdirSync,
  existsSync,
} from "fs";
import { join, resolve } from "path";
import { homedir } from "os";

// ─── 引数パース ───
const args = process.argv.slice(2);
let inputFile = null;
let outputFile = null;
let listMode = false;
let latestMode = false;
let batchMode = false;
let sinceDate = null;
let outdir = null;

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case "-o":
    case "--output":
      outputFile = args[++i];
      break;
    case "--list":
      listMode = true;
      break;
    case "--latest":
      latestMode = true;
      break;
    case "--batch":
      batchMode = true;
      break;
    case "--since":
      sinceDate = args[++i];
      break;
    case "--outdir":
      outdir = args[++i];
      break;
    case "-h":
    case "--help":
      console.log(`Usage:
  node cc-log-to-md.js <jsonl-file>                  単一ファイル変換（stdout）
  node cc-log-to-md.js <jsonl-file> -o out.md        単一ファイル変換（ファイル出力）
  node cc-log-to-md.js --list                        全プロジェクトのセッション一覧
  node cc-log-to-md.js --latest                      最新セッションを変換
  node cc-log-to-md.js --batch --since 2026-02-01    期間指定で一括変換
  node cc-log-to-md.js --batch --since 2026-02-01 --outdir ./logs`);
      process.exit(0);
    default:
      inputFile = args[i];
  }
}

// ─── セッション検索ヘルパー ───
function getProjectsDir() {
  return join(homedir(), ".claude", "projects");
}

function getAllSessions(since) {
  const projectsDir = getProjectsDir();
  const sessions = [];
  const cutoff = since ? new Date(since) : null;
  let dirs;
  try {
    dirs = readdirSync(projectsDir);
  } catch {
    console.error("Error: ~/.claude/projects が見つかりません");
    process.exit(1);
  }
  for (const dir of dirs) {
    const dirPath = join(projectsDir, dir);
    try {
      if (!statSync(dirPath).isDirectory()) continue;
    } catch {
      continue;
    }
    let files;
    try {
      files = readdirSync(dirPath).filter((f) => f.endsWith(".jsonl"));
    } catch {
      continue;
    }
    for (const file of files) {
      const filePath = join(dirPath, file);
      try {
        const stat = statSync(filePath);
        if (cutoff && stat.mtime < cutoff) continue;
        // JSONL の最初のユーザーメッセージを取得してプレビュー
        const raw = readFileSync(filePath, "utf8");
        const firstUserLine = raw.split("\n").find((line) => {
          if (!line.trim()) return false;
          try {
            const obj = JSON.parse(line);
            if (
              obj.type !== "user" ||
              obj.message?.role !== "user" ||
              typeof obj.message?.content !== "string"
            )
              return false;
            const c = obj.message.content.trim();
            // コマンドもユーザー発言として扱う
            if (/<command-name>/.test(c)) return true;
            return !/^<[a-zA-Z][\w-]*[> /]/.test(c);
          } catch {
            return false;
          }
        });
        let preview = "(empty)";
        if (firstUserLine) {
          const obj = JSON.parse(firstUserLine);
          const c = obj.message.content.trim();
          const cmdMatch = c.match(/<command-name>(.*?)<\/command-name>/);
          if (cmdMatch) {
            const argsMatch = c.match(/<command-args>(.*?)<\/command-args>/s);
            const cmdArgs = argsMatch ? argsMatch[1].trim() : "";
            preview = cmdArgs
              ? `${cmdMatch[1]} ${cmdArgs}`.substring(0, 60)
              : cmdMatch[1];
          } else {
            preview = c.substring(0, 60);
            if (c.length > 60) preview += "...";
          }
        }
        sessions.push({
          project: dir,
          file,
          path: filePath,
          mtime: stat.mtime,
          preview,
        });
      } catch {
        continue;
      }
    }
  }
  sessions.sort((a, b) => b.mtime - a.mtime);
  return sessions;
}

// ─── システムタグ除去 ───
function stripSystemTags(text) {
  return text
    .replace(
      /<(system-reminder|local-command-caveat|new-diagnostics|antml:[a-z_]+)[\s>][\s\S]*?<\/\1>/g,
      ""
    )
    .replace(
      /<(system-reminder|local-command-caveat|new-diagnostics)\s*\/>/g,
      ""
    )
    .trim();
}

// ─── JSONL → Markdown 変換関数 ───
function convertJsonlToMarkdown(filePath) {
  const raw = readFileSync(filePath, "utf8");
  const lines = raw.split("\n").filter((l) => l.trim());

  // セッション情報を取得
  let sessionInfo = null;
  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      if (obj.type === "user" && obj.sessionId) {
        sessionInfo = {
          sessionId: obj.sessionId,
          version: obj.version,
          cwd: obj.cwd,
          gitBranch: obj.gitBranch,
          timestamp: obj.timestamp,
        };
        break;
      }
    } catch {
      /* skip */
    }
  }

  const md = [];

  // ヘッダー
  md.push("# Claude Code 会話ログ\n");
  if (sessionInfo) {
    const date = new Date(sessionInfo.timestamp).toLocaleString("ja-JP");
    md.push(`- **日時**: ${date}`);
    if (sessionInfo.cwd)
      md.push(`- **ディレクトリ**: \`${sessionInfo.cwd}\``);
    if (sessionInfo.gitBranch)
      md.push(`- **ブランチ**: \`${sessionInfo.gitBranch}\``);
    if (sessionInfo.version)
      md.push(`- **Claude Code**: v${sessionInfo.version}`);
    md.push("");
    md.push("---\n");
  }

  // メッセージの処理（同じmessage.idのテキストを重複排除）
  const processedMessageIds = new Set();

  for (const line of lines) {
    let obj;
    try {
      obj = JSON.parse(line);
    } catch {
      continue;
    }

    // user メッセージ（テキストのみ、tool_resultは除外）
    if (
      obj.type === "user" &&
      obj.message?.role === "user" &&
      typeof obj.message?.content === "string"
    ) {
      const text = obj.message.content.trim();

      // コマンド（/commit 等）を検出して記録
      const cmdMatch = text.match(/<command-name>(.*?)<\/command-name>/);
      if (cmdMatch) {
        const cmdName = cmdMatch[1];
        const argsMatch = text.match(/<command-args>(.*?)<\/command-args>/s);
        const cmdArgs = argsMatch ? argsMatch[1].trim() : "";
        const display = cmdArgs ? `${cmdName} ${cmdArgs}` : cmdName;
        md.push(`## User\n`);
        md.push(`\`${display}\``);
        md.push("");
        continue;
      }

      // XMLタグで始まるシステム発言はスキップ
      if (/^<[a-zA-Z][\w-]*[> /]/.test(text)) continue;

      md.push(`## User\n`);
      md.push(text);
      md.push("");
      continue;
    }

    // assistant メッセージ（text ブロックのみ抽出）
    if (obj.type === "assistant" && obj.message?.role === "assistant") {
      const msgId = obj.message?.id;
      const content = obj.message?.content;
      if (!Array.isArray(content)) continue;

      const textBlocks = content
        .filter((b) => b.type === "text")
        .map((b) => stripSystemTags(b.text))
        .filter((t) => t.trim());

      if (textBlocks.length === 0) continue;
      const text = textBlocks.join("\n");
      if (!text.trim()) continue;

      // 同じ message.id のテキストは重複排除
      if (msgId) {
        const key = `${msgId}:${text}`;
        if (processedMessageIds.has(key)) continue;
        processedMessageIds.add(key);
      }

      md.push(`## Assistant\n`);
      md.push(text);
      md.push("");
    }
  }

  return { markdown: md.join("\n"), sessionInfo };
}

// ─── --list モード ───
if (listMode) {
  const sessions = getAllSessions(sinceDate);
  if (sessions.length === 0) {
    console.log("セッションが見つかりません。");
    process.exit(0);
  }
  console.log(`セッション一覧 (新しい順): ${sessions.length}件\n`);
  for (const s of sessions.slice(0, 50)) {
    const date = s.mtime.toLocaleString("ja-JP");
    const proj = s.project.replace(/^[A-Z]--/, "").replaceAll("-", "/");
    console.log(`  ${date}  ${proj}`);
    console.log(`    ${s.preview}`);
    console.log(`    ${s.path}\n`);
  }
  if (sessions.length > 50) {
    console.log(`  ... 他 ${sessions.length - 50} 件`);
  }
  process.exit(0);
}

// ─── --batch モード ───
if (batchMode) {
  const sessions = getAllSessions(sinceDate);
  if (sessions.length === 0) {
    console.error("対象セッションが見つかりません。");
    process.exit(1);
  }

  const outputDir = resolve(outdir || "./cc-logs");
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  console.error(`対象: ${sessions.length} セッション`);
  console.error(`出力先: ${outputDir}\n`);

  let count = 0;
  let skipped = 0;

  for (const s of sessions) {
    try {
      const { markdown } = convertJsonlToMarkdown(s.path);

      // 会話が空（ヘッダーだけ）ならスキップ
      if (!markdown.includes("## User")) {
        skipped++;
        continue;
      }

      // プロジェクト名をディレクトリ名に
      const projName = s.project.replace(/^[A-Z]--/, "");
      const projDir = join(outputDir, projName);
      if (!existsSync(projDir)) {
        mkdirSync(projDir, { recursive: true });
      }

      // ファイル名: YYYY-MM-DD_HHmm_セッションID先頭8文字.md
      const date = s.mtime.toISOString().slice(0, 10);
      const time = s.mtime.toISOString().slice(11, 16).replace(":", "");
      const shortId = s.file.replace(".jsonl", "").slice(0, 8);
      const outPath = join(projDir, `${date}_${time}_${shortId}.md`);

      writeFileSync(outPath, markdown, "utf8");
      count++;

      if (count % 20 === 0) {
        console.error(`  ${count} / ${sessions.length} 処理済み...`);
      }
    } catch (err) {
      console.error(`  エラー: ${s.path} - ${err.message}`);
      skipped++;
    }
  }

  console.error(`\n完了: ${count} 件変換, ${skipped} 件スキップ`);
  console.error(`出力先: ${outputDir}`);
  process.exit(0);
}

// ─── --latest モード ───
if (latestMode) {
  const sessions = getAllSessions();
  if (sessions.length === 0) {
    console.error("セッションが見つかりません。");
    process.exit(1);
  }
  inputFile = sessions[0].path;
  console.error(`最新セッション: ${inputFile}`);
}

// ─── 単一ファイル変換 ───
if (!inputFile) {
  console.error(
    "Usage: node cc-log-to-md.js <jsonl-file> [-o output.md]\n       node cc-log-to-md.js --list\n       node cc-log-to-md.js --latest [-o output.md]\n       node cc-log-to-md.js --batch --since YYYY-MM-DD [--outdir ./logs]"
  );
  process.exit(1);
}

const { markdown } = convertJsonlToMarkdown(resolve(inputFile));

if (outputFile) {
  writeFileSync(resolve(outputFile), markdown, "utf8");
  console.error(`保存しました: ${outputFile}`);
} else {
  console.log(markdown);
}
