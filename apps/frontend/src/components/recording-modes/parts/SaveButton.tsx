type SaveButtonProps = {
  onClick?: () => void;
  disabled: boolean;
  label?: string;
  type?: "submit" | "button";
};

export function SaveButton({
  onClick,
  disabled,
  label = "記録する",
  type = "button",
}: SaveButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
    >
      {disabled ? "記録中..." : label}
    </button>
  );
}
