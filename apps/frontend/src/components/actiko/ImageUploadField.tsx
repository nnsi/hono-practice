import { useTranslation } from "@packages/i18n";
import { FlaskConical, Upload } from "lucide-react";

type ImageUploadFieldProps = {
  disabled: boolean;
  preview?: string;
  file?: File;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTestImage: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
};

export function ImageUploadField({
  disabled,
  preview,
  file,
  onFileChange,
  onTestImage,
  fileInputRef,
}: ImageUploadFieldProps) {
  const { t } = useTranslation("actiko");

  return (
    <div className="flex items-center gap-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={onFileChange}
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
        {t("selectImage")}
      </button>
      {import.meta.env.DEV && (
        <button
          type="button"
          onClick={onTestImage}
          disabled={disabled}
          className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
          title={t("testImageTitle")}
        >
          <FlaskConical size={14} />
          テスト
        </button>
      )}
      {preview && (
        <img
          src={preview}
          alt=""
          className="w-12 h-12 rounded object-cover border border-gray-200"
        />
      )}
      {file && (
        <span className="text-xs text-gray-400 truncate max-w-[120px]">
          {file.name}
        </span>
      )}
    </div>
  );
}
