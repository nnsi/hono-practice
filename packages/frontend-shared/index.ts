// 型定義

// API共通化
export * from "./api";
// APIクライアント
export { createApiClient } from "./apiClient";
// 認証共通化
export * from "./auth";
// ヘルパー関数（後方互換性のため残す）
export {
  calculateRefreshTime,
  decodeJWT,
  getTokenExpirationTime,
} from "./auth/authHelpers";
// 目標関連
export * from "./goals";
// Feature Hooks
export * from "./hooks/feature";
// Export AppSettings types
export {
  type AppSettings,
  defaultSettings,
} from "./hooks/feature/useAppSettings";
// トークンストレージ
export { createMemoryTokenStore, tokenStore } from "./tokenStore";
export * from "./types";

// API Hooks (Note: These are not exported from the main index to avoid conflicts with sync hooks)
// Import them directly from their paths when needed:
// import { createUseActivityLogs } from "@packages/frontend-shared/hooks/useActivityLogs"
// import { createUseCreateActivity } from "@packages/frontend-shared/hooks/useActivityMutations"
