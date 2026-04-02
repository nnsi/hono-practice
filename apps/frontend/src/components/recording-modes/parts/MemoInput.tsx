import { useTranslation } from "@packages/i18n";

import { FormTextarea } from "../../common/FormTextarea";

type MemoInputProps = {
  value: string;
  onChange: (value: string) => void;
};

export function MemoInput({ value, onChange }: MemoInputProps) {
  const { t } = useTranslation("recording");
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1">
        {t("memo")}
      </label>
      <FormTextarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        placeholder={t("memoPlaceholder")}
      />
    </div>
  );
}
