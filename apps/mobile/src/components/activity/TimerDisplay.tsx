import React from "react";

import { StyleSheet, Text, View } from "react-native";

type TimerDisplayProps = {
  time: string;
  isRunning: boolean;
};

export function TimerDisplay({ time, isRunning }: TimerDisplayProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.time}>{time}</Text>
      {isRunning && <Text style={styles.status}>計測中...</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  time: {
    fontSize: 48,
    fontWeight: "bold",
    fontFamily: "monospace",
    color: "#111827",
  },
  status: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
});
