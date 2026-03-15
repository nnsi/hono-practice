import { Text, TextInput, View } from "react-native";

type MemoInputProps = {
  value: string;
  onChangeText: (value: string) => void;
};

export function MemoInput({ value, onChangeText }: MemoInputProps) {
  return (
    <View>
      <Text className="text-sm font-medium text-gray-600 mb-1">メモ</Text>
      <TextInput
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        value={value}
        onChangeText={onChangeText}
        placeholder="メモを入力..."
        multiline
        numberOfLines={2}
      />
    </View>
  );
}
