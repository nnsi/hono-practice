import { NOTE_SECTION_ORDER } from "@packages/frontend-shared/utils/noteGrouping";
import { useTranslation } from "@packages/i18n";
import { useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { FormButton } from "../common/FormButton";
import { NoteCard } from "./NoteCard";
import { NotesActivityFilter } from "./NotesActivityFilter";
import { NotesSearchBar } from "./NotesSearchBar";
import { useNotesPage } from "./useNotesPage";

export function NotesPage() {
  const {
    totalCount,
    groupedNotes,
    hasActiveFilter,
    searchText,
    setSearchText,
    selectedActivityId,
    setSelectedActivityId,
    filterActivities,
    deleteConfirmId,
    setDeleteConfirmId,
    getActivityName,
    handleDelete,
  } = useNotesPage();
  const { t } = useTranslation("note");
  const navigate = useNavigate();

  const isEmptyOverall = totalCount === 0;
  const filteredCount = NOTE_SECTION_ORDER.reduce(
    (acc, section) => acc + groupedNotes[section].length,
    0,
  );
  const isEmptyFiltered =
    !isEmptyOverall && hasActiveFilter && filteredCount === 0;

  return (
    <div className="bg-white min-h-full">
      <div className="sticky top-0 sticky-header z-10">
        <div className="flex items-center justify-between px-4 pr-14 h-12">
          <h1 className="text-lg font-bold text-gray-900">{t("page.title")}</h1>
          <button
            type="button"
            onClick={() =>
              navigate({ to: "/notes/$noteId", params: { noteId: "new" } })
            }
            className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
            aria-label={t("page.createNote")}
          >
            <Plus size={20} className="text-gray-600" />
          </button>
        </div>
      </div>

      {!isEmptyOverall && (
        <div className="px-4 pt-3 pb-2 space-y-2">
          <NotesSearchBar value={searchText} onChange={setSearchText} />
          {filterActivities.length > 0 && (
            <NotesActivityFilter
              activities={filterActivities}
              selectedActivityId={selectedActivityId}
              onSelect={setSelectedActivityId}
            />
          )}
        </div>
      )}

      <div className="p-4">
        {isEmptyOverall && (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">{t("page.empty")}</p>
            <button
              type="button"
              onClick={() =>
                navigate({ to: "/notes/$noteId", params: { noteId: "new" } })
              }
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
            >
              {t("page.firstNote")}
            </button>
          </div>
        )}

        {isEmptyFiltered && (
          <div className="text-center py-12">
            <p className="text-gray-500">{t("list.empty.filtered")}</p>
          </div>
        )}

        {!isEmptyOverall && !isEmptyFiltered && (
          <div className="space-y-4">
            {NOTE_SECTION_ORDER.map((section) => {
              const items = groupedNotes[section];
              if (items.length === 0) return null;
              return (
                <section key={section} className="space-y-3">
                  <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-2 mb-1">
                    {t(`list.section.${section}`)}
                  </h2>
                  <div className="space-y-3">
                    {items.map((note) => (
                      <div
                        key={note.id}
                        className={`rounded-xl p-4 shadow-sm ${
                          note._syncStatus === "pending"
                            ? "border border-amber-200 bg-amber-50/50"
                            : "bg-white border border-gray-200"
                        }`}
                      >
                        {deleteConfirmId === note.id ? (
                          <DeleteConfirmInline
                            onConfirm={() => handleDelete(note.id)}
                            onCancel={() => setDeleteConfirmId(null)}
                          />
                        ) : (
                          <NoteCard
                            title={note.title}
                            content={note.content}
                            updatedAt={note.updatedAt}
                            activityName={getActivityName(note.activityId)}
                            syncStatus={note._syncStatus}
                            onClick={() =>
                              navigate({
                                to: "/notes/$noteId",
                                params: { noteId: note.id },
                              })
                            }
                            onDelete={() => setDeleteConfirmId(note.id)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function DeleteConfirmInline({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation("note");

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-red-600 font-medium">{t("delete.inline")}</p>
      <div className="flex gap-2">
        <FormButton
          variant="secondary"
          label={t("delete.cancel")}
          onClick={onCancel}
          className="px-3 text-xs"
        />
        <FormButton
          variant="dangerConfirm"
          label={t("delete.confirm")}
          onClick={onConfirm}
          className="px-3 text-xs"
        />
      </div>
    </div>
  );
}
