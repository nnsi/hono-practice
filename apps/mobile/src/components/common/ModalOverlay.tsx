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
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ backgroundColor: "rgba(28,25,23,0.35)" }}
      >
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
                {typeof title === "string" ? (
                  <Text className="text-lg font-bold text-gray-900">
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
                >
                  <X size={20} color="#78716c" />
                </TouchableOpacity>
              </View>
              <ScrollView
                className="px-5 py-4"
                style={{ flexShrink: 1 }}
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
    </Modal>
  );
}
