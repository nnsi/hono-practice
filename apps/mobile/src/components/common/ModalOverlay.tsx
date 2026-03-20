import { useEffect } from "react";

import { X } from "lucide-react-native";
import {
  BackHandler,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { OverlayPortal } from "./overlayPortal";

type ModalOverlayProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function ModalOverlay({
  visible,
  onClose,
  title,
  children,
  footer,
}: ModalOverlayProps) {
  // Handle Android hardware back button (replaces Modal's onRequestClose)
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <OverlayPortal>
      <KeyboardAvoidingView className="flex-1" behavior="padding">
        <View className="flex-1">
          <Pressable
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: "rgba(28,25,23,0.35)" },
            ]}
            onPress={onClose}
          />
          <View
            className="flex-1 justify-center items-center p-4"
            pointerEvents="box-none"
          >
            <View
              className="bg-white rounded-2xl w-full max-h-[85%]"
              style={{
                maxWidth: 448,
                shadowColor: "#1c1917",
                shadowOffset: { width: 0, height: 16 },
                shadowOpacity: 0.16,
                shadowRadius: 48,
                elevation: 24,
              }}
            >
              <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-200">
                <Text className="text-lg font-bold text-gray-900">{title}</Text>
                <TouchableOpacity
                  onPress={onClose}
                  className="p-1.5 rounded-lg"
                  activeOpacity={0.7}
                >
                  <X size={20} color="#78716c" />
                </TouchableOpacity>
              </View>
              <ScrollView
                className="px-5 py-4"
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
              >
                {children}
              </ScrollView>
              {footer && (
                <View className="px-5 py-4 border-t border-gray-200">
                  {footer}
                </View>
              )}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </OverlayPortal>
  );
}
