#!/usr/bin/env node
// DATABASE_URL への接続を migration 前に確認し、失敗理由を出力する。
// drizzle-kit migrate は接続失敗の種類を問わず無言で exit 1 するため、
// CI ログから原因を切り分けられるようにする。URL・パスワードは出力しない。
import { lookup } from "node:dns/promises";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

let host = "(unparsable)";
try {
  host = new URL(url).hostname;
} catch {}
const hostLabel = `${host.split(".")[0]}.…`;

const started = Date.now();
try {
  const addrs = await lookup(host, { all: true });
  console.log(
    `dns ok: ${hostLabel} -> ${addrs.length} address(es) (${Date.now() - started}ms)`,
  );
} catch (e) {
  console.error(`dns failed: ${hostLabel}: ${e.code ?? ""} ${e.message}`);
  process.exit(1);
}

const sql = postgres(url, { max: 1, connect_timeout: 30, fetch_types: false });
try {
  const [row] = await sql`select current_database() as db, version() as v`;
  console.log(
    `db ok: database=${row.db} (${Date.now() - started}ms) ${String(row.v).split(" on ")[0]}`,
  );
} catch (e) {
  const msg = String(e?.message ?? e).replace(/password=\S+/gi, "password=***");
  console.error(
    `db connect failed after ${Date.now() - started}ms: code=${e?.code ?? "?"} ${msg}`,
  );
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
