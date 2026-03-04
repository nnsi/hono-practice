import {
  privacyPolicySections,
  privacyPolicyTitle,
  termsOfServiceSections,
  termsOfServiceTitle,
} from "@packages/frontend-shared";
import { Text, View } from "react-native";

import { ModalOverlay } from "./ModalOverlay";

type LegalModalProps = {
  visible: boolean;
  type: "privacy" | "terms";
  onClose: () => void;
};

export function LegalModal({ visible, type, onClose }: LegalModalProps) {
  const title = type === "privacy" ? privacyPolicyTitle : termsOfServiceTitle;
  const sections =
    type === "privacy" ? privacyPolicySections : termsOfServiceSections;

  return (
    <ModalOverlay visible={visible} onClose={onClose} title={title}>
      <View className="space-y-4">
        {sections.map((section) => (
          <View key={section.title} className="mb-4">
            <Text className="font-semibold text-sm text-gray-900 mb-1">
              {section.title}
            </Text>
            <Text className="text-sm text-gray-600 leading-relaxed">
              {section.content}
            </Text>
          </View>
        ))}
      </View>
    </ModalOverlay>
  );
}
