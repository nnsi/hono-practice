import { apiClient } from "@frontend/utils/apiClient";
import { createUseCreateUser } from "@packages/frontend-shared/hooks/feature";
import { useNavigate } from "@tanstack/react-router";

import { useAuth } from "@hooks/useAuth";

import { useToast } from "@components/ui";

export const useCreateUser = () => {
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

  // 共通フックをインスタンス化
  const useCreateUserBase = createUseCreateUser({
    apiClient,
    navigation: navigationAdapter,
    notification: notificationAdapter,
    useAuth,
  });

  return useCreateUserBase();
};
