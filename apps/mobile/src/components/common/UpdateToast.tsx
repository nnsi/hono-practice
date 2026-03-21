import { useEffect, useRef } from "react";

import { Animated, Pressable, Text, View } from "react-native";

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

  useEffect(() => {
    if (visible && !shown.current) {
      shown.current = true;
      opacity.setValue(0);
      translateY.setValue(-30);
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
  }, [visible]);

  const handleReload = async () => {
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
        className="rounded-xl bg-blue-600 px-5 py-4 shadow-lg"
      >
        <Pressable onPress={handleReload}>
          <Text className="text-center text-sm font-bold text-white">
            アップデートがあります
          </Text>
          <Text className="mt-1 text-center text-xs text-blue-100">
            タップして再起動
          </Text>
        </Pressable>
        <Pressable
          onPress={handleDismiss}
          className="absolute right-2 top-2 px-2 py-1"
        >
          <Text className="text-sm text-blue-200">✕</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}
