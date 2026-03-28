import { useTranslation } from "@packages/i18n";

type SaveButtonProps = {
  onClick?: () => void;
  disabled: boolean;
  label?: string;
  type?: "submit" | "button";
};

export function SaveButton({
  onClick,
  disabled,
  label,
  type = "button",
}: SaveButtonProps) {
  const { t } = useTranslation("recording");
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
    >
      {disabled ? t("saving") : (label ?? t("save"))}
    </button>
  );
}
