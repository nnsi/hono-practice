#!/usr/bin/env node
/**
 * PostToolUse Hook: 日記に「言わなかった / 提案しなかった」系のフレーズがあればフィードバック
 *
 * 日記を書いている最中に「ユーザーに言うべきだったのに言わなかった」と書いているなら、
 * それは今すぐユーザーに言うべきこと。書いて満足させない。
 */
import { readFileSync } from "node:fs";

/** 検出パターンと、マッチした場合のフィードバックメッセージ */
const PATTERNS = [
  // 「言わなかった」系 — 伝達の不作為
  {
    regex: /(?:言わなかった|言えなかった|伝えなかった|伝えられなかった|黙って(?:従った|いた)|黙っていた)/,
    label: "伝達の不作為",
  },
  // 「提案しなかった」系 — 提案の不作為
  {
    regex: /(?:提案しなかった|提言しなかった|提案できなかった|提案を(?:控えた|見送った))/,
    label: "提案の不作為",
  },
  // 「指摘しなかった」系 — 指摘・報告の不作為
  {
    regex: /(?:指摘しなかった|指摘できなかった|報告しなかった|報告できなかった)/,
    label: "指摘・報告の不作為",
  },
  // 「すべきだった」系 — 過去の後悔（ユーザーへの伝達に関するもの）
  {
    regex: /(?:聞けばよかった|言うべき|伝えるべき|提案すべき|相談すべき|報告すべき|指摘すべき)/,
    label: "過去の後悔",
  },
  // 「次回は」系 — 先送り
  {
    regex: /(?:次回(?:の作業で|デプロイ後に|は)|近いうちに(?:提案|確認|報告))/,
    label: "先送り",
  },
  // 「対応した方がいい」系 — 認識しているのに放置
  {
    regex: /(?:早めに対応した方が|対応(?:すべき|した方がいい)が(?:今は|今回は)|触らなかった)/,
    label: "認識しつつ放置",
  },
  // 「反論せず」系 — 意見の抑制
  {
    regex: /(?:反論せず|押し返す(?:ほどの)?確信がなかった|思考停止|水を差す)/,
    label: "意見の抑制",
  },
];

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

  // 日記ファイルのみ対象（絶対パス・相対パス両方対応）
  const normalized = filePath.replace(/\\/g, "/");
  if (!/(?:^|\/|\\)docs\/diary\//.test(normalized) || !normalized.endsWith(".md")) {
    return;
  }
  // diary/CLAUDE.md は除外
  if (normalized.endsWith("/CLAUDE.md")) return;

  // 編集差分のみをスキャン対象にする
  // - Write: content（新規作成 or 全書き換え）
  // - Edit: new_string（変更部分のみ）
  const toolName = parsed.tool_name || "";
  let content;
  if (toolName === "Edit" || toolName === "MultiEdit") {
    // Edit: new_string のみ対象（過去エントリの誤検知を防ぐ）
    if (toolName === "MultiEdit") {
      content = (parsed.tool_input?.edits || [])
        .map((e) => e.new_string || "")
        .join("\n");
    } else {
      content = parsed.tool_input?.new_string || "";
    }
  } else {
    // Write: content 全体（新規作成なので全文対象で妥当）
    content = parsed.tool_input?.content || "";
  }

  if (!content) return;

  const hits = [];
  for (const { regex, label } of PATTERNS) {
    const matches = content.match(new RegExp(regex.source, "g"));
    if (matches) {
      hits.push({ label, examples: [...new Set(matches)].slice(0, 3) });
    }
  }

  if (hits.length === 0) return;

  const details = hits
    .map((h) => `  - ${h.label}: 「${h.examples.join("」「")}」`)
    .join("\n");

  const feedback = [
    "⚠️ 日記に「言わなかった・提案しなかった」系のフレーズを検出しました:",
    details,
    "",
    "📢 日記に書いて満足していませんか？ それは今すぐユーザーに伝えるべき内容では？",
    "日記の該当箇所を確認し、ユーザーに伝えるべきことがあれば今この場で伝えてください。",
    "「日記にだけ書いて終わり」にしないこと。",
  ].join("\n");

  const output = {
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: feedback,
    },
  };
  process.stdout.write(JSON.stringify(output));
}

main().catch(() => {});
