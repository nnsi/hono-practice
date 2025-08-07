import dayjs from "dayjs";

import {
  ERROR_MESSAGES,
  MAX_LENGTHS,
  MAX_QUANTITY,
  MIN_QUANTITY,
} from "./constants";

// バリデーションエラー型
export type ValidationError = {
  field: string;
  message: string;
};

// 日付バリデーション
export const validateDate = (dateStr: string): string | null => {
  if (!dateStr) return ERROR_MESSAGES.DATE_REQUIRED;

  const date = dayjs(dateStr);
  if (!date.isValid()) return ERROR_MESSAGES.DATE_INVALID_FORMAT;

  if (date.isAfter(dayjs())) return ERROR_MESSAGES.DATE_FUTURE;

  return null;
};

// 数量バリデーション
export const validateQuantity = (
  quantityStr: string | number,
): { value: number; error: string | null } => {
  if (quantityStr === "" || quantityStr === null || quantityStr === undefined) {
    return { value: 0, error: ERROR_MESSAGES.QUANTITY_REQUIRED };
  }

  const num =
    typeof quantityStr === "number" ? quantityStr : Number(quantityStr);
  if (Number.isNaN(num)) {
    return { value: 0, error: ERROR_MESSAGES.QUANTITY_NOT_NUMBER };
  }
  if (num < MIN_QUANTITY) {
    return { value: 0, error: ERROR_MESSAGES.QUANTITY_MIN };
  }
  if (num > MAX_QUANTITY) {
    return { value: 0, error: ERROR_MESSAGES.QUANTITY_MAX };
  }

  return { value: num, error: null };
};

// アクティビティ名バリデーション
export const validateActivityName = (name: string): string | null => {
  if (!name || name.trim() === "") {
    return ERROR_MESSAGES.ACTIVITY_NAME_REQUIRED;
  }

  if (name.length > MAX_LENGTHS.ACTIVITY_NAME) {
    return ERROR_MESSAGES.ACTIVITY_NAME_MAX_LENGTH;
  }

  return null;
};

// メモバリデーション
export const validateMemo = (memo: string): string | null => {
  if (memo && memo.length > MAX_LENGTHS.MEMO) {
    return ERROR_MESSAGES.MEMO_MAX_LENGTH;
  }

  return null;
};

// 種別名バリデーション
export const validateKindName = (name: string): string | null => {
  if (name && name.length > MAX_LENGTHS.KIND_NAME) {
    return `種別名は${MAX_LENGTHS.KIND_NAME}文字以内で入力してください`;
  }

  return null;
};
