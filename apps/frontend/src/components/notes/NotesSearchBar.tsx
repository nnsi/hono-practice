import { useTranslation } from "@packages/i18n";
import { Search, X } from "lucide-react";

export function NotesSearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (text: string) => void;
}) {
  const { t } = useTranslation("note");

  return (
    <div className="relative flex items-center">
      <Search
        size={16}
        className="absolute left-3 text-gray-400 pointer-events-none"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("list.search.placeholder")}
        className="w-full h-10 pl-9 pr-9 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      {value.length > 0 && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2 min-w-[28px] min-h-[28px] flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          aria-label={t("list.search.clear")}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
