import { useState } from "react";

import { COLOR_PALETTE } from "@packages/frontend-shared/utils/colorUtils";
import { TouchableOpacity, View } from "react-native";

type KindColorPickerProps = {
  color: string;
  onColorChange: (color: string) => void;
};

export function KindColorPicker({
  color,
  onColorChange,
}: KindColorPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <View>
      <TouchableOpacity
        onPress={() => setOpen((v) => !v)}
        className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600"
        style={{ backgroundColor: color }}
      />
      {open && (
        <View
          className="absolute bottom-10 right-0 z-10 flex-row flex-wrap bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-700 shadow-sm"
          style={{ width: 180 }}
        >
          {COLOR_PALETTE.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => {
                onColorChange(c);
                setOpen(false);
              }}
              className="m-1 rounded-full items-center justify-center"
              style={{
                width: 28,
                height: 28,
                backgroundColor: c,
                borderWidth: c.toUpperCase() === color.toUpperCase() ? 3 : 0,
                borderColor: "#1f2937",
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}
