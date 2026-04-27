#!/usr/bin/env node
/**
 * check-baseline.js
 *
 * master ブランチの最新 CI 結果を取得し、JSON で出力する。
 * PR 着手前に「master が緑か赤か」を機械的に確認するためのスクリプト。
 *
 * Usage:
 *   node scripts/check-baseline.js
 *   node scripts/check-baseline.js --out .github/baseline-status.json
 *
 * gh 未インストール / API 失敗時は overallStatus: "unknown" で exit 0。
 */

import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";

// --- 引数処理 ---
const args = process.argv.slice(2);
const outIndex = args.indexOf("--out");
const outPath = outIndex !== -1 ? args[outIndex + 1] : null;

// --- gh CLI ヘルパー ---
function ghExec(cmd) {
  return execSync(cmd, { encoding: "utf8" }).trim();
}

function tryGhExec(cmd) {
  try {
    return { ok: true, output: ghExec(cmd) };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// --- メイン ---
async function main() {
  const checkedAt = new Date().toISOString();

  // gh CLI の存在確認
  const ghCheck = tryGhExec("gh --version");
  if (!ghCheck.ok) {
    warn("gh CLI が見つかりません。baseline チェックをスキップします。");
    return output({ checkedAt, masterSha: null, runs: [], overallStatus: "unknown", ngWorkflows: [] });
  }

  // リポジトリ情報取得（ハードコードしない）
  const repoCheck = tryGhExec("gh repo view --json owner,name");
  if (!repoCheck.ok) {
    warn(`gh repo view に失敗しました: ${repoCheck.error}`);
    return output({ checkedAt, masterSha: null, runs: [], overallStatus: "unknown", ngWorkflows: [] });
  }

  let owner, repo;
  try {
    const repoInfo = JSON.parse(repoCheck.output);
    owner = repoInfo.owner.login;
    repo = repoInfo.name;
  } catch (e) {
    warn(`リポジトリ情報のパースに失敗しました: ${e.message}`);
    return output({ checkedAt, masterSha: null, runs: [], overallStatus: "unknown", ngWorkflows: [] });
  }

  // master の最新 workflow runs 取得
  const runsCheck = tryGhExec(
    `gh api "repos/${owner}/${repo}/actions/runs?branch=master&status=completed&per_page=20"`
  );
  if (!runsCheck.ok) {
    warn(`workflow runs の取得に失敗しました: ${runsCheck.error}`);
    return output({ checkedAt, masterSha: null, runs: [], overallStatus: "unknown", ngWorkflows: [] });
  }

  let allRuns;
  try {
    allRuns = JSON.parse(runsCheck.output).workflow_runs ?? [];
  } catch (e) {
    warn(`workflow runs のパースに失敗しました: ${e.message}`);
    return output({ checkedAt, masterSha: null, runs: [], overallStatus: "unknown", ngWorkflows: [] });
  }

  // workflow ごとに最新1件を集約（createdAt 降順で先頭）
  const byWorkflow = new Map();
  for (const run of allRuns) {
    const name = run.name ?? run.workflow_id?.toString() ?? "unknown";
    if (!byWorkflow.has(name)) {
      byWorkflow.set(name, run);
    } else {
      const existing = byWorkflow.get(name);
      if (run.created_at > existing.created_at) {
        byWorkflow.set(name, run);
      }
    }
  }

  const runs = [];
  for (const [workflowName, run] of byWorkflow) {
    runs.push({
      workflowName,
      conclusion: run.conclusion ?? "unknown",
      url: run.html_url ?? "",
      completedAt: run.updated_at ?? run.created_at ?? "",
    });
  }

  // master の HEAD SHA（最初のランから取得）
  const masterSha = allRuns[0]?.head_sha?.slice(0, 7) ?? null;

  // overallStatus 判定
  const ngWorkflows = runs
    .filter((r) => r.conclusion !== "success" && r.conclusion !== "skipped")
    .map((r) => r.workflowName);

  const overallStatus =
    runs.length === 0
      ? "unknown"
      : ngWorkflows.length > 0
        ? "ng"
        : "ok";

  return output({ checkedAt, masterSha, runs, overallStatus, ngWorkflows });
}

function warn(msg) {
  process.stderr.write(`[check-baseline] WARNING: ${msg}\n`);
}

function output(result) {
  const json = JSON.stringify(result, null, 2);

  if (outPath) {
    const dir = dirname(outPath);
    mkdirSync(dir, { recursive: true });
    writeFileSync(outPath, json, "utf8");
    process.stderr.write(`[check-baseline] 出力先: ${outPath}\n`);
  }

  // stdout には常に出力
  process.stdout.write(json + "\n");
}

main().catch((err) => {
  warn(`予期しないエラー: ${err.message}`);
  const fallback = {
    checkedAt: new Date().toISOString(),
    masterSha: null,
    runs: [],
    overallStatus: "unknown",
    ngWorkflows: [],
  };
  output(fallback);
  // PR を詰まらせないため exit 0
  process.exit(0);
});
