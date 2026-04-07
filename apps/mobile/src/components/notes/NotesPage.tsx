import { useState } from "react";

import { useTranslation } from "@packages/i18n";
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
import { NoteCreateDialog } from "./NoteCreateDialog";
import { NoteDeleteConfirmDialog } from "./NoteDeleteConfirmDialog";
import { NoteEditDialog } from "./NoteEditDialog";
import { useNotesPage } from "./useNotesPage";

export function NotesPage() {
  const [refreshing, setRefreshing] = useState(false);
  const {
    notes,
    createDialogOpen,
    setCreateDialogOpen,
    editingNote,
    setEditingNote,
    deleteConfirmId,
    setDeleteConfirmId,
    getActivityName,
    handleDelete,
    handleCreateSuccess,
    handleEditSuccess,
  } = useNotesPage();
  const { t } = useTranslation("note");

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
      <View className="flex-row items-center justify-between px-4 h-12 border-b border-gray-100 dark:border-gray-800">
        <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
          {t("page.title")}
        </Text>
        <TouchableOpacity
          onPress={() => setCreateDialogOpen(true)}
          className="p-2"
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
              onPress={() => setCreateDialogOpen(true)}
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
              onEdit={() => setEditingNote(note)}
              onDelete={() => setDeleteConfirmId(note.id)}
            />
          ))}
        </View>
      </ScrollView>

      {createDialogOpen && (
        <NoteCreateDialog
          onClose={() => setCreateDialogOpen(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {editingNote && (
        <NoteEditDialog
          note={editingNote}
          onClose={() => setEditingNote(null)}
          onSuccess={handleEditSuccess}
          onDelete={(id) => {
            setEditingNote(null);
            setDeleteConfirmId(id);
          }}
        />
      )}

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
