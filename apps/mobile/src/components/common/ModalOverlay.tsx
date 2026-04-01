import { createContext, useCallback, useContext, useRef } from "react";

import { X } from "lucide-react-native";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useThemeContext } from "../../contexts/ThemeContext";

type ModalScrollContextType = { scrollToEnd: () => void };
export const ModalScrollContext = createContext<ModalScrollContextType>({
  scrollToEnd: () => {},
});
export function useModalScroll() {
  return useContext(ModalScrollContext);
}

type ModalOverlayProps = {
  visible: boolean;
  onClose: () => void;
  title: string | React.ReactNode;
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
  const { colors } = useThemeContext();
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollToEnd = useCallback(() => {
    setTimeout(
      () => scrollViewRef.current?.scrollToEnd({ animated: true }),
      100,
    );
  }, []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      accessibilityViewIsModal={true}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.select({
          ios: "padding",
          android: "padding",
          default: undefined,
        })}
        style={{ backgroundColor: colors.modalOverlay }}
      >
        <View className="flex-1">
          <Pressable
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: colors.modalOverlay },
            ]}
            onPress={onClose}
          />
          <View
            className="flex-1 justify-center items-center p-4"
            pointerEvents="box-none"
          >
            <View
              className="bg-white dark:bg-gray-800 rounded-2xl w-full max-h-[85%]"
              style={{
                maxWidth: 448,
                shadowColor: colors.shadowColor,
                shadowOffset: { width: 0, height: 16 },
                shadowOpacity: 0.16,
                shadowRadius: 48,
                elevation: 24,
              }}
            >
              <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
                {typeof title === "string" ? (
                  <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {title}
                  </Text>
                ) : (
                  <View className="flex-row items-center gap-2 flex-1 min-w-0">
                    {title}
                  </View>
                )}
                <TouchableOpacity
                  onPress={onClose}
                  className="p-1.5 rounded-lg"
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={20} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>
              <ModalScrollContext.Provider value={{ scrollToEnd }}>
                <ScrollView
                  ref={scrollViewRef}
                  className="px-5 pt-4"
                  contentContainerStyle={{ paddingBottom: 16 }}
                  style={{ flexShrink: 1 }}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="interactive"
                  automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
                >
                  {children}
                </ScrollView>
              </ModalScrollContext.Provider>
              {footer && (
                <View className="px-5 py-4 border-t border-gray-200 dark:border-gray-700">
                  {footer}
                </View>
              )}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
