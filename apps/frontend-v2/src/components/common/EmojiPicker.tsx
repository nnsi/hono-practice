import { useState, useRef, useEffect } from "react";
import data from "@emoji-mart/data";
import i18n from "@emoji-mart/data/i18n/ja.json";
import Picker from "@emoji-mart/react";

type EmojiPickerProps = {
  value: string;
  onChange: (emoji: string) => void;
  children: React.ReactNode;
};

export function EmojiPicker({ onChange, children }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // emoji-mart のカスタムスタイルを適用
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      em-emoji-picker {
        --rgb-background: 255, 255, 255;
        --rgb-input: 255, 255, 255;
        --rgb-color: 0, 0, 0;
        --rgb-accent: 59, 130, 246;
        --shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
        max-height: 350px;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // 外側クリックで閉じる
  useEffect(() => {
    if (!open) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-block">
      <div onClick={() => setOpen((prev) => !prev)}>{children}</div>
      {open && (
        <div className="absolute top-full left-0 z-50 mt-1">
          <Picker
            data={data}
            onEmojiSelect={(emoji: { native: string }) => {
              onChange(emoji.native);
              setOpen(false);
            }}
            i18n={i18n}
            locale="ja"
            theme="light"
            set="native"
            previewPosition="none"
            skinTonePosition="none"
            searchPosition="top"
            navPosition="bottom"
            perLine={8}
            maxFrequentRows={2}
          />
        </div>
      )}
    </div>
  );
}
