import { StyleSheet, View } from "react-native";

import { ActivityGrid } from "../../components/activities/ActivityGrid";
import { DateHeader } from "../../components/common/DateHeader";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <DateHeader />
      <ActivityGrid />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
});
