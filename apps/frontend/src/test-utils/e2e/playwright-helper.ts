import fs from "node:fs";
import path from "node:path";

/**
 * Chromiumバイナリのパスを検索して返す。
 * Playwright内蔵のブラウザインストールが利用できない環境（CC on the webなど）で
 * システムにインストール済みのChromiumを使うためのヘルパー。
 */
export function findChromiumExecutablePath(): string | undefined {
  // ms-playwright キャッシュディレクトリから最新のChromiumを探す
  const cacheDir = path.join(
    process.env.HOME || "/root",
    ".cache",
    "ms-playwright",
  );

  if (fs.existsSync(cacheDir)) {
    const entries = fs.readdirSync(cacheDir).sort().reverse();
    for (const entry of entries) {
      if (entry.startsWith("chromium-")) {
        const chromePath = path.join(
          cacheDir,
          entry,
          "chrome-linux",
          "chrome",
        );
        if (fs.existsSync(chromePath)) {
          return chromePath;
        }
      }
    }
  }

  return undefined;
}
