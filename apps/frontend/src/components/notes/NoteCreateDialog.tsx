import { useState } from "react";

import { useTranslation } from "@packages/i18n";
import { X } from "lucide-react";

import { FormButton } from "../common/FormButton";
import { FormInput } from "../common/FormInput";
import { FormTextarea } from "../common/FormTextarea";
import { ModalOverlay } from "../common/ModalOverlay";
import { MarkdownPreview } from "./MarkdownPreview";
import { NoteActivitySelect } from "./NoteActivitySelect";
import { useNoteCreateDialog } from "./useNoteCreateDialog";

export function NoteCreateDialog({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const {
    title,
    setTitle,
    content,
    setContent,
    activityId,
    setActivityId,
    activities,
    isSubmitting,
    handleSubmit,
  } = useNoteCreateDialog(onSuccess);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const { t } = useTranslation("note");

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white w-full max-w-md rounded-2xl shadow-modal p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{t("create.title")}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("create.label.title")} <span className="text-red-500">*</span>
            </label>
            <FormInput
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("create.placeholder.title")}
            />
          </div>

          <div>
            <div className="flex items-center gap-1 mb-1">
              <label className="text-sm font-medium text-gray-700">
                {t("create.label.content")}
              </label>
              <div className="flex ml-auto rounded-lg bg-gray-100 p-0.5">
                <button
                  type="button"
                  onClick={() => setActiveTab("edit")}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                    activeTab === "edit"
                      ? "text-gray-900 bg-white shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {t("tab.edit")}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("preview")}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                    activeTab === "preview"
                      ? "text-gray-900 bg-white shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {t("tab.preview")}
                </button>
              </div>
            </div>
            {activeTab === "edit" ? (
              <FormTextarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t("create.placeholder.content")}
                rows={6}
              />
            ) : (
              <div className="border border-gray-200 rounded-xl p-3 min-h-[156px] bg-gray-50">
                <MarkdownPreview content={content} />
              </div>
            )}
          </div>

          <NoteActivitySelect
            activityId={activityId}
            activities={activities}
            onChange={setActivityId}
          />

          <div className="flex gap-2 pt-2">
            <FormButton
              variant="secondary"
              label={t("create.cancel")}
              onClick={onClose}
              className="flex-1"
            />
            <FormButton
              type="submit"
              variant="primary"
              label={isSubmitting ? t("create.submitting") : t("create.submit")}
              disabled={isSubmitting || !title.trim()}
              className="flex-1"
            />
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}
