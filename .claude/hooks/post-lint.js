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
  const warnings = [];

  // 0. Project convention checks (file content inspection)
  try {
    const { readFileSync } = await import("node:fs");
    const content = readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    const isTestFile = /\.(test|spec)\.(ts|tsx)$/.test(filePath);
    const isFrontend = filePath.replace(/\\/g, "/").includes("/frontend/") ||
      filePath.replace(/\\/g, "/").includes("/mobile/");

    // 0a. interface → type (all files)
    const interfaceMatch = content.match(/^export\s+interface\s+(\w+)/m);
    if (interfaceMatch) {
      warnings.push(`⚠️ interface禁止: \`export interface ${interfaceMatch[1]}\` → \`export type ${interfaceMatch[1]} = { ... }\` に変更してください。`);
    }

    // 0b. File length > 200 lines (test files excluded)
    if (!isTestFile && lines.length > 200) {
      warnings.push(`⚠️ ${lines.length}行: 1ファイル200行以内を目標にしてください。分割を検討してください。変更前から超えていた場合でも、編集したタイミングで分割すること。`);
    }

    // 0c. confirm() / alert() in frontend (tsx files)
    if (isFrontend && /\.(tsx)$/.test(filePath)) {
      const confirmMatch = content.match(/\b(confirm|alert)\s*\(/);
      if (confirmMatch) {
        warnings.push(`⚠️ ${confirmMatch[1]}()禁止: インライン2段階確認UIを使ってください（frontend CLAUDE.md参照）。`);
      }
    }

    // 0d. vitest explicit import in test files (backend CLAUDE.md)
    if (isTestFile && !content.includes('from "vitest"')) {
      warnings.push('⚠️ vitest import不足: テストファイルでは `import { describe, expect, it } from "vitest"` を明示的に書いてください（backend CLAUDE.md参照）。');
    }
  } catch {
    // file read failure is non-fatal
  }

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

  const allWarnings = warnings.length > 0 ? warnings.join("\n") : "";
  const allDiagnostics = diagnostics
    ? enhanceDiagnostics(diagnostics.split("\n").slice(0, 30).join("\n"))
    : "";

  const combined = [allWarnings, allDiagnostics].filter(Boolean).join("\n\n");
  if (combined) {
    const output = {
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: combined,
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
    noParameterAssign:
      "FIX: パラメータを直接変更せず、新しい変数に代入する。`const updated = { ...param, field: newValue }` パターンを使う。",
    noPrototypeBuiltins:
      "FIX: `obj.hasOwnProperty(key)` → `Object.hasOwn(obj, key)` に変更する。",
    noShadowRestrictedNames:
      "FIX: ビルトイン名（`name`, `status`, `event` 等）と同名の変数を避ける。`userName`, `responseStatus` のようにプレフィックスを付ける。",
    noArrayIndexKey:
      "FIX: map()のインデックスをReactのkeyに使わない。ドメインIDを使う。例: `key={activity.id}`",
    useOptionalChain:
      "FIX: `a && a.b && a.b.c` → `a?.b?.c` に変更する。",
    noConsoleLog:
      "FIX: `console.log` を削除する。バックエンドのデバッグには `logger` を使う。",
    useIsNaN:
      "FIX: `x === NaN` は常にfalse。`Number.isNaN(x)` を使う。",
    noForEach:
      "FIX: `.forEach()` → `for...of` ループに変更する。早期returnが使えて可読性が上がる。",
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
