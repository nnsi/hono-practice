import { useCallback, useEffect, useRef, useState } from "react";

import { ChevronLeft, X } from "lucide-react-native";
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useActivities } from "../../hooks/useActivities";
import { useIconBlobMap } from "../../hooks/useIconBlobMap";
import { ActivityIcon } from "../common/ActivityIcon";
import { LogFormBody } from "../common/LogFormBody";
import { ModalScrollContext } from "../common/ModalOverlay";
import { OverlayPortal } from "../common/overlayPortal";
import { ActivitySelectOverlay } from "./ActivitySelectOverlay";

type Activity = {
  id: string;
  name: string;
  emoji: string;
  iconType?: "emoji" | "upload" | "generate";
  iconUrl?: string | null;
  iconThumbnailUrl?: string | null;
  quantityUnit: string;
  recordingMode: string;
  recordingModeConfig?: string | null;
};

type CreateLogDialogProps = {
  visible: boolean;
  onClose: () => void;
  date: string;
};

export function CreateLogDialog({
  visible,
  onClose,
  date,
}: CreateLogDialogProps) {
  const { activities } = useActivities();
  const iconBlobMap = useIconBlobMap();
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null,
  );
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollToEnd = useCallback(() => {
    setTimeout(
      () => scrollViewRef.current?.scrollToEnd({ animated: true }),
      100,
    );
  }, []);

  const handleClose = () => {
    setSelectedActivity(null);
    onClose();
  };

  // Handle Android hardware back button
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      handleClose();
      return true;
    });
    return () => sub.remove();
  }, [visible]);

  if (!visible) return null;

  // Step 2: Show LogFormBody for selected activity
  if (selectedActivity) {
    return (
      <OverlayPortal>
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.select({
            ios: "padding",
            android: "padding",
            default: undefined,
          })}
        >
          <Pressable
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: "rgba(28,25,23,0.35)" },
            ]}
            onPress={handleClose}
          />
          <View
            className="flex-1 justify-center items-center p-4"
            pointerEvents="box-none"
          >
            <View
              className="bg-white dark:bg-gray-800 rounded-2xl w-full max-h-[85%]"
              style={{
                maxWidth: 448,
                shadowColor: "#1c1917",
                shadowOffset: { width: 0, height: 16 },
                shadowOpacity: 0.16,
                shadowRadius: 48,
                elevation: 24,
              }}
            >
              <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
                <View className="flex-row items-center gap-2">
                  <TouchableOpacity
                    onPress={() => setSelectedActivity(null)}
                    className="p-1"
                    accessibilityRole="button"
                    accessibilityLabel="Back to activity selection"
                  >
                    <ChevronLeft size={20} color="#374151" />
                  </TouchableOpacity>
                  <ActivityIcon
                    iconType={selectedActivity.iconType}
                    emoji={selectedActivity.emoji || "\u{1f4dd}"}
                    iconBlob={iconBlobMap.get(selectedActivity.id)}
                    iconUrl={selectedActivity.iconUrl}
                    iconThumbnailUrl={selectedActivity.iconThumbnailUrl}
                    size={24}
                    fontSize="text-xl"
                  />
                  <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {selectedActivity.name}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleClose}
                  className="p-1.5 rounded-lg"
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <X size={20} color="#78716c" />
                </TouchableOpacity>
              </View>
              <ModalScrollContext.Provider value={{ scrollToEnd }}>
                <ScrollView
                  ref={scrollViewRef}
                  className="px-5 py-4"
                  style={{ flexShrink: 1 }}
                  keyboardShouldPersistTaps="handled"
                >
                  <LogFormBody
                    activity={selectedActivity}
                    date={date}
                    onDone={handleClose}
                  />
                </ScrollView>
              </ModalScrollContext.Provider>
            </View>
          </View>
        </KeyboardAvoidingView>
      </OverlayPortal>
    );
  }

  // Step 1: Activity selection
  return (
    <ActivitySelectOverlay
      activities={activities}
      iconBlobMap={iconBlobMap}
      onSelect={setSelectedActivity}
      onClose={handleClose}
    />
  );
}
