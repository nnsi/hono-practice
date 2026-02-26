import { View, Text, TextInput } from "react-native";

type EmojiPickerProps = {
  value: string;
  onChange: (emoji: string) => void;
};

export function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  return (
    <View>
      <Text className="text-sm text-gray-500 mb-1">絵文字</Text>
      <TextInput
        className="border border-gray-300 rounded-lg px-4 py-2 text-2xl text-center"
        value={value}
        onChangeText={onChange}
        maxLength={2}
        placeholder="📝"
      />
    </View>
  );
}
