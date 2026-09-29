import type { TextInput, TextInputProps } from "react-native";

/** Methods shared by React Native and Expo UI inputs. */
export type IMESafeTextInputRef = Pick<
  TextInput,
  "focus" | "blur" | "clear" | "isFocused" | "setSelection"
> & { select?: () => void };

export type IMESafeTextInputProps = Omit<
  TextInputProps,
  "onFocus" | "onBlur" | "onSubmitEditing"
> & {
  className?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  onSubmitEditing?: () => void;
};
