type MemoInputProps = {
  value: string;
  onChange: (value: string) => void;
};

export function MemoInput({ value, onChange }: MemoInputProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1">
        メモ
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        placeholder="メモを入力..."
      />
    </div>
  );
}
