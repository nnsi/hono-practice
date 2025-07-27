import { Platform, Alert as RNAlert } from "react-native";

type AlertButton = {
  text?: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
};

export const Alert = {
  alert: (
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: { cancelable?: boolean },
  ) => {
    if (Platform.OS === "web") {
      // WebではRNのAlertが動作しないため、代替実装を使用
      if (!buttons || buttons.length === 0) {
        // ボタンがない場合はただのアラート
        window.alert(`${title}${message ? `\n${message}` : ""}`);
        return;
      }

      if (buttons.length === 1) {
        // ボタンが1つの場合
        window.alert(`${title}${message ? `\n${message}` : ""}`);
        buttons[0].onPress?.();
        return;
      }

      // 複数ボタンの場合、確認ダイアログを使用
      const result = window.confirm(`${title}${message ? `\n${message}` : ""}`);

      // confirmは OK/キャンセル の2択なので、結果に応じて処理
      if (result) {
        // OKが押された場合、"cancel"以外のボタンを探す（destructiveも含む）
        const okButton = buttons.find((b) => b.style !== "cancel");
        okButton?.onPress?.();
      } else {
        // キャンセルが押された場合、"cancel"スタイルのボタンを探す
        const cancelButton = buttons.find((b) => b.style === "cancel");
        cancelButton?.onPress?.();
      }
    } else {
      // ネイティブプラットフォームでは標準のAlertを使用
      RNAlert.alert(title, message, buttons, options);
    }
  },
};
