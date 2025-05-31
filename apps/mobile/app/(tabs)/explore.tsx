import { ScrollView, StyleSheet, Text, View } from "react-native";

import { DateHeader } from "../../components/common/DateHeader";
import { ActivityLogList } from "../../components/daily/ActivityLogList";
import { TaskList } from "../../components/daily/TaskList";

export default function DailyScreen() {
  return (
    <View style={styles.container}>
      <DateHeader />
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activities</Text>
          <ActivityLogList />
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tasks</Text>
          <TaskList />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    flex: 1,
  },
  section: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
});
