import { useEffect } from "react";

import { useAuth } from "@frontend/hooks/useAuth";
import { useNavigate } from "@tanstack/react-router";

import { useToast } from "@components/ui";

export const useAuthInitializer = () => {
  const { user, requestStatus, refreshToken, isInitialized } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // APIエラーハンドリング
    function handleApiError(e: CustomEvent<string>) {
      toast({
        title: "Error",
        description: e.detail,
        variant: "destructive",
      });
    }

    // 未認証時の処理
    async function handleUnauthorized() {
      // すでに未認証状態なら何もしない
      if (!user) return;
      try {
        // トークンリフレッシュを試みる
        await refreshToken();
      } catch (e) {
        // リフレッシュに失敗した場合のみログインページにリダイレクト
        navigate({
          to: "/",
        });
      }
    }

    // ピンチズーム無効化
    function handleDisablePinchZoom(e: TouchEvent) {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    }

    // イベントリスナーの登録
    window.addEventListener("api-error", handleApiError);
    window.addEventListener("unauthorized", handleUnauthorized);
    window.addEventListener("touchstart", handleDisablePinchZoom, {
      passive: false,
    });

    // クリーンアップ
    return () => {
      window.removeEventListener("api-error", handleApiError);
      window.removeEventListener("unauthorized", handleUnauthorized);
      window.removeEventListener("touchstart", handleDisablePinchZoom);
    };
  }, [user, refreshToken, navigate, toast]);

  return {
    isInitialized,
    user,
    requestStatus,
  };
};
