import type { LegalType } from "@packages/frontend-shared/legal";
import { getLegalContent } from "@packages/frontend-shared/legal";
import { useTranslation } from "@packages/i18n";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";

import { ModalOverlay } from "./ModalOverlay";

const CONTACT_EMAIL = process.env.EXPO_PUBLIC_CONTACT_EMAIL || "";
const CONTACT_PATH = "/contact";

type LegalModalProps = {
  visible: boolean;
  type: LegalType;
  onClose: () => void;
};

export function LegalModal({ visible, type, onClose }: LegalModalProps) {
  const { i18n } = useTranslation();
  const router = useRouter();
  const { title, sections } = getLegalContent(type, i18n.language, {
    contactEmail: CONTACT_EMAIL,
    contactUrl: CONTACT_PATH,
  });

  const handleContactPress = () => {
    onClose();
    router.push("/(tabs)/contact");
  };

  const renderContent = (content: string) => {
    const idx = content.indexOf(CONTACT_PATH);
    if (idx === -1) {
      return (
        <Text className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          {content}
        </Text>
      );
    }
    const before = content.slice(0, idx);
    const after = content.slice(idx + CONTACT_PATH.length);
    return (
      <Text className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
        {before}
        <Text
          onPress={handleContactPress}
          className="text-blue-500 dark:text-blue-400 underline"
        >
          {CONTACT_PATH}
        </Text>
        {after}
      </Text>
    );
  };

  return (
    <ModalOverlay visible={visible} onClose={onClose} title={title}>
      <View className="space-y-4">
        {sections.map((section) => (
          <View key={section.title} className="mb-4">
            <Text className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-1">
              {section.title}
            </Text>
            {renderContent(section.content)}
          </View>
        ))}
      </View>
    </ModalOverlay>
  );
}
