import { useTranslation } from "@packages/i18n";
import { ArrowLeft, FileX } from "lucide-react";
import { useState } from "react";

import { FormButton } from "../common/FormButton";
import { NoteDetailFab } from "./NoteDetailFab";
import { NoteRichTextEditor } from "./NoteRichTextEditor";
import { NoteSettingsPanel } from "./NoteSettingsPanel";
import { useNoteDetailPage } from "./useNoteDetailPage";

export function NoteDetailPage() {
  const [copied, setCopied] = useState(false);
  const {
    isNew,
    isLoading,
    notFound,
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
    toggleSettings,
    handleSave,
    handleBack,
    confirmDiscard,
    cancelDiscard,
  } = useNoteDetailPage();
  const { t } = useTranslation("note");

  const headerTitle = isNew
    ? t("detail.newNote")
    : title || t("detail.untitled");

  if (isLoading) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center bg-white">
        <p className="text-sm text-gray-400">{t("detail.loading")}</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex min-h-full flex-col bg-white">
        <div className="sticky top-0 z-10 sticky-header">
          <div className="flex h-12 items-center px-4">
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-1 text-gray-600 transition-colors hover:text-gray-900"
            >
              <ArrowLeft size={18} />
              <span className="text-sm">{t("detail.back")}</span>
            </button>
          </div>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
          <FileX size={48} className="text-gray-300" />
          <p className="font-semibold text-gray-900">{t("detail.notFound")}</p>
          <p className="text-sm text-gray-500">
            {t("detail.notFoundDescription")}
          </p>
        </div>
      </div>
    );
  }

  const handleCopyPlainText = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex min-h-full flex-col bg-white">
      <div className="sticky top-0 z-10 sticky-header">
        <div className="flex h-12 items-center justify-between gap-2 px-4">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1 text-gray-600 transition-colors hover:text-gray-900"
          >
            <ArrowLeft size={18} />
            <span className="text-sm">{t("detail.back")}</span>
          </button>

          <h1 className="mx-4 flex-1 truncate text-center text-base font-semibold text-gray-900">
            {headerTitle}
          </h1>

          <div className="flex shrink-0 items-center gap-2">
            <FormButton
              variant="secondary"
              label={copied ? t("detail.copied") : t("detail.copyPlainText")}
              onClick={handleCopyPlainText}
              className="px-3 py-1.5 text-sm"
            />
            <FormButton
              variant="primary"
              label={isSubmitting ? t("detail.saving") : t("detail.save")}
              onClick={handleSave}
              disabled={!canSave}
              className="px-3 py-1.5 text-sm"
            />
          </div>
        </div>
      </div>

      {showDiscardConfirm && (
        <div className="flex items-center justify-between border-b border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-800">
            {t("detail.discardTitle")}
          </p>
          <div className="flex gap-2">
            <FormButton
              variant="secondary"
              label={t("detail.keepEditing")}
              onClick={cancelDiscard}
              className="px-3 text-xs"
            />
            <FormButton
              variant="dangerConfirm"
              label={t("detail.discard")}
              onClick={confirmDiscard}
              className="px-3 text-xs"
            />
          </div>
        </div>
      )}

      <NoteSettingsPanel
        title={title}
        setTitle={setTitle}
        activityId={activityId}
        setActivityId={setActivityId}
        activities={activities}
        isOpen={settingsOpen}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl p-4 pb-24">
          <NoteRichTextEditor
            value={content}
            onChange={setContent}
            placeholder={t("create.placeholder.content")}
          />
        </div>
      </div>

      <NoteDetailFab onSettingsToggle={toggleSettings} />
    </div>
  );
}
