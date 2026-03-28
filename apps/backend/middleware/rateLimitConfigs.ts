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
