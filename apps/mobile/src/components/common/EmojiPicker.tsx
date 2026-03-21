import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

import RNEmojiPicker, { type EmojiType } from "rn-emoji-keyboard";

const jaTranslation = {
  recently_used: "よく使う絵文字",
  smileys_emotion: "スマイリー",
  people_body: "人物",
  animals_nature: "動物と自然",
  food_drink: "食べ物",
  travel_places: "旅行と場所",
  activities: "アクティビティ",
  objects: "オブジェクト",
  symbols: "記号",
  flags: "旗",
  search: "検索",
};

type EmojiPickerProps = {
  value: string;
  onChange: (emoji: string) => void;
};

export function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (emojiObject: EmojiType) => {
    onChange(emojiObject.emoji);
  };

  return (
    <View>
      <Text className="text-sm text-gray-500 mb-1">絵文字</Text>
      <TouchableOpacity
        className="border border-gray-300 rounded-lg px-4 py-3 items-center"
        onPress={() => setIsOpen(true)}
      >
        <Text className="text-3xl">{value || "📝"}</Text>
      </TouchableOpacity>
      <RNEmojiPicker
        open={isOpen}
        onClose={() => setIsOpen(false)}
        onEmojiSelected={handleSelect}
        translation={jaTranslation}
        enableSearchBar
      />
    </View>
  );
}
