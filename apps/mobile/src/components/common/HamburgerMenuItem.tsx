import { StyleSheet, Text, TouchableOpacity } from "react-native";

export function HamburgerMenuItem({
  icon,
  label,
  onPress,
  textColor,
  testID,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  textColor: string;
  testID?: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.6}
      accessibilityRole="menuitem"
      accessibilityLabel={label}
      style={styles.menuItem}
      testID={testID}
    >
      {icon}
      <Text style={[styles.menuItemText, { color: textColor }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
  },
  menuItemText: {
    fontSize: 14,
  },
});
