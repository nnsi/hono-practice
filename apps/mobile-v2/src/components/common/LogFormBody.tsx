import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import dayjs from "dayjs";
import { DatePickerField } from "./DatePickerField";

type ActivityKind = {
  id: string;
  name: string;
  color: string | null;
};

type LogFormBodyProps = {
  quantityUnit: string;
  kinds: ActivityKind[];
  quantity: string;
  onQuantityChange: (v: string) => void;
  selectedKindId: string | null;
  onKindSelect: (id: string | null) => void;
  memo: string;
  onMemoChange: (v: string) => void;
  date: string;
  onDateChange: (v: string) => void;
  time: string;
  onTimeChange: (v: string) => void;
};

export function LogFormBody({
  quantityUnit,
  kinds,
  quantity,
  onQuantityChange,
  selectedKindId,
  onKindSelect,
  memo,
  onMemoChange,
  date,
  onDateChange,
  time,
  onTimeChange,
}: LogFormBodyProps) {
  return (
    <View className="gap-4">
      {quantityUnit ? (
        <View>
          <Text className="text-sm text-gray-500 mb-1">
            数量 ({quantityUnit})
          </Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-2 text-base"
            value={quantity}
            onChangeText={onQuantityChange}
            keyboardType="numeric"
            placeholder="0"
          />
        </View>
      ) : null}

      {kinds.length > 0 ? (
        <View>
          <Text className="text-sm text-gray-500 mb-1">種別</Text>
          <View className="flex-row flex-wrap gap-2">
            {kinds.map((kind) => (
              <TouchableOpacity
                key={kind.id}
                onPress={() =>
                  onKindSelect(selectedKindId === kind.id ? null : kind.id)
                }
                className={`px-3 py-1.5 rounded-full border ${
                  selectedKindId === kind.id
                    ? "bg-blue-500 border-blue-500"
                    : "bg-white border-gray-300"
                }`}
              >
                <Text
                  className={`text-sm ${
                    selectedKindId === kind.id
                      ? "text-white font-medium"
                      : "text-gray-700"
                  }`}
                >
                  {kind.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}

      <View>
        <Text className="text-sm text-gray-500 mb-1">メモ</Text>
        <TextInput
          className="border border-gray-300 rounded-lg px-4 py-2 text-base"
          value={memo}
          onChangeText={onMemoChange}
          placeholder="メモ（任意）"
          multiline
          numberOfLines={2}
        />
      </View>

      <DatePickerField value={date} onChange={onDateChange} label="日付" />

      <View>
        <Text className="text-sm text-gray-500 mb-1">時刻</Text>
        <TextInput
          className="border border-gray-300 rounded-lg px-4 py-2 text-base"
          value={time}
          onChangeText={onTimeChange}
          placeholder="HH:mm"
          maxLength={5}
        />
      </View>
    </View>
  );
}
