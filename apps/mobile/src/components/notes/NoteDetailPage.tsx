import { useTranslation } from "@packages/i18n";
import { ArrowLeft } from "lucide-react-native";
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FormButton } from "../common/FormButton";
import { MarkdownPreview } from "./MarkdownPreview";
import { NoteDetailFab } from "./NoteDetailFab";
import { NoteDiscardConfirmInline, NoteNotFound } from "./NoteDetailStates";
import { NoteSettingsPanel } from "./NoteSettingsPanel";
import { useNoteDetailPage } from "./useNoteDetailPage";

export function NoteDetailPage() {
  const { t } = useTranslation("note");
  const insets = useSafeAreaInsets();
  const {
    isNew,
    isLoading,
    notFound,
    mode,
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
    enterEditMode,
    togglePreview,
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
        className="flex-1 bg-white dark:bg-gray-900 items-center justify-center"
        style={{ paddingTop: insets.top }}
      >
        <Text className="text-gray-400 dark:text-gray-500 text-sm">
          {t("detail.loading")}
        </Text>
      </View>
    );
  }

  if (notFound) {
    return <NoteNotFound onBack={handleBack} topInset={insets.top} />;
  }

  return (
    <View
      className="flex-1 bg-white dark:bg-gray-900"
      style={{ paddingTop: insets.top }}
    >
      <View className="flex-row items-center px-2 h-12 border-b border-gray-100 dark:border-gray-800">
        <TouchableOpacity
          onPress={handleBack}
          className="p-2 mr-1"
          hitSlop={{ top: 3, bottom: 3, left: 3, right: 3 }}
          accessibilityRole="button"
          accessibilityLabel={t("detail.back")}
        >
          <ArrowLeft size={22} color="#6b7280" />
        </TouchableOpacity>

        <Text
          className="flex-1 text-base font-semibold text-gray-900 dark:text-gray-100"
          numberOfLines={1}
        >
          {headerTitle}
        </Text>

        {mode !== "view" && (
          <View className="ml-2">
            <FormButton
              variant="primary"
              label={isSubmitting ? t("detail.saving") : t("detail.save")}
              onPress={handleSave}
              disabled={!canSave}
              className="px-4 py-1.5"
            />
          </View>
        )}
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

      <View className="flex-1">
        {mode === "view" && (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{
              padding: 16,
              paddingBottom: 80 + insets.bottom,
            }}
          >
            <MarkdownPreview content={content} />
          </ScrollView>
        )}

        {mode === "edit" && (
          <ScrollView
            className="flex-1"
            automaticallyAdjustKeyboardInsets
            keyboardDismissMode="interactive"
            contentContainerStyle={{ flexGrow: 1 }}
          >
            <TextInput
              className="flex-1 px-4 py-3 text-base text-gray-900 dark:text-gray-100"
              value={content}
              onChangeText={setContent}
              multiline
              scrollEnabled={false}
              textAlignVertical="top"
              placeholder={t("create.placeholder.contentMobile")}
              placeholderTextColor="#9ca3af"
              style={{ paddingBottom: 80 + insets.bottom }}
            />
          </ScrollView>
        )}

        {mode === "preview" && (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{
              padding: 16,
              paddingBottom: 80 + insets.bottom,
            }}
          >
            <MarkdownPreview content={content} />
          </ScrollView>
        )}
      </View>

      <NoteDetailFab
        mode={mode}
        onEditPress={enterEditMode}
        onPreviewToggle={togglePreview}
        onSettingsToggle={toggleSettings}
        bottomInset={insets.bottom}
      />
    </View>
  );
}
