export type RecordingMode =
  | "manual" // 現行の手動入力（数量 + メモ）
  | "timer" // タイマー計測
  | "counter" // +/- ボタンで増減
  | "binary" // 2択（ActivityKind を2つ使う）
  | "numpad" // テンキー入力
  | "check"; // やった/やらない の1タップ

export const RECORDING_MODES = [
  "manual",
  "timer",
  "counter",
  "binary",
  "numpad",
  "check",
] as const;
