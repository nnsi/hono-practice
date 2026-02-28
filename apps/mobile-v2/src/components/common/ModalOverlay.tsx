import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from "react-native";
import { X } from "lucide-react-native";

type ModalOverlayProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
};

export function ModalOverlay({
  visible,
  onClose,
  title,
  children,
}: ModalOverlayProps) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 justify-center items-center p-4"
        style={{ backgroundColor: "rgba(28,25,23,0.35)" }}
        onPress={onClose}
      >
        <Pressable
          className="bg-white rounded-2xl w-full max-h-[85%]"
          style={{
            maxWidth: 448,
            shadowColor: "#1c1917",
            shadowOffset: { width: 0, height: 16 },
            shadowOpacity: 0.16,
            shadowRadius: 48,
            elevation: 24,
          }}
          onPress={() => {}}
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
          <ScrollView className="px-5 py-4">{children}</ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
