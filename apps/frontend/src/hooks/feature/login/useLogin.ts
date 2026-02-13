import { useToast } from "@components/ui";
import {
  type LoginRequest,
  loginRequestSchema,
} from "@dtos/request/LoginRequest";
import { useGoogleAuth } from "@frontend/hooks/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@hooks/useAuth";
import {
  createWebFormAdapter,
  createWebNotificationAdapter,
} from "@packages/frontend-shared/adapters";
import { createUseLogin } from "@packages/frontend-shared/hooks/feature";
import { useRouter } from "@tanstack/react-router";
import { useForm } from "react-hook-form";

// 新しい共通化されたフックを使用する実装
export const useLogin = () => {
  const { login, setUser, setAccessToken, scheduleTokenRefresh } = useAuth();

  const router = useRouter();
  const { toast } = useToast();
  const googleAuth = useGoogleAuth();

  // Form setup
  const form = useForm<LoginRequest>({
    resolver: zodResolver(loginRequestSchema),
    defaultValues: {
      login_id: "",
      password: "",
    },
  });

  // Create adapters and dependencies
  const notificationAdapter = createWebNotificationAdapter();
  if ("setToastCallback" in notificationAdapter) {
    notificationAdapter.setToastCallback(toast);
  }

  const dependencies = {
    form: createWebFormAdapter<LoginRequest>(form as never),
    navigation: {
      navigate: (path: string) => router.navigate({ to: path }),
      replace: (path: string) => router.history.replace(path),
      goBack: () => router.history.back(),
      canGoBack: () => router.history.canGoBack(),
    },
    notification: notificationAdapter,
    auth: {
      login: async (data: LoginRequest) => {
        await login(data);
      },
      googleLogin: async (credential: string) => {
        const result = await googleAuth.mutateAsync(credential);
        return result;
      },
      setUser,
      setAccessToken,
      scheduleTokenRefresh,
    },
  };

  // Use the common hook
  const { stateProps, actions } = createUseLogin(dependencies);

  // Return the form object separately for compatibility with existing components
  return {
    form,
    handleLogin: actions.onLogin, // This is already wrapped by handleSubmit in createUseLogin
    handleGoogleSuccess: actions.onGoogleSuccess,
    handleGoogleError: actions.onGoogleError,
    handleMobileGoogleLogin: actions.onMobileGoogleLogin,
    isSubmitting: stateProps.isSubmitting,
    // 新しいグループ化されたAPIも公開
    stateProps,
    actions,
  };
};
