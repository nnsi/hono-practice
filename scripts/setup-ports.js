#!/usr/bin/env node

import { exec } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { promisify } from "util";

const execAsync = promisify(exec);

// デフォルトポート設定
const DEFAULT_PORTS = {
  API_PORT: 3456,
  VITE_PORT: 1357,
  EXPO_PORT: 8081,
};

// ポートが使用中かチェック
async function isPortInUse(port) {
  try {
    // Linux/Mac/WSL
    const { stdout } = await execAsync(
      `lsof -i :${port} -P -n | grep LISTEN || netstat -tuln | grep :${port} || ss -tuln | grep :${port}`
    );
    return stdout.trim().length > 0;
  } catch (error) {
    // コマンドが失敗した場合は使用されていないと判断
    return false;
  }
}

// 利用可能なポートを探す
async function findAvailablePort(basePort, maxTries = 20) {
  for (let i = 0; i < maxTries; i++) {
    const port = basePort + i;
    const inUse = await isPortInUse(port);
    if (!inUse) {
      return port;
    }
  }
  throw new Error(
    `Could not find available port starting from ${basePort} (tried ${maxTries} ports)`
  );
}

// .envファイルを読み込む
function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  const content = readFileSync(filePath, "utf8");
  const env = {};

  content.split("\n").forEach((line) => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith("#")) {
      const [key, ...valueParts] = trimmedLine.split("=");
      if (key) {
        env[key.trim()] = valueParts.join("=").trim();
      }
    }
  });

  return env;
}

// .envファイルを更新
function updateEnvFile(filePath, updates) {
  let content = "";
  const existingEnv = loadEnvFile(filePath);
  const allKeys = new Set([
    ...Object.keys(existingEnv),
    ...Object.keys(updates),
  ]);

  // 既存の値を保持しつつ、新しい値で更新
  const finalEnv = { ...existingEnv, ...updates };

  // 環境変数を整理された順序で出力
  const portKeys = ["API_PORT", "VITE_PORT", "VITE_API_PORT", "EXPO_PUBLIC_API_PORT"];
  const otherKeys = Array.from(allKeys).filter((key) => !portKeys.includes(key));

  // ポート設定を先に出力
  content += "# ポート設定\n";
  portKeys.forEach((key) => {
    if (key in finalEnv) {
      content += `${key}=${finalEnv[key]}\n`;
    }
  });

  // その他の設定を出力
  if (otherKeys.length > 0) {
    content += "\n# その他の設定\n";
    otherKeys.forEach((key) => {
      content += `${key}=${finalEnv[key]}\n`;
    });
  }

  writeFileSync(filePath, content);
}

// メイン処理
async function main() {
  console.log("🔍 利用可能なポートを検索中...\n");

  try {
    // 利用可能なポートを探す
    const apiPort = await findAvailablePort(DEFAULT_PORTS.API_PORT);
    const vitePort = await findAvailablePort(DEFAULT_PORTS.VITE_PORT);
    const expoPort = await findAvailablePort(DEFAULT_PORTS.EXPO_PORT);

    console.log("✅ 利用可能なポート:");
    console.log(`  - API Server: ${apiPort}`);
    console.log(`  - Frontend Dev Server: ${vitePort}`);
    console.log(`  - Mobile Dev Server: ${expoPort}`);
    console.log();

    // .env.exampleから必要な環境変数をコピー
    const exampleEnv = loadEnvFile(".env.example");

    // 1. ルートの.envを更新（データベーススクリプト用）
    const rootEnv = loadEnvFile(".env");
    const rootRequiredKeys = [
      "DATABASE_URL",
      "JWT_SECRET",
      "NODE_ENV",
    ];
    const rootEnvUpdates = {};
    rootRequiredKeys.forEach((key) => {
      if (!(key in rootEnv) && key in exampleEnv) {
        rootEnvUpdates[key] = exampleEnv[key];
      }
    });
    if (Object.keys(rootEnvUpdates).length > 0) {
      updateEnvFile(".env", rootEnvUpdates);
      console.log("✅ ルートの.envファイルを更新しました");
    }

    // 2. バックエンドの.envを更新
    const backendEnvPath = "apps/backend/.env";
    const backendEnv = loadEnvFile(backendEnvPath);
    const backendEnvUpdates = {
      API_PORT: apiPort.toString(),
      APP_URL: `http://localhost:${vitePort}`,
    };
    const backendRequiredKeys = [
      "DATABASE_URL",
      "JWT_SECRET",
      "NODE_ENV",
      "GOOGLE_OAUTH_CLIENT_ID",
    ];
    backendRequiredKeys.forEach((key) => {
      if (!(key in backendEnv) && key in exampleEnv) {
        backendEnvUpdates[key] = exampleEnv[key];
      }
    });
    updateEnvFile(backendEnvPath, backendEnvUpdates);
    console.log("✅ バックエンドの.envファイルを更新しました");

    // 3. フロントエンドの.envを更新
    const frontendEnvPath = "apps/frontend/.env";
    const frontendEnvUpdates = {
      VITE_PORT: vitePort.toString(),
      VITE_API_URL: `http://localhost:${apiPort}`,
      VITE_API_PORT: apiPort.toString(),
    };
    updateEnvFile(frontendEnvPath, frontendEnvUpdates);
    console.log("✅ フロントエンドの.envファイルを更新しました");

    // 4. モバイルの.envを更新
    const mobileEnvPath = "apps/mobile/.env";
    const mobileEnvUpdates = {
      EXPO_PUBLIC_API_PORT: apiPort.toString(),
    };
    updateEnvFile(mobileEnvPath, mobileEnvUpdates);
    console.log("✅ モバイルの.envファイルを更新しました");

    console.log();
    console.log("🚀 開発サーバーを起動するには:");
    console.log("  - Backend: npm run dev");
    console.log("  - Frontend: npm run client-dev");
    console.log("  - Mobile: npm run mobile-dev");
    console.log();
    console.log("📝 環境変数の設定を確認するには:");
    console.log("  - ルート: cat .env");
    console.log("  - Backend: cat apps/backend/.env");
    console.log("  - Frontend: cat apps/frontend/.env");
    console.log("  - Mobile: cat apps/mobile/.env");
  } catch (error) {
    console.error("❌ エラー:", error.message);
    process.exit(1);
  }
}

// スクリプト実行
main();