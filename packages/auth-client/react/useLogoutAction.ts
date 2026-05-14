import { useCallback, useState } from "react";

// logout ボタン共通のフロー: { ok: true } ならメニュー/確認 UI を閉じる、
// { ok: false } なら警告を出し UI は閉じず再試行可能にする。Web の
// AuthenticatedLayout / Mobile の AccountAndDangerSection で共通に使う。
//
// Codex Round 2 #1 の修正で transport.logout は 401 retry を介して
// access token を refresh するため、tokenHolder 期限切れだけでは失敗しなくなった
// が、network error / backend 5xx 等の失敗は依然あり得るので warning を残す
export type LogoutActionResult = { ok: boolean };

export function useLogoutAction(
  onLogout: () => Promise<LogoutActionResult>,
  onSuccess?: () => void,
) {
  const [warning, setWarning] = useState(false);
  const [pending, setPending] = useState(false);

  const trigger = useCallback(async () => {
    setWarning(false);
    setPending(true);
    try {
      const result = await onLogout();
      if (result.ok) {
        onSuccess?.();
      } else {
        setWarning(true);
      }
      return result;
    } finally {
      setPending(false);
    }
  }, [onLogout, onSuccess]);

  const dismissWarning = useCallback(() => setWarning(false), []);

  return { warning, pending, trigger, dismissWarning };
}
