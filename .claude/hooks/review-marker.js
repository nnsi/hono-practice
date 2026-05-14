#!/usr/bin/env node
/**
 * PostToolUse Hook: reviewer agent / Codex review が起動された時刻を記録する。
 *
 * loop-detection.js はこのマーカーを読み、最近 review が走っていたら
 * 同一ファイルの繰り返し編集を「意図的な review-cycle 反復」とみなして
 * ループ警告をスキップする。
 *
 * 対象:
 * - Agent tool with subagent_type matching /^reviewer-/ or "Plan"
 * - Bash tool with command containing "codex exec" (review 用途想定)
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

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

  const tool = parsed.tool_name;
  const inp = parsed.tool_input || {};

  let isReview = false;
  if (tool === "Agent" || tool === "Task") {
    const subagent = inp.subagent_type || "";
    if (/^reviewer-/.test(subagent)) isReview = true;
  } else if (tool === "Bash") {
    const cmd = inp.command || "";
    if (/\bcodex\s+exec\b/.test(cmd)) isReview = true;
  }

  if (!isReview) return;

  const marker = join(tmpdir(), `claude-review-active-${process.ppid}`);
  writeFileSync(marker, String(Date.now()), "utf-8");
}

main().catch(() => {});
