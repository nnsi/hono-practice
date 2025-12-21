import { useState } from "react";

import {
  Button,
  EmojiPicker,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
} from "@components/ui";
import { TestTube, Upload } from "lucide-react";

type IconType = "emoji" | "upload" | "generate";

interface IconTypeSelectorProps {
  value: {
    type: IconType;
    emoji?: string;
    file?: File;
    preview?: string;
  };
  onChange: (value: {
    type: IconType;
    emoji?: string;
    file?: File;
    preview?: string;
  }) => void;
  disabled?: boolean;
}

export function IconTypeSelector({
  value,
  onChange,
  disabled = false,
}: IconTypeSelectorProps) {
  const [selectedType, setSelectedType] = useState<IconType>(
    value.type || "emoji",
  );

  const handleTypeChange = (newType: IconType) => {
    setSelectedType(newType);
    onChange({
      type: newType,
      emoji: newType === "emoji" ? value.emoji : undefined,
      file: newType === "upload" ? value.file : undefined,
      preview: newType === "upload" ? value.preview : undefined,
    });
  };

  const handleEmojiChange = (emoji: string) => {
    onChange({
      type: "emoji",
      emoji,
      file: undefined,
      preview: undefined,
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);

    onChange({
      type: "upload",
      emoji: undefined,
      file,
      preview: previewUrl,
    });
  };

  // 開発環境用のテスト画像生成関数
  const handleTestImageUpload = async () => {
    if (import.meta.env.PROD) return;

    // Canvas APIを使用してテスト画像を生成
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    // グラデーション背景
    const gradient = ctx.createLinearGradient(0, 0, 256, 256);
    gradient.addColorStop(0, "#667eea");
    gradient.addColorStop(1, "#764ba2");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    // アクティビティ名の頭文字を描画
    ctx.fillStyle = "white";
    ctx.font = "bold 120px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const firstLetter = value.emoji || "A";
    ctx.fillText(firstLetter, 128, 128);

    // CanvasをBlobに変換
    canvas.toBlob((blob) => {
      if (!blob) return;

      // BlobからFileオブジェクトを作成
      const file = new File([blob], "test-icon.png", { type: "image/png" });
      const previewUrl = URL.createObjectURL(file);

      onChange({
        type: "upload",
        emoji: undefined,
        file,
        preview: previewUrl,
      });
    }, "image/png");
  };

  return (
    <div className="space-y-4">
      <RadioGroup
        value={selectedType}
        onValueChange={handleTypeChange as (value: string) => void}
        disabled={disabled}
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="emoji" id="emoji" />
          <Label htmlFor="emoji">絵文字</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="upload" id="upload" />
          <Label htmlFor="upload">画像をアップロード</Label>
        </div>
        {/* 
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="generate" id="generate" />
          <Label htmlFor="generate">AIで生成</Label>
        </div>
        */}
      </RadioGroup>

      <div className="min-h-[50px]">
        {selectedType === "emoji" && (
          <EmojiPicker value={value.emoji || ""} onChange={handleEmojiChange}>
            <Input
              value={value.emoji || ""}
              placeholder="絵文字を選択"
              className="w-32 text-center cursor-pointer"
              readOnly
              disabled={disabled}
            />
          </EmojiPicker>
        )}

        {selectedType === "upload" && (
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={handleFileChange}
                disabled={disabled}
                className="hidden"
                id="icon-upload"
              />
              <label htmlFor="icon-upload">
                <Button
                  type="button"
                  variant="outline"
                  className="cursor-pointer"
                  disabled={disabled}
                  asChild
                >
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    画像を選択
                  </span>
                </Button>
              </label>
              {import.meta.env.DEV && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestImageUpload}
                  disabled={disabled}
                  className="cursor-pointer"
                  title="開発環境用：テスト画像を生成"
                >
                  <TestTube className="w-4 h-4 mr-2" />
                  テスト画像
                </Button>
              )}
              {value.preview && (
                <img
                  src={value.preview}
                  alt="プレビュー"
                  className="w-12 h-12 object-cover rounded"
                />
              )}
            </div>
            {value.file && (
              <p className="text-sm text-muted-foreground">
                選択中: {value.file.name}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              対応形式: JPG, PNG, GIF, WebP (最大5MB)
            </p>
          </div>
        )}

        {selectedType === "generate" && (
          <div className="text-sm text-muted-foreground">
            AI生成機能は近日公開予定です
          </div>
        )}
      </div>
    </div>
  );
}
