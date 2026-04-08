import { useState } from "react";

import { useTranslation } from "@packages/i18n";
import { useRouter } from "expo-router";
import { Plus } from "lucide-react-native";
import {
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { syncEngine } from "../../sync/syncEngine";
import { NoteCard } from "./NoteCard";
import { NoteDeleteConfirmDialog } from "./NoteDeleteConfirmDialog";
import { useNotesPage } from "./useNotesPage";

export function NotesPage() {
  const [refreshing, setRefreshing] = useState(false);
  const {
    notes,
    deleteConfirmId,
    setDeleteConfirmId,
    getActivityName,
    handleDelete,
  } = useNotesPage();
  const { t } = useTranslation("note");
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await syncEngine.syncAll();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View className="flex-1 bg-white dark:bg-gray-800">
      <View className="flex-row items-center justify-between pl-4 pr-16 h-12 border-b border-gray-100 dark:border-gray-800">
        <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
          {t("page.title")}
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/notes/new")}
          className="p-2"
          hitSlop={{ top: 3, bottom: 3, left: 3, right: 3 }}
          accessibilityRole="button"
          accessibilityLabel={t("page.createNote")}
        >
          <Plus size={22} color="#6b7280" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 80 + insets.bottom,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {notes.length === 0 && (
          <View className="items-center py-12">
            <Text className="text-gray-500 dark:text-gray-400">
              {t("page.empty")}
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/notes/new")}
              className="mt-4 px-4 py-2 bg-gray-900 dark:bg-gray-100 rounded-lg"
              accessibilityRole="button"
              accessibilityLabel={t("page.firstNote")}
            >
              <Text className="text-white dark:text-gray-900 font-medium text-sm">
                {t("page.firstNote")}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View className="gap-3">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              title={note.title}
              content={note.content}
              updatedAt={note.updatedAt}
              activityName={getActivityName(note.activityId)}
              syncStatus={note._syncStatus}
              onPress={() => router.push(`/notes/${note.id}`)}
              onDelete={() => setDeleteConfirmId(note.id)}
            />
          ))}
        </View>
      </ScrollView>

      {deleteConfirmId && (
        <NoteDeleteConfirmDialog
          noteTitle={notes.find((n) => n.id === deleteConfirmId)?.title || ""}
          onConfirm={() => handleDelete(deleteConfirmId)}
          onCancel={() => setDeleteConfirmId(null)}
        />
      )}
    </View>
  );
}
