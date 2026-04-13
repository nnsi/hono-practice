import { useTranslation } from "@packages/i18n";
import { Eye, Pencil, Settings } from "lucide-react";

type Mode = "view" | "edit" | "preview";

type Props = {
  mode: Mode;
  onEditClick: () => void;
  onPreviewToggle: () => void;
  onSettingsToggle: () => void;
};

const fabClass =
  "bg-gray-900 text-white rounded-full shadow-lg p-3 hover:bg-gray-800 transition-colors";

export function NoteDetailFab({
  mode,
  onEditClick,
  onPreviewToggle,
  onSettingsToggle,
}: Props) {
  const { t } = useTranslation("note");

  return (
    <div className="fixed bottom-[96px] left-0 right-0 pointer-events-none z-30">
      <div className="max-w-3xl mx-auto relative">
        <div className="absolute bottom-0 right-6 flex flex-col gap-3 items-center pointer-events-auto">
          {mode === "view" && (
            <button
              type="button"
              onClick={onEditClick}
              className={fabClass}
              aria-label={t("edit.editNote")}
            >
              <Pencil size={20} />
            </button>
          )}

          {mode === "edit" && (
            <>
              <button
                type="button"
                onClick={onSettingsToggle}
                className={fabClass}
                aria-label={t("detail.settings")}
              >
                <Settings size={20} />
              </button>
              <button
                type="button"
                onClick={onPreviewToggle}
                className={fabClass}
                aria-label={t("tab.preview")}
              >
                <Eye size={20} />
              </button>
            </>
          )}

          {mode === "preview" && (
            <>
              <button
                type="button"
                onClick={onSettingsToggle}
                className={fabClass}
                aria-label={t("detail.settings")}
              >
                <Settings size={20} />
              </button>
              <button
                type="button"
                onClick={onPreviewToggle}
                className={fabClass}
                aria-label={t("tab.edit")}
              >
                <Pencil size={20} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
