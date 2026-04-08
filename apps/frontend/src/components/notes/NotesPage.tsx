import { useTranslation } from "@packages/i18n";
import { useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { FormButton } from "../common/FormButton";
import { NoteCard } from "./NoteCard";
import { useNotesPage } from "./useNotesPage";

export function NotesPage() {
  const {
    notes,
    deleteConfirmId,
    setDeleteConfirmId,
    getActivityName,
    handleDelete,
  } = useNotesPage();
  const { t } = useTranslation("note");
  const navigate = useNavigate();

  return (
    <div className="bg-white dark:bg-gray-900 min-h-full">
      <div className="sticky top-0 sticky-header z-10">
        <div className="flex items-center justify-between px-4 pr-14 h-12">
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {t("page.title")}
          </h1>
          <button
            type="button"
            onClick={() =>
              navigate({ to: "/notes/$noteId", params: { noteId: "new" } })
            }
            className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label={t("page.createNote")}
          >
            <Plus size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      <div className="p-4">
        {notes.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {t("page.empty")}
            </p>
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

        {notes.length > 0 && (
          <div className="space-y-3">
            {notes.map((note) => (
              <div
                key={note.id}
                className={`rounded-xl p-4 shadow-sm ${
                  note._syncStatus === "pending"
                    ? "border border-amber-200 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/20"
                    : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
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
      <p className="text-sm text-red-600 dark:text-red-400 font-medium">
        {t("delete.inline")}
      </p>
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
