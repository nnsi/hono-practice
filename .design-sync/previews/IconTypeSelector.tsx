import { IconTypeSelector } from "actiko-frontend";

// Emoji/image radio toggle with the matching field below — render inside a phone-sized card.
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{ width: 320 }}
      className="p-4 bg-white rounded-2xl shadow-lifted"
    >
      {children}
    </div>
  );
}

// Emoji mode — radio set to 絵文字, emoji button shown.
export function EmojiMode() {
  return (
    <Frame>
      <IconTypeSelector
        value={{ type: "emoji", emoji: "🏃" }}
        onChange={() => {}}
      />
    </Frame>
  );
}

// Image mode — radio set to 画像, upload field shown.
export function ImageMode() {
  return (
    <Frame>
      <IconTypeSelector
        value={{ type: "upload", emoji: "🏃" }}
        onChange={() => {}}
      />
    </Frame>
  );
}
