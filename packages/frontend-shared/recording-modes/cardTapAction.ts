import { resolveRecordingMode } from "./resolveRecordingMode";
import type { ActivityBase } from "./types";

/**
 * Actiko グリッドのカードをタップしたときの挙動。
 *
 * - `record-check`: カード上で即座に check 記録を作る（モーダルも展開もしない）
 * - `expand`: カードをその場で展開し、記録モードの UI をカード内に出す
 */
export type CardTapAction = "record-check" | "expand";

export type CardTapContext = {
  /** 対象日に既に記録があるか */
  isDone: boolean;
  /** ActivityKind を持つか（Kind があれば選択 UI が要る） */
  hasKinds: boolean;
};

/**
 * check モードで Kind がなく、まだ当日の記録がない場合だけ 1 タップで即記録する。
 * それ以外はカードを展開して各モードの UI を出す。
 * 記録済みの check カードは展開して「記録済み」を見せる（重複記録を防ぐ）。
 */
export function resolveCardTapAction(
  activity: ActivityBase,
  context: CardTapContext,
): CardTapAction {
  if (resolveRecordingMode(activity) !== "check") return "expand";
  if (context.hasKinds) return "expand";
  if (context.isDone) return "expand";
  return "record-check";
}

/**
 * 展開したカードで保存が完了したあと、カードを閉じるか。
 * counter / binary は連続して記録することが多いので開いたままにし、
 * 当日集計をその場で更新して見せる。それ以外は 1 回の保存で閉じる。
 */
export function shouldCollapseAfterSave(activity: ActivityBase): boolean {
  const mode = resolveRecordingMode(activity);
  return mode !== "counter" && mode !== "binary";
}
