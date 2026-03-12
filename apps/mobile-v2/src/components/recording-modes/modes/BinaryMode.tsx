import type { RecordingModeProps } from "@packages/frontend-shared/recording-modes/types";
import { Text, TouchableOpacity, View } from "react-native";

import { useBinaryMode } from "./useBinaryMode";

const KIND_BG = [
  { normal: "bg-blue-500", disabled: "bg-blue-300" },
  { normal: "bg-gray-700", disabled: "bg-gray-500" },
  { normal: "bg-emerald-500", disabled: "bg-emerald-300" },
  { normal: "bg-orange-500", disabled: "bg-orange-300" },
];

export function BinaryMode(props: RecordingModeProps) {
  const vm = useBinaryMode(props);

  if (!vm.hasKinds) {
    return (
      <View className="py-8 items-center">
        <Text className="text-gray-500 text-sm">
          バイナリモードを使うには、アクティビティに「種類」を追加してください。
        </Text>
      </View>
    );
  }

  const totalCount = vm.kindTallies.reduce((sum, k) => sum + k.count, 0);

  return (
    <View className="gap-4">
      <View className="flex-row gap-3">
        {vm.kindTallies.map((kind, i) => {
          const colors = KIND_BG[i % KIND_BG.length];
          return (
            <TouchableOpacity
              key={kind.id}
              className={`flex-1 rounded-xl py-8 items-center ${
                vm.isSubmitting ? colors.disabled : colors.normal
              }`}
              onPress={() => vm.selectKind(kind.id)}
              disabled={vm.isSubmitting}
            >
              <Text className="text-xl font-bold text-white">{kind.name}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {totalCount > 0 && (
        <Text className="text-sm text-gray-500 text-center">
          今日: {vm.kindTallies.map((k) => `${k.count}${k.name}`).join(" ")}
        </Text>
      )}
    </View>
  );
}
