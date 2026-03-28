import { useEffect, useRef, useState } from "react";

import {
  buildDebtFeedbackMessage,
  isMajorAchievement,
  shouldShowDebtFeedback,
} from "@packages/domain/goal/debtFeedbackMessage";
import type { DebtFeedbackResult } from "@packages/domain/goal/goalDebtFeedback";
import { onDebtFeedback } from "@packages/frontend-shared";
import { useTranslation } from "@packages/i18n";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Animated, Text, View } from "react-native";

const DISPLAY_DURATION = 4000;
const FADE_DURATION = 300;

export function DebtFeedbackToast() {
  const { t } = useTranslation("feedback");
  const [results, setResults] = useState<DebtFeedbackResult[] | null>(null);
  const [praiseMode, setPraiseMode] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(30)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const praiseModeRef = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem("actiko-v2-settings").then((raw) => {
      if (!raw) return;
      try {
        const val = JSON.parse(raw).praiseMode === true;
        praiseModeRef.current = val;
      } catch {
        /* ignore */
      }
    });
  }, []);

  useEffect(() => {
    return onDebtFeedback((r) => {
      const praise = praiseModeRef.current;
      if (!shouldShowDebtFeedback(r, praise)) return;
      setPraiseMode(praise);
      setResults(r);
    });
  }, []);

  useEffect(() => {
    if (!results) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    opacity.setValue(0);
    translateY.setValue(30);
    scale.setValue(1);

    const fadeIn = Animated.parallel([
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
    ]);

    if (praiseMode) {
      const pulseScale = Animated.sequence([
        Animated.timing(scale, {
          toValue: isMajorAchievement(results) ? 1.08 : 1.05,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]);

      Animated.sequence([fadeIn, pulseScale]).start();
    } else {
      fadeIn.start();
    }

    timerRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: FADE_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 30,
          duration: FADE_DURATION,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setResults(null);
      });
    }, DISPLAY_DURATION);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [results]);

  if (!results) return null;

  const message = buildDebtFeedbackMessage(results, praiseMode, t);
  if (!message) return null;

  const bgClass = praiseMode
    ? "bg-amber-50 dark:bg-amber-900/200"
    : "bg-emerald-600";

  return (
    <View className="absolute bottom-24 left-4 right-4" pointerEvents="none">
      <Animated.View
        style={{
          opacity,
          transform: [{ translateY }, { scale }],
        }}
        className={`rounded-xl ${bgClass} px-5 py-4 shadow-lg`}
      >
        <Text className="text-center text-base font-bold text-white dark:text-white">
          {message}
        </Text>
      </Animated.View>
    </View>
  );
}
