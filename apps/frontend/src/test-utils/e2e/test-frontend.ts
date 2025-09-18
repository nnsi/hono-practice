import { type ChildProcess, spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let viteProcess: ChildProcess | null = null;
let actualPort: number | null = null;

export async function startTestFrontend(
  port = 5173,
  apiPort = 3456,
): Promise<number> {
  // 既存のプロセスがあれば先に終了
  if (viteProcess) {
    await stopTestFrontend();
  }

  return new Promise((resolve, reject) => {
    const frontendDir = path.resolve(__dirname, "../..");

    console.log("Starting Vite dev server...");
    viteProcess = spawn(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "dev"], {
      cwd: frontendDir,
      env: {
        ...process.env,
        VITE_PORT: String(port),
        VITE_API_URL: `http://localhost:${apiPort}/`,
        VITE_E2E_TEST: "true",
        VITE_GOOGLE_OAUTH_CLIENT_ID: "test-client-id",
      },
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32",
      // プロセスグループを作成して、子プロセスも含めて終了できるようにする
      detached: process.platform !== "win32",
    });

    let started = false;

    viteProcess.stdout?.on("data", (data) => {
      const output = data.toString();
      console.log("Vite:", output);

      if (
        !started &&
        (output.includes("ready in") || output.includes("Local:"))
      ) {
        started = true;
        // Extract the actual port from the output
        const portMatch = output.match(/http:\/\/localhost:(\d+)/);
        actualPort = portMatch ? Number.parseInt(portMatch[1]) : port;
        console.log(`Vite actually started on port ${actualPort}`);
        // Give it a bit more time to fully start
        setTimeout(() => resolve(actualPort || port), 1000);
      }
    });

    viteProcess.stderr?.on("data", (data) => {
      console.error("Vite error:", data.toString());
    });

    viteProcess.on("error", (error) => {
      console.error("Failed to start Vite:", error);
      reject(error);
    });

    // Timeout if server doesn't start
    setTimeout(() => {
      if (!started) {
        reject(new Error("Vite server failed to start within timeout"));
      }
    }, 30000);
  });
}

export async function stopTestFrontend(): Promise<void> {
  if (viteProcess) {
    console.log("Stopping Vite dev server...");
    return new Promise<void>((resolve) => {
      const cleanup = () => {
        // ポートを使用しているプロセスを強制終了
        if (actualPort) {
          try {
            // Linuxでポートを使用しているプロセスを強制終了
            const killCommand =
              process.platform === "win32"
                ? `for /f "tokens=5" %a in ('netstat -aon ^| findstr :${actualPort}') do taskkill /PID %a /F`
                : `lsof -ti:${actualPort} | xargs -r kill -9 2>/dev/null || true`;

            require("node:child_process").execSync(killCommand, {
              stdio: "ignore",
            });
          } catch (e) {
            // エラーは無視
          }
        }

        viteProcess = null;
        actualPort = null;
        resolve();
      };

      if (viteProcess && !viteProcess.killed) {
        viteProcess.on("exit", cleanup);

        // プロセスグループ全体を終了（Unix系の場合）
        if (process.platform !== "win32" && viteProcess.pid) {
          try {
            process.kill(-viteProcess.pid, "SIGKILL");
          } catch (e) {
            // プロセスが既に終了している場合は無視
          }
        } else {
          viteProcess.kill("SIGKILL");
        }

        // タイムアウト後に強制終了
        setTimeout(() => {
          if (viteProcess && !viteProcess.killed) {
            viteProcess.kill("SIGKILL");
          }
          cleanup();
        }, 2000);
      } else {
        cleanup();
      }
    });
  }
}
