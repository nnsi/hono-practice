import { Alert } from "react-native";

import {
  createReactNativeNavigationAdapter,
  createReactNativeNotificationAdapter,
} from "@packages/frontend-shared/adapters";
import { createUseLinkGoogleAccount } from "@packages/frontend-shared/hooks";
import { createUseUserSettings } from "@packages/frontend-shared/hooks/feature";
import { useNavigation } from "@react-navigation/native";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";

import { apiClient } from "../utils/apiClient";
import { queryClient } from "../utils/queryClient";

import { useAuth } from "./useAuth";

WebBrowser.maybeCompleteAuthSession();

// モバイル版のユーザー設定フック
export const useUserSettings = () => {
  const { user, logout, getUser } = useAuth();
  const navigation = useNavigation();

  // API hooks
  const linkGoogleAccount = createUseLinkGoogleAccount({ apiClient });

  // Google Sign-In setup for linking
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || "",
    scopes: ["openid", "profile", "email"],
  });

  // Create dependencies
  const dependencies = {
    navigation: createReactNativeNavigationAdapter(navigation as any),
    notification: createReactNativeNotificationAdapter(Alert),
    auth: {
      user,
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
  const settingsHook = createUseUserSettings(dependencies);

  // Override mobile Google link
  const handleMobileGoogleLink = async () => {
    try {
      const result = await promptAsync();
      if (result?.type === "success" && result.authentication?.accessToken) {
        // Exchange access token for ID token on the server
        await settingsHook.handleGoogleLink({
          credential: result.authentication.accessToken,
        });
      }
    } catch (error) {
      settingsHook.handleGoogleLinkError();
    }
  };

  return {
    ...settingsHook,
    handleMobileGoogleLink,
    googleLinkReady: !!request,
  };
};
