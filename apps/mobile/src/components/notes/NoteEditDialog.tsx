import { useState } from "react";

import type { NoteRecord } from "@packages/domain/note/noteRecord";
import type { Syncable } from "@packages/domain/sync/syncableRecord";
import { useTranslation } from "@packages/i18n";
import { Pressable, Text, View } from "react-native";

import { FormButton } from "../common/FormButton";
import { FormInput } from "../common/FormInput";
import { FormTextarea } from "../common/FormTextarea";
import { ModalOverlay } from "../common/ModalOverlay";
import { MarkdownPreview } from "./MarkdownPreview";
import { useNoteEditDialog } from "./useNoteEditDialog";

export function NoteEditDialog({
  note,
  onClose,
  onSuccess,
  onDelete,
}: {
  note: Syncable<NoteRecord>;
  onClose: () => void;
  onSuccess: () => void;
  onDelete: (id: string) => void;
}) {
  const { title, setTitle, content, setContent, isSubmitting, handleSave } =
    useNoteEditDialog(note, onSuccess);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const { t } = useTranslation("note");

  return (
    <ModalOverlay
      visible
      onClose={onClose}
      title={t("edit.title")}
      footer={
        <View className="flex-row gap-2">
          <FormButton
            variant="danger"
            label={t("edit.delete")}
            onPress={() => onDelete(note.id)}
            className="flex-1"
          />
          <FormButton
            variant="primary"
            label={isSubmitting ? t("edit.submitting") : t("edit.submit")}
            onPress={handleSave}
            disabled={isSubmitting || !title.trim()}
            className="flex-1"
          />
        </View>
      }
    >
      <View className="gap-4 pb-4">
        <View>
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t("create.label.title")}{" "}
            <Text className="text-red-500 dark:text-red-400">*</Text>
          </Text>
          <FormInput
            value={title}
            onChangeText={setTitle}
            placeholder={t("create.placeholder.title")}
            autoFocus
            accessibilityLabel={t("create.label.title")}
          />
        </View>

        <View>
          <View className="flex-row items-center mb-1">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("create.label.content")}
            </Text>
            <View className="flex-row ml-auto rounded-lg bg-gray-100 dark:bg-gray-700 p-0.5">
              <Pressable
                onPress={() => setActiveTab("edit")}
                className={`px-2.5 py-1 rounded-md ${
                  activeTab === "edit"
                    ? "bg-white dark:bg-gray-600 shadow-sm"
                    : ""
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    activeTab === "edit"
                      ? "text-gray-900 dark:text-gray-100"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {t("tab.edit")}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setActiveTab("preview")}
                className={`px-2.5 py-1 rounded-md ${
                  activeTab === "preview"
                    ? "bg-white dark:bg-gray-600 shadow-sm"
                    : ""
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    activeTab === "preview"
                      ? "text-gray-900 dark:text-gray-100"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {t("tab.preview")}
                </Text>
              </Pressable>
            </View>
          </View>
          {activeTab === "edit" ? (
            <FormTextarea
              value={content}
              onChangeText={setContent}
              placeholder={t("create.placeholder.contentMobile")}
              numberOfLines={6}
              style={{ textAlignVertical: "top", minHeight: 120 }}
              accessibilityLabel={t("create.label.content")}
            />
          ) : (
            <View className="border border-gray-200 dark:border-gray-600 rounded-xl p-3 min-h-[120px] bg-gray-50 dark:bg-gray-800">
              <MarkdownPreview content={content} />
            </View>
          )}
        </View>
      </View>
    </ModalOverlay>
  );
}
