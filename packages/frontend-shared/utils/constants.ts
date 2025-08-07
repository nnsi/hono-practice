// バリデーション制限値
export const MAX_QUANTITY = 99999;
export const MIN_QUANTITY = 0;

// エラーメッセージ定数
export const ERROR_MESSAGES = {
  QUANTITY_REQUIRED: "数量は必須です",
  QUANTITY_NOT_NUMBER: "数値で入力してください",
  QUANTITY_MIN: `数量は${MIN_QUANTITY}以上で入力してください`,
  QUANTITY_MAX: `数量は${MAX_QUANTITY}以下で入力してください`,
  DATE_REQUIRED: "日付は必須です",
  DATE_INVALID_FORMAT:
    "日付の形式が正しくありません（YYYY-MM-DD形式で入力してください）",
  DATE_FUTURE: "未来の日付は指定できません",
  ACTIVITY_NAME_REQUIRED: "アクティビティ名は必須です",
  ACTIVITY_NAME_MAX_LENGTH: "アクティビティ名は50文字以内で入力してください",
  MEMO_MAX_LENGTH: "メモは500文字以内で入力してください",
} as const;

// デフォルト値
export const DEFAULT_VALUES = {
  EMOJI: "📝",
  QUANTITY_UNIT: "回",
  QUANTITY: 1,
} as const;

// 文字数制限
export const MAX_LENGTHS = {
  ACTIVITY_NAME: 50,
  MEMO: 500,
  KIND_NAME: 30,
} as const;
