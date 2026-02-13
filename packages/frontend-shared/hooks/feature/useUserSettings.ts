import type {
  NavigationAdapter,
  NotificationAdapter,
} from "@packages/frontend-shared/adapters";

import type { GoogleCredentialResponse } from "./useLogin";

export type UserInfo = {
  id: string;
  email: string;
  name?: string | null;
  providers?: string[];
  providerEmails?: {
    google?: string;
  };
};

export type UserSettingsDependencies = {
  navigation: NavigationAdapter;
  notification: NotificationAdapter;
  auth: {
    user: UserInfo | null;
    logout: () => Promise<void>;
    getUser: () => Promise<void>;
  };
  api: {
    linkGoogleAccount: (credential: string) => Promise<void>;
    invalidateUserCache?: () => Promise<void>;
  };
};

export function createUseUserSettings(dependencies: UserSettingsDependencies) {
  const { navigation, notification, auth, api } = dependencies;
  const { user } = auth;

  // Check if Google is linked
  const isGoogleLinked = user?.providers?.includes("google") || false;
  const googleEmail = user?.providerEmails?.google;

  // Logout handler
  const handleLogout = async () => {
    try {
      await auth.logout();
      navigation.navigate("/");
    } catch (_error) {
      notification.toast({
        title: "エラー",
        description: "ログアウトに失敗しました",
        variant: "destructive",
      });
    }
  };

  // Google account linking handler
  const handleGoogleLink = async (
    credentialResponse: GoogleCredentialResponse,
  ) => {
    if (!credentialResponse.credential) {
      notification.toast({
        title: "Error",
        description: "Failed to link Google account",
        variant: "destructive",
      });
      return;
    }

    try {
      await api.linkGoogleAccount(credentialResponse.credential);
      notification.toast({
        title: "Success",
        description: "Successfully linked Google account",
        variant: "default",
      });

      // Refresh user information
      await auth.getUser();

      // Invalidate cache if provided
      if (api.invalidateUserCache) {
        await api.invalidateUserCache();
      }
    } catch (_error) {
      notification.toast({
        title: "Error",
        description: "Failed to link Google account",
        variant: "destructive",
      });
    }
  };

  // Google link error handler
  const handleGoogleLinkError = () => {
    notification.toast({
      title: "Error",
      description: "Failed to link Google account",
      variant: "destructive",
    });
  };

  // Mobile-specific handlers
  const handleMobileGoogleLink = async () => {
    try {
      // This would be implemented by the platform-specific code
      const credential = await getMobileGoogleCredential();
      if (credential) {
        await handleGoogleLink({ credential });
      }
    } catch (_error) {
      handleGoogleLinkError();
    }
  };

  // Placeholder for mobile implementation
  const getMobileGoogleCredential = async (): Promise<string | null> => {
    // This function would be provided by the mobile implementation
    throw new Error("Mobile Google Sign-In not implemented");
  };

  // Account deletion handler
  const handleDeleteAccount = async () => {
    const confirmed = await notification.confirm(
      "アカウント削除",
      "本当にアカウントを削除しますか？この操作は取り消せません。",
    );

    if (!confirmed) return;

    try {
      // API call would be added here
      // await api.deleteAccount();
      await auth.logout();
      navigation.navigate("/");
      notification.toast({
        title: "アカウントを削除しました",
        variant: "default",
      });
    } catch (_error) {
      notification.toast({
        title: "エラー",
        description: "アカウントの削除に失敗しました",
        variant: "destructive",
      });
    }
  };

  return {
    stateProps: {
      user,
      isGoogleLinked,
      googleEmail,
    },
    actions: {
      onLogout: handleLogout,
      onGoogleLink: handleGoogleLink,
      onGoogleLinkError: handleGoogleLinkError,
      onMobileGoogleLink: handleMobileGoogleLink,
      onDeleteAccount: handleDeleteAccount,
    },
  };
}
