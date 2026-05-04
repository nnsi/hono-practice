#!/usr/bin/env node
/**
 * check-migrations.js
 *
 * `infra/drizzle/migrations/meta/_journal.json` のエントリ数と、
 * DB の `__drizzle_migrations` テーブルの行数を比較し、未適用がある場合は
 * 警告して exit 1 する。
 *
 * `apps/backend/.env` の `DATABASE_URL` を読む。
 *
 * Usage:
 *   node scripts/check-migrations.js
 *   node scripts/check-migrations.js --warn   # exit 0 (warn only)
 *
 * DB 接続失敗時 / .env が無い等は warn して exit 0（dev サーバー起動を妨げない）。
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const JOURNAL_PATH = join(
  REPO_ROOT,
  "infra/drizzle/migrations/meta/_journal.json",
);
const ENV_PATH = join(REPO_ROOT, "apps/backend/.env");

const args = process.argv.slice(2);
const warnOnly = args.includes("--warn");

function parseEnvFile(path) {
  try {
    const text = readFileSync(path, "utf8");
    const out = {};
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      out[key] = value;
    }
    return out;
  } catch {
    return {};
  }
}

async function main() {
  const journal = JSON.parse(readFileSync(JOURNAL_PATH, "utf8"));
  const journalCount = journal.entries.length;
  const latestTag = journal.entries[journalCount - 1]?.tag ?? "(none)";

  const env = { ...parseEnvFile(ENV_PATH), ...process.env };
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn(
      `[check-migrations] DATABASE_URL not found in ${ENV_PATH}. Skipping check.`,
    );
    return;
  }

  let postgres;
  try {
    ({ default: postgres } = await import("postgres"));
  } catch {
    console.warn("[check-migrations] postgres package not available. Skipping.");
    return;
  }

  const sql = postgres(databaseUrl, { max: 1, idle_timeout: 2 });
  let dbCount;
  try {
    const rows = await sql`SELECT count(*)::int AS c FROM public.__drizzle_migrations`;
    dbCount = rows[0]?.c ?? 0;
  } catch (err) {
    console.warn(
      `[check-migrations] DB query failed (${err.message ?? err}). Skipping.`,
    );
    await sql.end({ timeout: 2 });
    return;
  }
  await sql.end({ timeout: 2 });

  if (dbCount === journalCount) {
    return;
  }

  const pending = journal.entries
    .slice(dbCount)
    .map((e) => e.tag)
    .join(", ");
  const message = [
    "",
    "⚠️  未適用の DB マイグレーションがあります",
    `   journal: ${journalCount} entries (latest: ${latestTag})`,
    `   DB:      ${dbCount} applied`,
    `   pending: ${pending}`,
    "",
    "   実行: pnpm db-migrate",
    "",
  ].join("\n");
  console.error(message);
  if (!warnOnly) process.exit(1);
}

main().catch((err) => {
  console.warn(`[check-migrations] unexpected error: ${err.message ?? err}`);
});
