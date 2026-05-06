import { useMemo, useState } from "react";

import { NOTE_SECTION_ORDER } from "@packages/frontend-shared/utils";
import { useTranslation } from "@packages/i18n";
import { useRouter } from "expo-router";
import { Plus, Search } from "lucide-react-native";
import {
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { syncEngine } from "../../sync/syncEngine";
import { mobileTestIds } from "../../testing/testIds";
import { NoteCard } from "./NoteCard";
import { NoteDeleteConfirmDialog } from "./NoteDeleteConfirmDialog";
import { NotesActivityFilter } from "./NotesActivityFilter";
import { NotesSearchBar } from "./NotesSearchBar";
import { useNotesPage } from "./useNotesPage";

export function NotesPage() {
  const [refreshing, setRefreshing] = useState(false);
  const {
    deleteConfirmId,
    setDeleteConfirmId,
    getActivityName,
    handleDelete,
    searchText,
    setSearchText,
    selectedActivityId,
    setSelectedActivityId,
    groupedNotes,
    hasActiveFilter,
    totalCount,
    isSearchOpen,
    toggleSearch,
    clearSearch,
    filterActivities,
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

  const noteForDeleteConfirm = useMemo(() => {
    if (!deleteConfirmId) return null;
    for (const section of NOTE_SECTION_ORDER) {
      const found = groupedNotes[section].find((n) => n.id === deleteConfirmId);
      if (found) return found;
    }
    return null;
  }, [deleteConfirmId, groupedNotes]);

  const showInitialEmpty = totalCount === 0;
  const showFilteredEmpty =
    !showInitialEmpty &&
    NOTE_SECTION_ORDER.every((s) => groupedNotes[s].length === 0);

  return (
    <View
      className="flex-1 bg-white dark:bg-gray-800"
      testID={mobileTestIds.notes.page}
    >
      <View className="flex-row items-center justify-between pl-4 pr-16 h-12 border-b border-gray-100 dark:border-gray-800">
        <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
          {t("page.title")}
        </Text>
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={toggleSearch}
            className="p-2"
            hitSlop={{ top: 3, bottom: 3, left: 3, right: 3 }}
            accessibilityRole="button"
            accessibilityLabel={
              isSearchOpen ? t("list.search.close") : t("list.search.open")
            }
            testID={mobileTestIds.notes.searchToggle}
          >
            <Search size={20} color={isSearchOpen ? "#111827" : "#6b7280"} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/notes/new")}
            className="p-2"
            hitSlop={{ top: 3, bottom: 3, left: 3, right: 3 }}
            accessibilityRole="button"
            accessibilityLabel={t("page.createNote")}
            testID={mobileTestIds.notes.addButton}
          >
            <Plus size={22} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>

      {isSearchOpen && (
        <NotesSearchBar
          value={searchText}
          onChangeText={setSearchText}
          onClear={clearSearch}
        />
      )}

      {filterActivities.length > 0 && (
        <NotesActivityFilter
          activities={filterActivities}
          selectedActivityId={selectedActivityId}
          onSelect={setSelectedActivityId}
        />
      )}

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
        {showInitialEmpty && (
          <View className="items-center py-12">
            <Text className="text-gray-500 dark:text-gray-400">
              {t("page.empty")}
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/notes/new")}
              className="mt-4 px-4 py-2 bg-gray-900 dark:bg-gray-100 rounded-lg"
              accessibilityRole="button"
              accessibilityLabel={t("page.firstNote")}
              testID={mobileTestIds.notes.emptyCreateButton}
            >
              <Text className="text-white dark:text-gray-900 font-medium text-sm">
                {t("page.firstNote")}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {showFilteredEmpty && hasActiveFilter && (
          <View className="items-center py-12">
            <Text className="text-gray-500 dark:text-gray-400">
              {t("list.empty.filtered")}
            </Text>
          </View>
        )}

        {!showInitialEmpty &&
          NOTE_SECTION_ORDER.map((section) => {
            const sectionNotes = groupedNotes[section];
            if (sectionNotes.length === 0) return null;
            return (
              <View key={section} className="mb-2">
                <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-4 mb-2">
                  {t(`list.section.${section}`)}
                </Text>
                <View className="gap-3">
                  {sectionNotes.map((note) => (
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
              </View>
            );
          })}
      </ScrollView>

      {deleteConfirmId && (
        <NoteDeleteConfirmDialog
          noteTitle={noteForDeleteConfirm?.title ?? ""}
          onConfirm={() => handleDelete(deleteConfirmId)}
          onCancel={() => setDeleteConfirmId(null)}
        />
      )}
    </View>
  );
}
