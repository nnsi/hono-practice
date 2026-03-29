import { View } from "react-native";

export function DashedLine({
  color,
  dashWidth = 5,
  dashGap = 4,
  thickness = 1.5,
}: {
  color: string;
  dashWidth?: number;
  dashGap?: number;
  thickness?: number;
}) {
  return (
    <View
      style={{ flexDirection: "row", overflow: "hidden", height: thickness }}
    >
      {Array.from({ length: 80 }, (_, i) => (
        <View
          // biome-ignore lint/suspicious/noArrayIndexKey: static decorative dashes, never reordered
          key={i}
          style={{
            width: dashWidth,
            height: thickness,
            backgroundColor: i % 2 === 0 ? color : "transparent",
            marginRight: i % 2 === 0 ? dashGap : 0,
          }}
        />
      ))}
    </View>
  );
}
