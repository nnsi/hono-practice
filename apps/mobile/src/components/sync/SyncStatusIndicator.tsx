import React, { useState, useEffect } from "react";

import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import { useSyncStatus } from "../../hooks/useSyncStatus";

export function SyncStatusIndicator() {
  const { isOnline } = useNetworkStatus();
  const {
    isSyncing,
    hasPendingSync,
    totalUnsyncedCount,
    lastSyncedAt,
    syncNow,
  } = useSyncStatus();

  const getStatusIcon = () => {
    if (!isOnline) {
      return { name: "cloud-offline-outline" as const, color: "#6B7280" };
    }
    if (isSyncing) {
      return { name: "sync" as const, color: "#3B82F6" };
    }
    if (hasPendingSync) {
      return { name: "cloud-upload-outline" as const, color: "#F59E0B" };
    }
    return { name: "cloud-done-outline" as const, color: "#10B981" };
  };

  const getStatusText = () => {
    if (!isOnline) return "オフライン";
    if (isSyncing) return "同期中...";
    if (hasPendingSync) return "同期待ち";
    return "同期済み";
  };

  const statusIcon = getStatusIcon();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={syncNow}
        disabled={!isOnline || isSyncing || !hasPendingSync}
        style={[
          styles.button,
          (!isOnline || isSyncing || !hasPendingSync) && styles.buttonDisabled,
        ]}
      >
        {isSyncing ? (
          <ActivityIndicator size="small" color={statusIcon.color} />
        ) : (
          <Ionicons name={statusIcon.name} size={20} color={statusIcon.color} />
        )}
        <Text style={[styles.statusText, { color: statusIcon.color }]}>
          {getStatusText()}
        </Text>
      </TouchableOpacity>

      {totalUnsyncedCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{totalUnsyncedCount}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "500",
  },
  badge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
});
