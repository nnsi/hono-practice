import React from "react";

import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useDate } from "../../providers/DateProvider";

export const DateHeader = () => {
  const { selectedDate, setSelectedDate } = useDate();

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const formatDisplayDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    };
    return date.toLocaleDateString("en-US", options);
  };

  const isToday = () => {
    const today = new Date();
    return (
      selectedDate.getDate() === today.getDate() &&
      selectedDate.getMonth() === today.getMonth() &&
      selectedDate.getFullYear() === today.getFullYear()
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.arrow} onPress={() => changeDate(-1)}>
        <Text style={styles.arrowText}>◀</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.dateContainer}
        onPress={() => setSelectedDate(new Date())}
      >
        <Text style={styles.dateText}>{formatDisplayDate(selectedDate)}</Text>
        {isToday() && <Text style={styles.todayBadge}>Today</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.arrow} onPress={() => changeDate(1)}>
        <Text style={styles.arrowText}>▶</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  arrow: {
    padding: 10,
  },
  arrowText: {
    fontSize: 18,
    color: "#4a90e2",
  },
  dateContainer: {
    flex: 1,
    alignItems: "center",
  },
  dateText: {
    fontSize: 16,
    fontWeight: "500",
  },
  todayBadge: {
    fontSize: 12,
    color: "#4a90e2",
    marginTop: 2,
  },
});
