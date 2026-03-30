import { useTranslation } from "@packages/i18n";
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useContactForm } from "./useContactForm";

type CategoryOption = {
  value: "bug_report" | "account_deletion" | "other";
  key:
    | "contact.categoryOptions.bug_report"
    | "contact.categoryOptions.account_deletion"
    | "contact.categoryOptions.other";
};

const CATEGORIES: CategoryOption[] = [
  { value: "bug_report", key: "contact.categoryOptions.bug_report" },
  {
    value: "account_deletion",
    key: "contact.categoryOptions.account_deletion",
  },
  { value: "other", key: "contact.categoryOptions.other" },
];

export function ContactPage() {
  const { t } = useTranslation("contact");
  const {
    email,
    category,
    body,
    isSubmitting,
    isSuccess,
    error,
    charCount,
    setEmail,
    setCategory,
    setBody,
    handleSubmit,
  } = useContactForm();

  if (isSuccess) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-2xl text-center text-green-600 dark:text-green-400 font-semibold">
          {t("contact.success")}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50 dark:bg-gray-900"
      keyboardShouldPersistTaps="handled"
    >
      <View className="px-4 pt-6 pb-10 gap-5">
        <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {t("contact.title")}
        </Text>

        {/* Email */}
        <View className="gap-1">
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("contact.email")}
          </Text>
          <TextInput
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-base text-gray-900 dark:text-gray-100"
            placeholder={t("contact.emailPlaceholder")}
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel={t("contact.email")}
          />
        </View>

        {/* Category */}
        <View className="gap-1">
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("contact.category")}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {CATEGORIES.map((item) => {
              const selected = category === item.value;
              return (
                <TouchableOpacity
                  key={item.value}
                  onPress={() => setCategory(selected ? "" : item.value)}
                  className={
                    selected
                      ? "px-3 py-2 rounded-lg bg-blue-500"
                      : "px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                  }
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={t(item.key)}
                >
                  <Text
                    className={
                      selected
                        ? "text-sm text-white font-medium"
                        : "text-sm text-gray-700 dark:text-gray-300"
                    }
                  >
                    {t(item.key)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Body */}
        <View className="gap-1">
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("contact.body")}
          </Text>
          <TextInput
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-base text-gray-900 dark:text-gray-100 min-h-32"
            placeholder={t("contact.bodyPlaceholder")}
            placeholderTextColor="#9ca3af"
            value={body}
            onChangeText={(v) => setBody(v.slice(0, 1000))}
            multiline
            textAlignVertical="top"
            accessibilityLabel={t("contact.body")}
          />
          <Text className="text-xs text-gray-400 dark:text-gray-500 text-right">
            {t("contact.charCount", { count: charCount })}
          </Text>
        </View>

        {/* Error */}
        {error ? (
          <Text className="text-sm text-red-500 dark:text-red-400">
            {error}
          </Text>
        ) : null}

        {/* Submit */}
        <TouchableOpacity
          className={
            isSubmitting
              ? "bg-blue-300 dark:bg-blue-800 rounded-xl py-4 items-center"
              : "bg-blue-500 rounded-xl py-4 items-center"
          }
          onPress={handleSubmit}
          disabled={isSubmitting}
          accessibilityRole="button"
          accessibilityLabel={
            isSubmitting ? t("contact.submitting") : t("contact.submit")
          }
        >
          <Text className="text-base font-semibold text-white">
            {isSubmitting ? t("contact.submitting") : t("contact.submit")}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
