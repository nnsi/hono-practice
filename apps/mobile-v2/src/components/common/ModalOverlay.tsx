import { Modal, View, Text, TouchableOpacity, ScrollView } from "react-native";
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
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View
        className="flex-1 justify-end"
        style={{ backgroundColor: "rgba(28,25,23,0.35)" }}
      >
        <View className="bg-white rounded-t-2xl max-h-[85%]">
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
            <Text className="text-lg font-bold text-gray-900">{title}</Text>
            <TouchableOpacity onPress={onClose} className="p-2">
              <X size={20} color="#78716c" />
            </TouchableOpacity>
          </View>
          <ScrollView className="px-4 py-3">{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}
