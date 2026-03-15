import type { RecordingModeProps } from "@packages/frontend-shared/recording-modes/types";
import { Check } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";

import { useCheckMode } from "./useCheckMode";

export function CheckMode(props: RecordingModeProps) {
  const vm = useCheckMode(props);

  return (
    <View className="items-center gap-4 py-4">
      <TouchableOpacity
        className={`w-24 h-24 rounded-full items-center justify-center ${
          vm.isCheckedToday
            ? "bg-green-500"
            : "bg-white border-2 border-gray-300"
        }`}
        onPress={vm.check}
        disabled={vm.isSubmitting}
      >
        <Check size={48} color={vm.isCheckedToday ? "#ffffff" : "#d1d5db"} />
      </TouchableOpacity>

      <Text className="text-sm text-gray-500">
        {vm.isCheckedToday ? "記録済み \u2713" : "タップして記録"}
      </Text>
    </View>
  );
}
