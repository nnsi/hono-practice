type KindSelectorProps = {
  kinds: { id: string; name: string; color: string | null }[];
  selectedKindId: string | null;
  onSelect: (id: string | null) => void;
};

export function KindSelector({
  kinds,
  selectedKindId,
  onSelect,
}: KindSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-600">種類</label>
      <div className="flex flex-wrap gap-2">
        {kinds.map((kind) => (
          <button
            key={kind.id}
            type="button"
            onClick={() =>
              onSelect(selectedKindId === kind.id ? null : kind.id)
            }
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              selectedKindId === kind.id
                ? "bg-black text-white border-black"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            {kind.color && (
              <span
                className="inline-block w-2.5 h-2.5 rounded-full mr-1.5"
                style={{ backgroundColor: kind.color }}
              />
            )}
            {kind.name}
          </button>
        ))}
      </div>
    </div>
  );
}
