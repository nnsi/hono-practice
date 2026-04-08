import { useTranslation } from "@packages/i18n";
import { ArrowLeft, FileX } from "lucide-react";

import { FormButton } from "../common/FormButton";
import { MarkdownPreview } from "./MarkdownPreview";
import { NoteDetailFab } from "./NoteDetailFab";
import { NoteSettingsPanel } from "./NoteSettingsPanel";
import { useNoteDetailPage } from "./useNoteDetailPage";

export function NoteDetailPage() {
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
  const { t } = useTranslation("note");

  const headerTitle = (() => {
    if (isNew) return t("detail.newNote");
    if (mode === "view") return title || t("detail.untitled");
    return t("edit.title");
  })();

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-full bg-white dark:bg-gray-900 items-center justify-center">
        <p className="text-gray-400 dark:text-gray-500 text-sm">
          {t("detail.loading")}
        </p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex flex-col min-h-full bg-white dark:bg-gray-900">
        <div className="sticky top-0 z-10 sticky-header">
          <div className="flex items-center px-4 h-12">
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
            >
              <ArrowLeft size={18} />
              <span className="text-sm">{t("detail.back")}</span>
            </button>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
          <FileX size={48} className="text-gray-300 dark:text-gray-600" />
          <p className="text-gray-900 dark:text-gray-100 font-semibold">
            {t("detail.notFound")}
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {t("detail.notFoundDescription")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-10 sticky-header">
        <div className="flex items-center justify-between px-4 pr-14 h-12">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-sm">{t("detail.back")}</span>
          </button>

          <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate mx-4 flex-1 text-center">
            {headerTitle}
          </h1>

          {(mode === "edit" || mode === "preview") && (
            <FormButton
              variant="primary"
              label={isSubmitting ? t("detail.saving") : t("detail.save")}
              onClick={handleSave}
              disabled={!canSave}
              className="text-sm px-3 py-1.5 shrink-0"
            />
          )}

          {mode === "view" && <div className="w-16" />}
        </div>
      </div>

      {/* Discard Confirm */}
      {showDiscardConfirm && (
        <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-700 flex items-center justify-between">
          <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
            {t("detail.discardTitle")}
          </p>
          <div className="flex gap-2">
            <FormButton
              variant="secondary"
              label={t("detail.keepEditing")}
              onClick={cancelDiscard}
              className="text-xs px-3"
            />
            <FormButton
              variant="dangerConfirm"
              label={t("detail.discard")}
              onClick={confirmDiscard}
              className="text-xs px-3"
            />
          </div>
        </div>
      )}

      {/* Settings Panel */}
      <NoteSettingsPanel
        title={title}
        setTitle={setTitle}
        activityId={activityId}
        setActivityId={setActivityId}
        activities={activities}
        isOpen={settingsOpen}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative">
        {mode === "view" && (
          <div className="flex-1 p-4 overflow-y-auto pb-24">
            <MarkdownPreview content={content} />
          </div>
        )}

        {mode === "edit" && (
          <textarea
            className="flex-1 w-full p-4 text-sm text-gray-800 dark:text-gray-200 bg-transparent resize-none focus:outline-none pb-24"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t("create.placeholder.content")}
            autoFocus={false}
          />
        )}

        {mode === "preview" && (
          <div className="flex-1 p-4 overflow-y-auto pb-24">
            <MarkdownPreview content={content} />
          </div>
        )}
      </div>

      {/* FAB */}
      <NoteDetailFab
        mode={mode}
        onEditClick={enterEditMode}
        onPreviewToggle={togglePreview}
        onSettingsToggle={toggleSettings}
      />
    </div>
  );
}
