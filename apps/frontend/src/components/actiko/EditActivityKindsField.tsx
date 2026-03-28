import { COLOR_PALETTE } from "@packages/frontend-shared/utils/colorUtils";
import { useTranslation } from "@packages/i18n";

type Kind = { id?: string; name: string; color: string };

type EditActivityKindsFieldProps = {
  kinds: Kind[];
  setKinds: React.Dispatch<React.SetStateAction<Kind[]>>;
};

export function EditActivityKindsField({
  kinds,
  setKinds,
}: EditActivityKindsFieldProps) {
  const { t } = useTranslation("actiko");

  return (
    <div>
      <div className="text-sm font-medium text-gray-600 mb-2">{t("kinds")}</div>
      {kinds.map((kind, i) => (
        <div key={kind.id ?? i} className="flex gap-2 mb-2 items-center">
          <input
            type="text"
            value={kind.name}
            onChange={(e) =>
              setKinds((prev) =>
                prev.map((k, j) =>
                  j === i ? { ...k, name: e.target.value } : k,
                ),
              )
            }
            placeholder={t("kindPlaceholder")}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="color"
            value={kind.color || "#3b82f6"}
            onChange={(e) =>
              setKinds((prev) =>
                prev.map((k, j) =>
                  j === i ? { ...k, color: e.target.value } : k,
                ),
              )
            }
            className="w-10 h-10 p-0.5 border border-gray-300 rounded cursor-pointer"
          />
          <button
            type="button"
            onClick={() => setKinds((prev) => prev.filter((_, j) => j !== i))}
            className="px-2 py-1 text-red-500 hover:bg-red-50 rounded"
          >
            -
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          setKinds((prev) => {
            const usedColors = new Set(prev.map((k) => k.color.toUpperCase()));
            const nextColor =
              COLOR_PALETTE.find((c) => !usedColors.has(c.toUpperCase())) ??
              COLOR_PALETTE[prev.length % COLOR_PALETTE.length];
            return [...prev, { name: "", color: nextColor }];
          })
        }
        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
      >
        {t("addKind")}
      </button>
    </div>
  );
}
