import type { LegalType } from "@packages/frontend-shared/legal";
import { getLegalContent } from "@packages/frontend-shared/legal";
import { useTranslation } from "@packages/i18n";
import { Text, View } from "react-native";

import { ModalOverlay } from "./ModalOverlay";

const CONTACT_EMAIL = process.env.EXPO_PUBLIC_CONTACT_EMAIL || "";

type LegalModalProps = {
  visible: boolean;
  type: LegalType;
  onClose: () => void;
};

export function LegalModal({ visible, type, onClose }: LegalModalProps) {
  const { i18n } = useTranslation();
  const { title, sections } = getLegalContent(type, i18n.language, {
    contactEmail: CONTACT_EMAIL,
  });

  return (
    <ModalOverlay visible={visible} onClose={onClose} title={title}>
      <View className="space-y-4">
        {sections.map((section) => (
          <View key={section.title} className="mb-4">
            <Text className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-1">
              {section.title}
            </Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {section.content}
            </Text>
          </View>
        ))}
      </View>
    </ModalOverlay>
  );
}
