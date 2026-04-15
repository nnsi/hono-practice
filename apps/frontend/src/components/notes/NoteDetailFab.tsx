import { useTranslation } from "@packages/i18n";
import { Settings } from "lucide-react";

type Props = {
  onSettingsToggle: () => void;
};

const fabClass =
  "bg-gray-900 text-white rounded-full shadow-lg p-3 hover:bg-gray-800 transition-colors";

export function NoteDetailFab({ onSettingsToggle }: Props) {
  const { t } = useTranslation("note");

  return (
    <div className="pointer-events-none fixed bottom-[96px] left-0 right-0 z-30">
      <div className="relative mx-auto max-w-3xl">
        <div className="pointer-events-auto absolute bottom-0 right-6 flex items-center">
          <button
            type="button"
            onClick={onSettingsToggle}
            className={fabClass}
            aria-label={t("detail.settings")}
          >
            <Settings size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
