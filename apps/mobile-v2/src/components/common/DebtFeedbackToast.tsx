import { useEffect, useRef, useState } from "react";

import type { DebtFeedbackResult } from "@packages/domain/goal/goalDebtFeedback";
import { Animated, Text, View } from "react-native";

import { onDebtFeedback } from "./debtFeedbackEvents";

const DISPLAY_DURATION = 4000;
const FADE_DURATION = 300;

function buildMessage(result: DebtFeedbackResult): string {
  const lines: string[] = [];

  if (result.targetAchievedToday && result.debtCleared) {
    lines.push("目標達成 & 負債完済！");
  } else if (result.targetAchievedToday) {
    lines.push("今日の目標達成！");
  } else if (result.debtCleared) {
    lines.push(`負債完済！ (${result.balanceBefore} → 0)`);
  } else if (result.debtReduced) {
    lines.push(`負債軽減: ${result.balanceBefore} → ${result.balanceAfter}`);
  } else if (result.savedAmount > 0 && !result.targetAchievedToday) {
    lines.push(`部分達成: ${result.savedAmount}回分の負債を回避`);
  }

  if (result.debtCapSaved > 0) {
    lines.push(`(上限により${result.debtCapSaved}回分免除)`);
  }

  return lines.join("\n");
}

function shouldShow(result: DebtFeedbackResult): boolean {
  return (
    result.targetAchievedToday ||
    result.debtCleared ||
    result.debtReduced ||
    (result.savedAmount > 0 && !result.targetAchievedToday) ||
    result.debtCapSaved > 0
  );
}

export function DebtFeedbackToast() {
  const [result, setResult] = useState<DebtFeedbackResult | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(30)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return onDebtFeedback((r) => {
      if (!shouldShow(r)) return;
      setResult(r);
    });
  }, []);

  useEffect(() => {
    if (!result) return;

    // Clear any existing timer
    if (timerRef.current) clearTimeout(timerRef.current);

    // Reset and animate in
    opacity.setValue(0);
    translateY.setValue(30);

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

    // Auto-dismiss
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
        setResult(null);
      });
    }, DISPLAY_DURATION);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [result]);

  if (!result) return null;

  const message = buildMessage(result);
  if (!message) return null;

  return (
    <View className="absolute bottom-24 left-4 right-4" pointerEvents="none">
      <Animated.View
        style={{ opacity, transform: [{ translateY }] }}
        className="rounded-xl bg-emerald-600 px-5 py-4 shadow-lg"
      >
        <Text className="text-center text-base font-bold text-white">
          {message}
        </Text>
      </Animated.View>
    </View>
  );
}
