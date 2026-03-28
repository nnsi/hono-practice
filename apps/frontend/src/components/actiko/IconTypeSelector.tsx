import { useEffect, useRef } from "react";

import { useTranslation } from "@packages/i18n";

import { EmojiPicker } from "../common/EmojiPicker";
import { ImageUploadField } from "./ImageUploadField";

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
  const { t } = useTranslation("actiko");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevPreviewRef = useRef<string | undefined>(undefined);

  // Cleanup object URLs on unmount or when preview changes
  useEffect(() => {
    return () => {
      if (prevPreviewRef.current?.startsWith("blob:")) {
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

    ctx.fillStyle = "white";
    ctx.font = "bold 120px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(value.emoji || "T", 128, 128);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], "test-icon.png", { type: "image/png" });
      const previewUrl = URL.createObjectURL(file);
      if (prevPreviewRef.current?.startsWith("blob:")) {
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

    if (prevPreviewRef.current?.startsWith("blob:")) {
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
          <span className="text-sm">{t("emoji")}</span>
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
          <span className="text-sm">{t("image")}</span>
        </label>
      </div>

      {value.type === "emoji" ? (
        <EmojiPicker
          value={value.emoji}
          onChange={(emoji) => onChange({ ...value, emoji })}
        >
          <button
            type="button"
            disabled={disabled}
            className="w-20 h-12 border border-gray-300 rounded-lg text-2xl text-center hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
          >
            {value.emoji || "😀"}
          </button>
        </EmojiPicker>
      ) : (
        <ImageUploadField
          disabled={disabled}
          preview={value.preview}
          file={value.file}
          onFileChange={handleFileChange}
          onTestImage={handleTestImage}
          fileInputRef={fileInputRef}
        />
      )}
    </div>
  );
}
