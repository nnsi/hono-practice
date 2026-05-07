export type RateLimitConfig = {
  windowMs: number;
  limit: number;
  keyGenerator: (c: { ip: string; path: string }) => string;
};

/**
 * ログイン用レートリミット設定
 * 15分間に5回まで
 */
export const loginRateLimitConfig: RateLimitConfig = {
  windowMs: 15 * 60 * 1000,
  limit: 5,
  keyGenerator: ({ ip }) => `login:${ip}`,
};

/**
 * トークンリフレッシュ用レートリミット設定
 * 1分間に10回まで
 */
export const tokenRateLimitConfig: RateLimitConfig = {
  windowMs: 60 * 1000,
  limit: 10,
  keyGenerator: ({ ip }) => `token:${ip}`,
};

/**
 * ユーザー登録用レートリミット設定
 * 1時間に5回まで
 */
export const registerRateLimitConfig: RateLimitConfig = {
  windowMs: 60 * 60 * 1000,
  limit: 5,
  keyGenerator: ({ ip }) => `register:${ip}`,
};

/**
 * お問い合わせ用レートリミット設定
 * 24時間に2回まで
 */
export const contactRateLimitConfig: RateLimitConfig = {
  windowMs: 24 * 60 * 60 * 1000,
  limit: 2,
  keyGenerator: ({ ip }) => `contact:${ip}`,
};

/**
 * クライアントエラー報告用レートリミット設定
 * 1分間に30回まで
 */
export const clientErrorRateLimitConfig: RateLimitConfig = {
  windowMs: 60 * 1000,
  limit: 30,
  keyGenerator: ({ ip }) => `client-error:${ip}`,
};

/**
 * Webhook 受信用レートリミット設定（RevenueCat / Polar）
 * 正常な再送を弾かないよう寛容な値に設定
 * IPベース、1分間に300回まで
 */
export const webhookRateLimitConfig: RateLimitConfig = {
  windowMs: 60 * 1000,
  limit: 300,
  keyGenerator: ({ ip }) => `webhook:${ip}`,
};
