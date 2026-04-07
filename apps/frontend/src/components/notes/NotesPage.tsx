import { useTranslation } from "@packages/i18n";
import { useNavigate } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";

import { FormButton } from "../common/FormButton";
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
    <div className="bg-white min-h-full">
      <div className="sticky top-0 sticky-header z-10">
        <div className="flex items-center justify-between px-4 pr-14 h-12">
          <h1 className="text-lg font-bold text-gray-900">{t("page.title")}</h1>
          <button
            type="button"
            onClick={() =>
              navigate({ to: "/notes/$noteId", params: { noteId: "new" } })
            }
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Plus size={20} className="text-gray-600" />
          </button>
        </div>
      </div>

      <div className="p-4">
        {notes.length === 0 && (
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

        {notes.length > 0 && (
          <div className="space-y-3">
            {notes.map((note) => (
              <div
                key={note.id}
                className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
              >
                {deleteConfirmId === note.id ? (
                  <DeleteConfirmInline
                    onConfirm={() => handleDelete(note.id)}
                    onCancel={() => setDeleteConfirmId(null)}
                  />
                ) : (
                  <NoteCardContent
                    title={note.title}
                    content={note.content}
                    updatedAt={note.updatedAt}
                    activityName={getActivityName(note.activityId)}
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

function NoteCardContent({
  title,
  content,
  updatedAt,
  activityName,
  onClick,
  onDelete,
}: {
  title: string;
  content: string;
  updatedAt: string;
  activityName: string | null;
  onClick: () => void;
  onDelete: () => void;
}) {
  const preview = content.length > 50 ? `${content.slice(0, 50)}...` : content;
  const formattedDate = new Date(updatedAt).toLocaleDateString();

  return (
    <div className="flex items-start justify-between gap-2">
      <button
        type="button"
        onClick={onClick}
        className="flex-1 min-w-0 text-left"
      >
        <h3 className="font-semibold text-gray-900 truncate">{title}</h3>
        {preview && (
          <p className="text-sm text-gray-500 mt-1 truncate">{preview}</p>
        )}
        <div className="flex items-center gap-2 mt-1.5">
          <p className="text-xs text-gray-400">{formattedDate}</p>
          {activityName && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
              {activityName}
            </span>
          )}
        </div>
      </button>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={onDelete}
          className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 size={16} className="text-gray-400" />
        </button>
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
