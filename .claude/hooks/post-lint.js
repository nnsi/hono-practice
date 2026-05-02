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
  // Hoisted for use both inside the convention-check try block and in the
  // output-building section below.
  let testIdNewViolations = false;
  let testIdWarnings = [];

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

    // 0e. Date string production patterns (3/15 UTC bug 再発防止)
    // 過去 bug 文書化箇所・regression test は除外
    const isDateExempt =
      /[\\/]regression\.property\.test\.ts$/.test(filePath) ||
      /[\\/]scripts[\\/]/.test(filePath) ||
      /[\\/]e2e[\\/]/.test(filePath);
    if (!isDateExempt) {
      const datePatterns = [
        {
          re: /\.toISOString\(\)\s*\.\s*split\s*\(\s*["']T["']/,
          name: 'toISOString().split("T")',
        },
        {
          re: /\.toISOString\(\)\s*\.\s*slice\s*\(\s*0\s*,\s*10\s*\)/,
          name: "toISOString().slice(0, 10)",
        },
        { re: /\.toLocaleDateString\s*\(/, name: "toLocaleDateString(" },
        { re: /\.toDateString\s*\(\s*\)/, name: "toDateString()" },
      ];
      for (let i = 0; i < lines.length; i++) {
        const codeBeforeComment = lines[i].split("//")[0];
        for (const p of datePatterns) {
          if (p.re.test(codeBeforeComment)) {
            warnings.push(
              `⚠️ 日付文字列生成パターン禁止 (line ${i + 1}): \`${p.name}\` は UTC/ロケール依存で過去 bug の原因。\`dayjs(...).format("YYYY-MM-DD")\` を使ってください（3/15 UTC bug 参照）。`,
            );
            break;
          }
        }
      }
    }
    // 0f. mobile testID guideline checks (apps/mobile/CLAUDE.md「コンポーネント作成時のガイドライン」)
    // Returns { warnings: string[], counts: {modal, literal, page} } for content.
    const filePathNorm = filePath.replace(/\\/g, "/");
    const isMobileComponent =
      filePathNorm.includes("/apps/mobile/src/components/") &&
      /\.tsx$/.test(filePath) &&
      !isTestFile;
    if (isMobileComponent) {
      const current = analyzeTestIdViolations(content, filePath);
      testIdWarnings = current.warnings;

      // Compare against HEAD to decide block vs advisory.
      // - File new in HEAD (untracked or freshly added) → all current violations are NEW → block
      // - File existed in HEAD → block only if any violation count is HIGHER than HEAD
      // This lets agents touch files with pre-existing violations without getting
      // blocked, but forces them to fix anything they newly introduce.
      let headCounts = null;
      try {
        const gitRelPath = filePath
          .replace(`${projectDir}/`, "")
          .replace(/\\/g, "/");
        const headContent = execSync(
          `git show HEAD:"${gitRelPath}"`,
          { stdio: ["ignore", "pipe", "ignore"], cwd: projectDir },
        ).toString();
        headCounts = analyzeTestIdViolations(headContent, filePath).counts;
      } catch {
        // file not tracked at HEAD → treat as new file: any violation is "new"
      }

      const c = current.counts;
      if (!headCounts) {
        testIdNewViolations =
          c.modal + c.literal + c.page > 0;
      } else {
        testIdNewViolations =
          c.modal > headCounts.modal ||
          c.literal > headCounts.literal ||
          c.page > headCounts.page;
      }

      warnings.push(...testIdWarnings);
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
    // BLOCK on newly introduced testID violations. Pre-existing violations stay
    // advisory (the file was already broken; agent can touch it for unrelated
    // reasons). New introductions cannot escape — must be fixed before the
    // tool call completes.
    if (testIdNewViolations) {
      output.decision = "block";
      output.reason =
        "新たに testID 違反を持ち込んでいます。同じ編集の中で対応してください（pre-existing 分を直す義務はありませんが、追加した分は必ず直す）。詳細:\n" +
        testIdWarnings.join("\n");
    }
    process.stdout.write(JSON.stringify(output));
  }
}

/**
 * Mobile testID 違反を抽出する。
 * - modal: Modal/ModalOverlay opening タグで testID prop が無い数
 * - literal: testID="..." のリテラル直書き数
 * - page: Page.tsx で testID 参照ゼロなら 1、それ以外 0
 * テストID prop を自身が受け取って forward する wrapper（共通 ModalOverlay 等）は modal カウントから除外。
 */
function analyzeTestIdViolations(content, filePath) {
  const warnings = [];
  const counts = { modal: 0, literal: 0, page: 0 };

  // Page check
  if (
    /Page\.tsx$/.test(filePath) &&
    !/\btestID\s*=/.test(content) &&
    !/mobileTestIds\./.test(content)
  ) {
    counts.page = 1;
    warnings.push(
      "⚠️ Page コンポーネントに testID が無い: ルート View に `testID={mobileTestIds.<feature>.page}` を振り、`apps/mobile/src/testing/testIds.ts` にエントリを追加してください。",
    );
  }

  // Modal/ModalOverlay check (skip wrapper components that forward testID)
  const declaresTestIdProp =
    /\btestID\??:\s*string/.test(content) ||
    /\{\s*[^}]*\btestID\b[^}]*\}\s*[:=]/.test(content);
  if (!declaresTestIdProp) {
    const modalOpenRe = /<\s*(ModalOverlay|Modal)\b/g;
    let modalMatch;
    while ((modalMatch = modalOpenRe.exec(content)) !== null) {
      const startIdx = modalMatch.index;
      const tail = content.slice(startIdx, startIdx + 800);
      const endRel = tail.search(/(?<![=!])>(?![=>])/);
      const window = endRel === -1 ? tail : tail.slice(0, endRel + 1);
      if (!/\btestID\s*=/.test(window)) {
        counts.modal += 1;
        const lineNo = content.slice(0, startIdx).split("\n").length;
        if (counts.modal === 1) {
          warnings.push(
            `⚠️ testID不足 (line ${lineNo}): \`<${modalMatch[1]}>\` に testID prop が無い。新規ダイアログは \`testID={mobileTestIds.<feature>.<dialogName>}\` を振ってください。`,
          );
        }
      }
    }
  }

  // Literal testID
  const literalTestIdRe = /\btestID\s*=\s*["'`]([^"'`]+)["'`]/g;
  let litMatch;
  while ((litMatch = literalTestIdRe.exec(content)) !== null) {
    counts.literal += 1;
    const lineNo = content.slice(0, litMatch.index).split("\n").length;
    if (counts.literal === 1) {
      warnings.push(
        `⚠️ testID リテラル直書き (line ${lineNo}): \`testID="${litMatch[1]}"\` → \`apps/mobile/src/testing/testIds.ts\` に追加して \`mobileTestIds.xxx\` 経由で参照してください。`,
      );
    }
  }

  return { warnings, counts };
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
