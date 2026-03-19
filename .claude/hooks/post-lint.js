#!/usr/bin/env node
/**
 * PostToolUse Hook: Write/Edit/MultiEdit 後に biome lint+format を自動実行
 *
 * - 対象: *.ts, *.tsx ファイルのみ
 * - 処理: format --write → lint --fix → 残エラーを additionalContext として返却
 * - Windows/macOS/Linux 対応（Node script）
 */
import { execSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

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

  const filePath =
    parsed.tool_input?.file_path || parsed.tool_input?.path || "";

  if (!filePath) return;
  if (!/\.(ts|tsx)$/.test(filePath)) return;

  const projectDir = process.env.CLAUDE_PROJECT_DIR || resolve(__dirname, "../..");
  const biome = join(projectDir, "node_modules", ".bin", "biome");

  // 1. Auto-format
  try {
    execSync(`"${biome}" format --write "${filePath}"`, {
      stdio: "ignore",
      cwd: projectDir,
    });
  } catch {
    // format failure is non-fatal
  }

  // 2. Auto-fix lint
  try {
    execSync(`"${biome}" lint --fix "${filePath}"`, {
      stdio: "ignore",
      cwd: projectDir,
    });
  } catch {
    // lint --fix failure is non-fatal
  }

  // 3. Check remaining errors
  let diagnostics = "";
  try {
    execSync(`"${biome}" lint "${filePath}"`, {
      stdio: "pipe",
      cwd: projectDir,
    });
  } catch (e) {
    if (e.stdout) {
      diagnostics = e.stdout.toString().trim();
    }
    if (!diagnostics && e.stderr) {
      diagnostics = e.stderr.toString().trim();
    }
  }

  if (diagnostics) {
    const lines = diagnostics.split("\n").slice(0, 30);
    const enhanced = enhanceDiagnostics(lines.join("\n"));
    const output = {
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: enhanced,
      },
    };
    process.stdout.write(JSON.stringify(output));
  }
}

/**
 * Lintエラーに修正ヒントを付加する。
 * 記事の「エラーメッセージに修正手順を埋め込む」パターン。
 */
function enhanceDiagnostics(raw) {
  const hints = {
    noExplicitAny: [
      "FIX: `any` の代わりに具体的な型、`unknown`+型ガード、または `Record<string, unknown>` を使う。",
      "React hooks DI型など意図的な場合は `// biome-ignore lint/suspicious/noExplicitAny: 理由` で抑制。",
    ].join(" "),
    noNonNullAssertion:
      "FIX: `!` の代わりに optional chaining `?.` またはnullチェックを使う。",
    useImportType:
      "FIX: 型のみのimportは `import type { ... }` に変更する。",
    noUnusedImports:
      "FIX: 未使用のimportを削除する。型として使うなら `import type` にする。",
    organizeImports:
      "FIX: import順序が規約と異なる。auto-fixで解決済みのはずだが残っている場合は手動で並べ替える。",
    "noRestrictedImports|noCrossLayerImport":
      "FIX: レイヤー違反。ADR 20241201_clean-architecture 参照。route→handler→usecase→repository の依存方向を守る。",
  };

  let result = raw;
  for (const [rule, hint] of Object.entries(hints)) {
    if (result.includes(rule)) {
      result += `\n\n💡 ${rule}: ${hint}`;
    }
  }
  return result;
}

main().catch(() => {});
