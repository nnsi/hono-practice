import { useToast } from "@frontend/components/ui";
import { useLinkGoogleAccount } from "@frontend/hooks/api";
import { useAuth } from "@frontend/hooks/useAuth";
import { createWebNotificationAdapter } from "@packages/frontend-shared/adapters";
import { createUseUserSettings } from "@packages/frontend-shared/hooks/feature";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";

// 新しい共通化されたフックを使用する実装
export const useUserSettings = () => {
  const { user, logout, getUser } = useAuth();
  const linkGoogleAccount = useLinkGoogleAccount();

  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Create adapters and dependencies
  const notificationAdapter = createWebNotificationAdapter();
  if ("setToastCallback" in notificationAdapter) {
    notificationAdapter.setToastCallback(toast);
  }

  const dependencies = {
    navigation: {
      navigate: (path: string) => router.navigate({ to: path }),
      replace: (path: string) => router.history.replace(path),
      goBack: () => router.history.back(),
      canGoBack: () => router.history.canGoBack(),
    },
    notification: notificationAdapter,
    auth: {
      user: user
        ? {
            id: user.id,
            email: user.providerEmails?.google || "",
            name: user.name,
            providers: user.providers,
            providerEmails: {
              google: user.providerEmails?.google,
            },
          }
        : null,
      logout,
      getUser,
    },
    api: {
      linkGoogleAccount: async (credential: string) => {
        await linkGoogleAccount.mutateAsync(credential);
      },
      invalidateUserCache: async () => {
        await queryClient.invalidateQueries({ queryKey: ["user", "me"] });
      },
    },
  };

  // Use the common hook
  const { stateProps, actions } = createUseUserSettings(dependencies);

  // 後方互換性を維持しながら新しいAPIも公開
  return {
    ...stateProps,
    // 旧API互換のアクション
    handleLogout: actions.onLogout,
    handleGoogleLink: actions.onGoogleLink,
    handleGoogleLinkError: actions.onGoogleLinkError,
    handleMobileGoogleLink: actions.onMobileGoogleLink,
    handleDeleteAccount: actions.onDeleteAccount,
    // 新しいグループ化されたAPIも公開
    stateProps,
    actions,
  };
};
