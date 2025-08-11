import { useCallback } from "react";

import { useActivities } from "@frontend/hooks/api/useActivities";
import {
  validateDate as validateDateUtil,
  validateQuantity as validateQuantityUtil,
} from "@packages/frontend-shared/utils/validation";

import type { ColumnMapping } from "@frontend/components/csv/CSVColumnMapper";

export type ActivityLogValidationError = {
  field: string;
  message: string;
};

export type ValidatedActivityLog = {
  date: string;
  activityName: string;
  activityId?: string;
  kindName?: string;
  quantity: number;
  memo?: string;
  isNewActivity: boolean;
  errors: ActivityLogValidationError[];
};

export type ValidationResult = {
  validatedLogs: ValidatedActivityLog[];
  hasErrors: boolean;
  totalErrors: number;
};

export function useActivityLogValidator() {
  const { data: activities } = useActivities();

  const validateMapping = useCallback((mapping: ColumnMapping): string[] => {
    const errors: string[] = [];
    if (!mapping.date) errors.push("日付カラムのマッピングが必要です");
    if (!mapping.activity && !mapping.fixedActivityId)
      errors.push(
        "アクティビティカラムのマッピングまたは固定アクティビティの選択が必要です",
      );
    if (!mapping.quantity) errors.push("数量カラムのマッピングが必要です");
    return errors;
  }, []);

  const validateDate = useCallback((dateStr: string): string | null => {
    return validateDateUtil(dateStr);
  }, []);

  const validateQuantity = useCallback(
    (quantityStr: string): { value: number; error: string | null } => {
      return validateQuantityUtil(quantityStr);
    },
    [],
  );

  const findActivity = useCallback(
    (activityName: string, kindName?: string) => {
      if (!activities || !activityName) return { activity: null, isNew: true };

      const activity = activities.find((a: any) => a.name === activityName);
      if (!activity) return { activity: null, isNew: true };

      // 種別名が指定されている場合は、その活動の種別として存在するかチェック
      if (kindName && activity.kinds) {
        const hasKind = activity.kinds.some((k: any) => k.name === kindName);
        if (!hasKind) {
          return {
            activity,
            isNew: false,
            kindError: `活動「${activityName}」に種別「${kindName}」は存在しません`,
          };
        }
      }

      return { activity, isNew: false };
    },
    [activities],
  );

  const validateRowWithMapping = useCallback(
    (
      row: Record<string, string>,
      mapping: ColumnMapping,
    ): ValidatedActivityLog => {
      const errors: ActivityLogValidationError[] = [];

      // マッピングに従ってデータを取得
      const date = mapping.date ? row[mapping.date] : "";
      let activityName = mapping.activity ? row[mapping.activity] : "";
      let activityId: string | undefined;
      let isFixedActivity = false;

      // 固定アクティビティIDが設定されている場合
      if (mapping.fixedActivityId && activities) {
        const fixedActivity = activities.find(
          (a: any) => a.id === mapping.fixedActivityId,
        );
        if (fixedActivity) {
          activityName = fixedActivity.name;
          activityId = fixedActivity.id;
          isFixedActivity = true;
        }
      }

      const kindName = mapping.kind ? row[mapping.kind] : undefined;
      const quantityStr = mapping.quantity ? row[mapping.quantity] : "";
      const memo = mapping.memo ? row[mapping.memo] : undefined;

      // 日付バリデーション
      const dateError = validateDate(date);
      if (dateError) {
        errors.push({ field: "date", message: dateError });
      }

      // 活動名バリデーション（固定アクティビティでない場合のみ）
      if (!isFixedActivity && !activityName) {
        errors.push({ field: "activity", message: "活動名は必須です" });
      }

      // 数量バリデーション
      const { value: quantity, error: quantityError } =
        validateQuantity(quantityStr);
      if (quantityError) {
        errors.push({ field: "quantity", message: quantityError });
      }

      // 活動の存在チェック（固定アクティビティでない場合のみ）
      let isNew = false;
      if (!isFixedActivity && activityName) {
        const {
          activity,
          isNew: isNewActivity,
          kindError,
        } = findActivity(activityName, kindName);
        if (kindError) {
          errors.push({ field: "kind", message: kindError });
        }
        isNew = isNewActivity;
        if (!activityId) {
          activityId = activity?.id;
        }
      }

      return {
        date: date || "",
        activityName: activityName || "",
        activityId,
        kindName,
        quantity,
        memo,
        isNewActivity: isNew,
        errors,
      };
    },
    [activities, validateDate, validateQuantity, findActivity],
  );

  // 後方互換性のために残す
  const validateRow = useCallback(
    (row: Record<string, string>): ValidatedActivityLog => {
      // デフォルトマッピング
      const defaultMapping: ColumnMapping = {
        date: "date",
        activity: "activity",
        kind: "kind",
        quantity: "quantity",
        memo: "memo",
      };
      return validateRowWithMapping(row, defaultMapping);
    },
    [validateRowWithMapping],
  );

  const validateAllWithMapping = useCallback(
    (
      data: Record<string, string>[],
      mapping: ColumnMapping,
    ): ValidationResult => {
      const validatedLogs = data.map((row) =>
        validateRowWithMapping(row, mapping),
      );
      const totalErrors = validatedLogs.reduce(
        (sum, log) => sum + log.errors.length,
        0,
      );

      return {
        validatedLogs,
        hasErrors: totalErrors > 0,
        totalErrors,
      };
    },
    [validateRowWithMapping],
  );

  // 後方互換性のために残す
  const validateAll = useCallback(
    (data: Record<string, string>[]): ValidationResult => {
      const defaultMapping: ColumnMapping = {
        date: "date",
        activity: "activity",
        kind: "kind",
        quantity: "quantity",
        memo: "memo",
      };
      return validateAllWithMapping(data, defaultMapping);
    },
    [validateAllWithMapping],
  );

  const validateHeaders = useCallback((headers: string[]): string[] => {
    // 後方互換性のため残す
    const REQUIRED_COLUMNS = ["date", "activity", "quantity"];
    const missing = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));
    return missing.map((col) => `必須カラム「${col}」が見つかりません`);
  }, []);

  return {
    validateHeaders,
    validateMapping,
    validateRow,
    validateRowWithMapping,
    validateAll,
    validateAllWithMapping,
  };
}
