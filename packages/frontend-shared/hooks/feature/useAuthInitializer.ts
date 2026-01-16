import { useEffect } from "react";

import type {
  EventBusAdapter,
  NavigationAdapter,
  NotificationAdapter,
} from "../../adapters/types";

type UseAuthInitializerDependencies = {
  navigation: NavigationAdapter;
  notification: NotificationAdapter;
  eventBus?: EventBusAdapter;
  useAuth: () => {
    user: any;
    requestStatus: string;
    refreshToken: () => Promise<void>;
    isInitialized: boolean;
  };
  // プラットフォーム固有の初期化処理
  platformInitializer?: {
    setup: () => () => void; // setup関数がcleanup関数を返す
  };
};

export const createUseAuthInitializer = (
  deps: UseAuthInitializerDependencies,
) => {
  const {
    navigation,
    notification,
    useAuth: useAuthBase,
    platformInitializer,
    eventBus,
  } = deps;

  return () => {
    const { user, requestStatus, refreshToken, isInitialized } = useAuthBase();

    useEffect(() => {
      // APIエラーハンドリング
      const handleApiError = (detail: string) => {
        notification.toast({
          title: "Error",
          description: detail,
          variant: "destructive",
        });
      };

      // 未認証時の処理
      const handleUnauthorized = async () => {
        // すでに未認証状態なら何もしない
        if (!user) return;
        try {
          // トークンリフレッシュを試みる
          await refreshToken();
        } catch (_e) {
          // リフレッシュに失敗した場合のみログインページにリダイレクト
          navigation.navigate("/");
        }
      };

      // イベントリスナーの登録
      const cleanupEventListeners: (() => void)[] = [];

      // EventBusアダプターがある場合はそれを使用
      if (eventBus) {
        cleanupEventListeners.push(
          eventBus.on("api-error", (data) => handleApiError(data as string)),
        );
        cleanupEventListeners.push(
          eventBus.on("unauthorized", () => handleUnauthorized()),
        );
      } else {
        // Web環境向けのフォールバック
        const apiErrorHandler = (e: Event) =>
          handleApiError((e as CustomEvent<string>).detail);
        const unauthorizedHandler = () => handleUnauthorized();

        window.addEventListener("api-error", apiErrorHandler);
        window.addEventListener("unauthorized", unauthorizedHandler);

        cleanupEventListeners.push(() => {
          window.removeEventListener("api-error", apiErrorHandler);
          window.removeEventListener("unauthorized", unauthorizedHandler);
        });
      }

      // プラットフォーム固有の初期化処理
      let platformCleanup: (() => void) | undefined;
      if (platformInitializer) {
        platformCleanup = platformInitializer.setup();
      }

      // クリーンアップ
      return () => {
        cleanupEventListeners.forEach((cleanup) => cleanup());
        platformCleanup?.();
      };
    }, [user, refreshToken]);

    return {
      stateProps: {
        isInitialized,
        user,
        requestStatus,
      },
    };
  };
};
