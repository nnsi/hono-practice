/**
 * Web課金（Polar経由）が有効かどうかを返す。
 *
 * false時は以下を非表示にする:
 * - 設定画面のアップグレードボタン
 * - EntitlementGate のアップグレードCTA
 * - UpgradeModal
 * - 特商法ページへのリンク
 *
 * 特商法11条1号との整合性: 課金導線を出さない限り日本の特商法表記は不要となる
 * という解釈に基づく（Apple/Google IAP と同じ MoR 構造）。
 */
export function useWebSubscriptionEnabled(): boolean {
  return import.meta.env.VITE_ENABLE_WEB_SUBSCRIPTION === "true";
}
