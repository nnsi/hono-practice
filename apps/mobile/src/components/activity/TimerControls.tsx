import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type TimerControlsProps = {
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  showReset?: boolean;
};

export function TimerControls({
  isRunning,
  onStart,
  onStop,
  onReset,
  showReset = true,
}: TimerControlsProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          styles.primaryButton,
          isRunning && styles.stopButton,
        ]}
        onPress={isRunning ? onStop : onStart}
      >
        <Ionicons name={isRunning ? "pause" : "play"} size={24} color="white" />
        <Text style={styles.buttonText}>{isRunning ? "停止" : "開始"}</Text>
      </TouchableOpacity>

      {showReset && (
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={onReset}
        >
          <Ionicons name="refresh" size={24} color="#374151" />
          <Text style={styles.secondaryButtonText}>リセット</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: "#3B82F6",
  },
  stopButton: {
    backgroundColor: "#EF4444",
  },
  secondaryButton: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
  },
});
