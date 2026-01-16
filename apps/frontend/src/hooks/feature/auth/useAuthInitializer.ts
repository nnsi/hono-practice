import { useToast } from "@components/ui";
import { useAuth } from "@frontend/hooks/useAuth";
import { createUseAuthInitializer } from "@packages/frontend-shared/hooks/feature";
import { useNavigate } from "@tanstack/react-router";

export const useAuthInitializer = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Web固有のNavigationAdapter実装
  const navigationAdapter = {
    navigate: (path: string) => navigate({ to: path }),
    replace: (path: string) => navigate({ to: path, replace: true }),
    goBack: () => window.history.back(),
    canGoBack: () => window.history.length > 1,
  };

  // Web固有のNotificationAdapter実装
  const notificationAdapter = {
    toast: (options: any) => toast(options),
    alert: async (title: string, message?: string) => {
      window.alert(message || title);
    },
    confirm: async (title: string, message?: string) => {
      return window.confirm(message || title);
    },
  };

  // Web固有の初期化処理（ピンチズーム無効化）
  const platformInitializer = {
    setup: () => {
      function handleDisablePinchZoom(e: TouchEvent) {
        if (e.touches.length > 1) {
          e.preventDefault();
        }
      }

      window.addEventListener("touchstart", handleDisablePinchZoom, {
        passive: false,
      });

      return () => {
        window.removeEventListener("touchstart", handleDisablePinchZoom);
      };
    },
  };

  // 共通フックをインスタンス化
  const useAuthInitializerBase = createUseAuthInitializer({
    navigation: navigationAdapter,
    notification: notificationAdapter,
    useAuth,
    platformInitializer,
    // eventBusは指定しないので、Webのwindowイベントが使われる
  });

  const { stateProps } = useAuthInitializerBase();

  // 後方互換性を維持
  return {
    ...stateProps,
    // 新しいグループ化されたAPIも公開
    stateProps,
  };
};
