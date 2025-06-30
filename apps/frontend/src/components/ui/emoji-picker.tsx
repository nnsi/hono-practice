import { useEffect, useRef } from "react";

import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@frontend/components/ui/popover";

type EmojiPickerProps = {
  value: string;
  onChange: (emoji: string) => void;
  children: React.ReactNode;
};

export function EmojiPicker({ onChange, children }: EmojiPickerProps) {
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // emoji-mart のスタイルを適用
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

  const handleEmojiSelect = (emoji: any) => {
    onChange(emoji.native);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 border-none shadow-lg"
        align="start"
      >
        <div ref={pickerRef}>
          <Picker
            data={data}
            onEmojiSelect={handleEmojiSelect}
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
      </PopoverContent>
    </Popover>
  );
}
