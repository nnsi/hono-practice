import { useEffect, useRef } from "react";

import { Animated, Pressable, Text, View } from "react-native";

import { useReduceMotion } from "../../hooks/useReduceMotion";

type Props = {
  visible: boolean;
  onReload: () => void;
  onDismiss: () => void;
};

const FADE_DURATION = 300;

export function UpdateToast({ visible, onReload, onDismiss }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-30)).current;
  const shown = useRef(false);
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (visible && !shown.current) {
      shown.current = true;
      opacity.setValue(0);
      translateY.setValue(-30);
      if (reduceMotion) {
        opacity.setValue(1);
        translateY.setValue(0);
      } else {
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: FADE_DURATION,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration: FADE_DURATION,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
  }, [visible, reduceMotion]);

  const handleReload = async () => {
    if (reduceMotion) {
      opacity.setValue(0);
      onReload();
      return;
    }
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: FADE_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -30,
        duration: FADE_DURATION,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onReload();
    });
  };

  const handleDismiss = () => {
    if (reduceMotion) {
      opacity.setValue(0);
      shown.current = false;
      onDismiss();
      return;
    }
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: FADE_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -30,
        duration: FADE_DURATION,
        useNativeDriver: true,
      }),
    ]).start(() => {
      shown.current = false;
      onDismiss();
    });
  };

  if (!visible && !shown.current) return null;

  return (
    <View className="absolute left-4 right-4 top-16" pointerEvents="box-none">
      <Animated.View
        style={{ opacity, transform: [{ translateY }] }}
        className="rounded-xl bg-blue-600 dark:bg-blue-500 px-5 py-4 shadow-lg"
      >
        <Pressable
          onPress={handleReload}
          accessibilityRole="button"
          accessibilityLabel="アップデートがあります。タップして再起動"
        >
          <Text className="text-center text-sm font-bold text-white dark:text-white">
            アップデートがあります
          </Text>
          <Text className="mt-1 text-center text-xs text-blue-100 dark:text-blue-200">
            タップして再起動
          </Text>
        </Pressable>
        <Pressable
          onPress={handleDismiss}
          className="absolute right-2 top-2 px-2 py-1"
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text className="text-sm text-blue-200 dark:text-blue-300">✕</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}
