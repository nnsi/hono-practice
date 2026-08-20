import { forwardRef } from "react";

import type { TextInput } from "react-native";

import { mobileTestIds } from "../../testing/testIds";
import { IMESafeTextInput } from "../common/IMESafeTextInput";

type NoteBodyEditorProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  autoFocus?: boolean;
};

export const NoteBodyEditor = forwardRef<TextInput, NoteBodyEditorProps>(
  function NoteBodyEditor(
    { value, onChangeText, placeholder, autoFocus },
    ref,
  ) {
    return (
      <IMESafeTextInput
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        multiline
        autoFocus={autoFocus}
        scrollEnabled={false}
        style={{
          minHeight: 240,
          maxHeight: undefined,
          fontSize: 16,
          lineHeight: 24,
        }}
        testID={mobileTestIds.notes.bodyInput}
      />
    );
  },
);
