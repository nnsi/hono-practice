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
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-2xl max-h-[85%]">
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
            <Text className="text-lg font-bold text-gray-800">{title}</Text>
            <TouchableOpacity onPress={onClose} className="p-2">
              <X size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>
          <ScrollView className="px-4 py-3">{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}
