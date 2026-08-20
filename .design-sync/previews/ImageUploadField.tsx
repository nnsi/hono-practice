import { ImageUploadField } from "actiko-frontend";
import { useRef } from "react";

// 活動アイコン用の画像アップロードフィールド。「画像を選択」ボタンと、
// 選択済みのプレビューサムネイル・ファイル名を横並びで表示する。
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: 360 }}>
      <div className="bg-white rounded-xl border border-gray-200 shadow-soft p-4">
        {children}
      </div>
    </div>
  );
}

const noop = () => {};

// 未選択の状態（ボタンのみ）。
export function Empty() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  return (
    <Frame>
      <ImageUploadField
        disabled={false}
        onFileChange={noop}
        onTestImage={noop}
        fileInputRef={fileInputRef}
      />
    </Frame>
  );
}

// 画像選択済み（プレビューサムネイル + ファイル名を表示）。
export function WithPreview() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const preview =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" fill="%23fbbf24"/><text x="24" y="32" font-size="24" text-anchor="middle">🏃</text></svg>',
    );
  return (
    <Frame>
      <ImageUploadField
        disabled={false}
        preview={preview}
        file={new File([], "running-icon.png")}
        onFileChange={noop}
        onTestImage={noop}
        fileInputRef={fileInputRef}
      />
    </Frame>
  );
}

// 無効化された状態（送信中など）。
export function Disabled() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  return (
    <Frame>
      <ImageUploadField
        disabled={true}
        onFileChange={noop}
        onTestImage={noop}
        fileInputRef={fileInputRef}
      />
    </Frame>
  );
}
