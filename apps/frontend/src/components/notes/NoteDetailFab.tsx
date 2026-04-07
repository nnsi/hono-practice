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
  return (
    <div className="fixed bottom-[96px] right-6 flex flex-col gap-3 items-center">
      {mode === "view" && (
        <button type="button" onClick={onEditClick} className={fabClass}>
          <Pencil size={20} />
        </button>
      )}

      {mode === "edit" && (
        <>
          <button type="button" onClick={onSettingsToggle} className={fabClass}>
            <Settings size={20} />
          </button>
          <button type="button" onClick={onPreviewToggle} className={fabClass}>
            <Eye size={20} />
          </button>
        </>
      )}

      {mode === "preview" && (
        <>
          <button type="button" onClick={onSettingsToggle} className={fabClass}>
            <Settings size={20} />
          </button>
          <button type="button" onClick={onPreviewToggle} className={fabClass}>
            <Pencil size={20} />
          </button>
        </>
      )}
    </div>
  );
}
