import { useState } from "react";

import { useTranslation } from "@packages/i18n";
import { ArrowLeft, Check, Copy } from "lucide-react-native";
import {
  Clipboard,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { mobileTestIds } from "../../testing/testIds";
import { FormButton } from "../common/FormButton";
import { NoteDetailFab } from "./NoteDetailFab";
import { NoteDiscardConfirmInline, NoteNotFound } from "./NoteDetailStates";
import { NoteRichTextEditor } from "./NoteRichTextEditor";
import { NoteSettingsPanel } from "./NoteSettingsPanel";
import { useNoteDetailPage } from "./useNoteDetailPage";

export function NoteDetailPage() {
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation("note");
  const insets = useSafeAreaInsets();
  const {
    isNew,
    isLoading,
    notFound,
    settingsOpen,
    title,
    setTitle,
    content,
    setContent,
    activityId,
    setActivityId,
    isSubmitting,
    canSave,
    showDiscardConfirm,
    activities,
    toggleSettings,
    handleSave,
    handleBack,
    confirmDiscard,
    cancelDiscard,
  } = useNoteDetailPage();

  const headerTitle = isNew
    ? t("detail.newNote")
    : title.trim() || t("detail.untitled");

  if (isLoading) {
    return (
      <View
        className="flex-1 items-center justify-center bg-white dark:bg-gray-900"
        style={{ paddingTop: insets.top }}
      >
        <Text className="text-sm text-gray-400 dark:text-gray-500">
          {t("detail.loading")}
        </Text>
      </View>
    );
  }

  if (notFound) {
    return <NoteNotFound onBack={handleBack} topInset={insets.top} />;
  }

  const handleCopyPlainText = async () => {
    try {
      if (Platform.OS === "web") {
        await navigator.clipboard.writeText(content);
      } else {
        Clipboard.setString(content);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <View
      className="flex-1 bg-white dark:bg-gray-900"
      style={{ paddingTop: insets.top }}
      testID={mobileTestIds.notes.detailPage}
    >
      <View className="flex-row items-center border-b border-gray-100 px-2 h-12 dark:border-gray-800">
        <TouchableOpacity
          onPress={handleBack}
          className="mr-1 p-2"
          hitSlop={{ top: 3, bottom: 3, left: 3, right: 3 }}
          accessibilityRole="button"
          accessibilityLabel={t("detail.back")}
          testID={mobileTestIds.notes.backButton}
        >
          <ArrowLeft size={22} color="#6b7280" />
        </TouchableOpacity>

        <Text
          className="flex-1 text-base font-semibold text-gray-900 dark:text-gray-100"
          numberOfLines={1}
        >
          {headerTitle}
        </Text>

        <View className="ml-2 flex-row items-center gap-2">
          <TouchableOpacity
            onPress={handleCopyPlainText}
            accessibilityRole="button"
            accessibilityLabel={
              copied ? t("detail.copied") : t("detail.copyPlainText")
            }
            className="h-10 w-10 items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600"
          >
            {copied ? (
              <Check size={18} color="#059669" />
            ) : (
              <Copy size={18} color="#374151" />
            )}
          </TouchableOpacity>
          <FormButton
            variant="primary"
            label={isSubmitting ? t("detail.saving") : t("detail.save")}
            onPress={handleSave}
            disabled={!canSave}
            className="px-4 py-1.5"
            testID={mobileTestIds.notes.saveButton}
          />
        </View>
      </View>

      {showDiscardConfirm && (
        <NoteDiscardConfirmInline
          onConfirm={confirmDiscard}
          onCancel={cancelDiscard}
        />
      )}

      <NoteSettingsPanel
        title={title}
        onChangeTitle={setTitle}
        activityId={activityId}
        onChangeActivityId={setActivityId}
        activities={activities}
        isOpen={settingsOpen}
      />

      <ScrollView
        className="flex-1"
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode="interactive"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 96 + insets.bottom,
        }}
      >
        <View>
          <NoteRichTextEditor
            value={content}
            onChange={setContent}
            placeholder={t("create.placeholder.contentMobile")}
          />
        </View>
      </ScrollView>

      <NoteDetailFab
        onSettingsToggle={toggleSettings}
        bottomInset={insets.bottom}
      />
    </View>
  );
}
