type FormButtonVariant = "primary" | "secondary" | "danger" | "dangerConfirm";

type FormButtonProps = {
  variant: FormButtonVariant;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "submit" | "button";
  className?: string;
};

const variantStyles: Record<FormButtonVariant, string> = {
  primary: "bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50",
  secondary: "border border-gray-300 text-gray-700 hover:bg-gray-50",
  danger: "border border-red-300 text-red-500 hover:bg-red-50",
  dangerConfirm: "bg-red-600 text-white hover:bg-red-700 disabled:opacity-50",
};

export function FormButton({
  variant,
  label,
  onClick,
  disabled,
  type = "button",
  className = "",
}: FormButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`py-2.5 rounded-lg font-medium text-sm transition-colors ${variantStyles[variant]} ${className}`}
    >
      {label}
    </button>
  );
}
