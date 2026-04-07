import { useTranslation } from "@packages/i18n";
import { ArrowLeft } from "lucide-react";

import { FormButton } from "../common/FormButton";
import { MarkdownPreview } from "./MarkdownPreview";
import { NoteDetailFab } from "./NoteDetailFab";
import { NoteSettingsPanel } from "./NoteSettingsPanel";
import { useNoteDetailPage } from "./useNoteDetailPage";

export function NoteDetailPage() {
  const {
    isNew,
    isLoading,
    note,
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
    activities,
    enterEditMode,
    togglePreview,
    toggleSettings,
    handleSave,
    handleBack,
  } = useNoteDetailPage();
  const { t } = useTranslation("note");

  const headerTitle = (() => {
    if (isNew) return t("detail.newNote");
    if (mode === "view") return note?.title ?? t("detail.untitled");
    return t("edit.title");
  })();

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-full bg-white items-center justify-center">
        <p className="text-gray-400 text-sm">...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 pr-14 h-12">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-sm">{t("detail.back")}</span>
          </button>

          <h1 className="text-base font-semibold text-gray-900 truncate mx-4 flex-1 text-center">
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
            <MarkdownPreview content={note?.content ?? ""} />
          </div>
        )}

        {mode === "edit" && (
          <textarea
            className="flex-1 w-full p-4 text-sm text-gray-800 resize-none focus:outline-none pb-24"
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
