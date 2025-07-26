import { type ChildProcess, spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let viteProcess: ChildProcess | null = null;

export async function startTestFrontend(
  port = 5173,
  apiPort = 3456,
): Promise<number> {
  return new Promise((resolve, reject) => {
    const frontendDir = path.resolve(__dirname, "../..");

    console.log("Starting Vite dev server...");
    viteProcess = spawn("npm", ["run", "dev"], {
      cwd: frontendDir,
      env: {
        ...process.env,
        VITE_PORT: String(port),
        VITE_API_URL: `http://localhost:${apiPort}`,
      },
      stdio: ["ignore", "pipe", "pipe"],
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
        const actualPort = portMatch ? Number.parseInt(portMatch[1]) : port;
        console.log(`Vite actually started on port ${actualPort}`);
        // Give it a bit more time to fully start
        setTimeout(() => resolve(actualPort), 1000);
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
    viteProcess.kill("SIGTERM");
    viteProcess = null;
    // Give it time to shut down
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
