#!/usr/bin/env node
/**
 * 指定時刻まで待機するスクリプト
 *
 * Usage: node scripts/wait-until.js HH:MM
 *
 * Claude Codeセッション内で「00:15に作業開始して」のように使う:
 *   1. node scripts/wait-until.js 00:15
 *   2. (時刻まで待機)
 *   3. 待機完了後、Claude Codeが後続の作業を開始
 */

const timeStr = process.argv[2];

if (!timeStr || !/^\d{1,2}:\d{2}$/.test(timeStr)) {
  console.error("Usage: node scripts/wait-until.js HH:MM");
  process.exit(1);
}

const [h, m] = timeStr.split(":").map(Number);
const now = new Date();
const target = new Date(now);
target.setHours(h, m, 0, 0);

if (target <= now) {
  target.setDate(target.getDate() + 1);
}

const delay = target.getTime() - now.getTime();
const mins = Math.round(delay / 60000);

console.log(`Waiting until ${timeStr} (${mins}min)...`);

const interval = setInterval(() => {
  const remaining = target.getTime() - Date.now();
  if (remaining <= 0) return;
  const rm = Math.round(remaining / 60000);
  console.log(`  ${rm}min remaining`);
}, 300000); // 5分ごとに残り表示

setTimeout(() => {
  clearInterval(interval);
  console.log(`Ready. ${new Date().toLocaleTimeString()}`);
}, delay);
