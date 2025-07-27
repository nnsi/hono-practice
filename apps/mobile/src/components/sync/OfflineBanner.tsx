import React, { useState, useEffect } from "react";

import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { useNetworkStatus } from "../../hooks/useNetworkStatus";

export function OfflineBanner() {
  const { isOnline } = useNetworkStatus();
  const [isVisible, setIsVisible] = useState(false);
  const [showOnlineMessage, setShowOnlineMessage] = useState(false);
  const [animation] = useState(new Animated.Value(0));

  useEffect(() => {
    if (!isOnline) {
      setIsVisible(true);
      setShowOnlineMessage(false);
      Animated.timing(animation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else if (isVisible) {
      // オンラインに復帰
      setShowOnlineMessage(true);
      setTimeout(() => {
        Animated.timing(animation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setIsVisible(false);
          setShowOnlineMessage(false);
        });
      }, 3000);
    }
  }, [isOnline, isVisible, animation]);

  const handleDismiss = () => {
    Animated.timing(animation, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsVisible(false);
      setShowOnlineMessage(false);
    });
  };

  if (!isVisible) {
    return null;
  }

  const translateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 0],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          backgroundColor: showOnlineMessage ? "#10B981" : "#F59E0B",
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.iconAndText}>
          <Ionicons
            name={showOnlineMessage ? "wifi" : "wifi-outline"}
            size={20}
            color="white"
          />
          <Text style={styles.text}>
            {showOnlineMessage
              ? "オンラインに復帰しました"
              : "オフラインです。データは自動的に保存され、オンライン復帰時に同期されます。"}
          </Text>
        </View>
        <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
          <Ionicons name="close" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    paddingTop: 40, // SafeAreaView対応
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconAndText: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
  },
  text: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
});
