import React from "react";
import { StyleSheet, View } from "react-native";
import { SettingsScreen } from "../../components/settings/SettingsScreen";

export default function Settings() {
  return (
    <View style={styles.container}>
      <SettingsScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
});
