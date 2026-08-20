import { useState } from "react";

import { useTranslation } from "@packages/i18n";
import { ArrowLeft, Check, Copy, FileX } from "lucide-react";

import { NoteActivityChips } from "./NoteActivityChips";
import { NoteRichTextEditor } from "./NoteRichTextEditor";
import { useNoteDetailPage } from "./useNoteDetailPage";

export function NoteDetailPage() {
  const [copied, setCopied] = useState(false);
  const {
    isLoading,
    notFound,
    title,
    setTitle,
    content,
    setContent,
    activityId,
    setActivityId,
    saveState,
    activities,
    handleBack,
  } = useNoteDetailPage();
  const { t } = useTranslation("note");

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
              onClick={() => void handleBack()}
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
        <div className="flex h-12 items-center justify-between gap-2 pl-4 pr-14">
          <button
            type="button"
            onClick={() => void handleBack()}
            className="flex items-center gap-1 text-gray-600 transition-colors hover:text-gray-900"
          >
            <ArrowLeft size={18} />
            <span className="text-sm">{t("detail.back")}</span>
          </button>

          <div className="flex shrink-0 items-center gap-3">
            {saveState !== "idle" && (
              <span className="text-xs text-gray-400">
                {saveState === "saving"
                  ? t("detail.saving")
                  : t("detail.saved")}
              </span>
            )}
            <button
              type="button"
              onClick={handleCopyPlainText}
              aria-label={
                copied ? t("detail.copied") : t("detail.copyPlainText")
              }
              title={copied ? t("detail.copied") : t("detail.copyPlainText")}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 text-sm text-gray-700 transition-colors hover:bg-gray-50"
            >
              {copied ? (
                <Check size={16} className="text-emerald-600" />
              ) : (
                <Copy size={16} />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl p-4 pb-24">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("create.placeholder.title")}
            aria-label={t("create.label.title")}
            className="w-full bg-transparent text-xl font-semibold text-gray-900 outline-none placeholder:text-gray-400"
          />

          <div className="mt-2 mb-4">
            <NoteActivityChips
              activityId={activityId}
              onChangeActivityId={setActivityId}
              activities={activities}
            />
          </div>

          <NoteRichTextEditor
            value={content}
            onChange={setContent}
            placeholder={t("create.placeholder.content")}
          />
        </div>
      </div>
    </div>
  );
}
