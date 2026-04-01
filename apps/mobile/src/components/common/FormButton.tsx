import { Text, TouchableOpacity } from "react-native";

type FormButtonVariant = "primary" | "secondary" | "danger" | "dangerConfirm";

type FormButtonProps = {
  variant: FormButtonVariant;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  className?: string;
};

const variantStyles: Record<
  FormButtonVariant,
  { button: string; buttonDisabled: string; text: string }
> = {
  primary: {
    button: "bg-gray-900 dark:bg-gray-100",
    buttonDisabled: "bg-gray-400 dark:bg-gray-500",
    text: "text-white dark:text-gray-900",
  },
  secondary: {
    button: "border border-gray-300 dark:border-gray-600",
    buttonDisabled: "border border-gray-200 dark:border-gray-700",
    text: "text-gray-700 dark:text-gray-300",
  },
  danger: {
    button: "border border-red-300 dark:border-red-700",
    buttonDisabled: "border border-red-200 dark:border-red-800",
    text: "text-red-500 dark:text-red-400",
  },
  dangerConfirm: {
    button: "bg-red-600",
    buttonDisabled: "bg-red-300 dark:bg-red-800",
    text: "text-white",
  },
};

export function FormButton({
  variant,
  label,
  onPress,
  disabled,
  className = "",
}: FormButtonProps) {
  const style = variantStyles[variant];
  const buttonStyle = disabled ? style.buttonDisabled : style.button;

  return (
    <TouchableOpacity
      className={`py-2.5 rounded-lg items-center ${buttonStyle} ${className}`}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
    >
      <Text className={`font-medium text-sm ${style.text}`}>{label}</Text>
    </TouchableOpacity>
  );
}
