import { Text, TouchableOpacity } from "react-native";

type SaveButtonProps = {
  onPress: () => void;
  disabled: boolean;
  label?: string;
};

export function SaveButton({
  onPress,
  disabled,
  label = "記録する",
}: SaveButtonProps) {
  return (
    <TouchableOpacity
      className={`py-3 rounded-lg items-center mb-4 ${
        disabled ? "bg-gray-400" : "bg-gray-900"
      }`}
      onPress={onPress}
      disabled={disabled}
    >
      <Text className="text-white font-medium">
        {disabled ? "記録中..." : label}
      </Text>
    </TouchableOpacity>
  );
}
