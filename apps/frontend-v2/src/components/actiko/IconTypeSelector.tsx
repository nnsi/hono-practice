import { useEffect, useRef } from "react";
import { FlaskConical, Upload } from "lucide-react";

export type IconSelectorValue = {
  type: "emoji" | "upload";
  emoji: string;
  file?: File;
  preview?: string;
};

export function IconTypeSelector({
  value,
  onChange,
  disabled = false,
}: {
  value: IconSelectorValue;
  onChange: (value: IconSelectorValue) => void;
  disabled?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevPreviewRef = useRef<string | undefined>(undefined);

  // Cleanup object URLs on unmount or when preview changes
  useEffect(() => {
    return () => {
      if (
        prevPreviewRef.current &&
        prevPreviewRef.current.startsWith("blob:")
      ) {
        URL.revokeObjectURL(prevPreviewRef.current);
      }
    };
  }, []);

  const handleTypeChange = (newType: "emoji" | "upload") => {
    if (newType === "emoji") {
      onChange({
        type: "emoji",
        emoji: value.emoji,
        file: undefined,
        preview: undefined,
      });
    } else {
      onChange({
        type: "upload",
        emoji: value.emoji,
        file: value.file,
        preview: value.preview,
      });
    }
  };

  const handleTestImage = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // ランダムグラデーション背景
    const colors = [
      ["#667eea", "#764ba2"],
      ["#f093fb", "#f5576c"],
      ["#4facfe", "#00f2fe"],
      ["#43e97b", "#38f9d7"],
      ["#fa709a", "#fee140"],
    ];
    const [c1, c2] = colors[Math.floor(Math.random() * colors.length)];
    const gradient = ctx.createLinearGradient(0, 0, 256, 256);
    gradient.addColorStop(0, c1);
    gradient.addColorStop(1, c2);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    // 絵文字またはイニシャルを描画
    ctx.fillStyle = "white";
    ctx.font = "bold 120px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(value.emoji || "T", 128, 128);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], "test-icon.png", { type: "image/png" });
      const previewUrl = URL.createObjectURL(file);
      if (
        prevPreviewRef.current &&
        prevPreviewRef.current.startsWith("blob:")
      ) {
        URL.revokeObjectURL(prevPreviewRef.current);
      }
      prevPreviewRef.current = previewUrl;
      onChange({
        type: "upload",
        emoji: value.emoji,
        file,
        preview: previewUrl,
      });
    }, "image/png");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (
      prevPreviewRef.current &&
      prevPreviewRef.current.startsWith("blob:")
    ) {
      URL.revokeObjectURL(prevPreviewRef.current);
    }

    const previewUrl = URL.createObjectURL(file);
    prevPreviewRef.current = previewUrl;

    onChange({
      type: "upload",
      emoji: value.emoji,
      file,
      preview: previewUrl,
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-4">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="radio"
            name="iconType"
            value="emoji"
            checked={value.type === "emoji"}
            onChange={() => handleTypeChange("emoji")}
            disabled={disabled}
            className="accent-blue-600"
          />
          <span className="text-sm">絵文字</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="radio"
            name="iconType"
            value="upload"
            checked={value.type === "upload"}
            onChange={() => handleTypeChange("upload")}
            disabled={disabled}
            className="accent-blue-600"
          />
          <span className="text-sm">画像</span>
        </label>
      </div>

      {value.type === "emoji" ? (
        <input
          type="text"
          value={value.emoji}
          onChange={(e) => onChange({ ...value, emoji: e.target.value })}
          disabled={disabled}
          className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-2xl text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      ) : (
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileChange}
            disabled={disabled}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <Upload size={14} />
            画像を選択
          </button>
          {import.meta.env.DEV && (
            <button
              type="button"
              onClick={handleTestImage}
              disabled={disabled}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
              title="テスト画像を生成"
            >
              <FlaskConical size={14} />
              テスト
            </button>
          )}
          {value.preview && (
            <img
              src={value.preview}
              alt=""
              className="w-12 h-12 rounded object-cover border border-gray-200"
            />
          )}
          {value.file && (
            <span className="text-xs text-gray-400 truncate max-w-[120px]">
              {value.file.name}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
