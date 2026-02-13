import type {
  FormAdapter,
  NavigationAdapter,
  NotificationAdapter,
} from "@packages/frontend-shared/adapters";
import type { LoginRequest } from "@packages/types";

export type LoginDependencies = {
  form: FormAdapter<LoginRequest>;
  navigation: NavigationAdapter;
  notification: NotificationAdapter;
  auth: {
    login: (data: LoginRequest) => Promise<void>;
    googleLogin: (credential: string) => Promise<{ user: any; token: string }>;
    setUser: (user: any) => void;
    setAccessToken: (token: string) => void;
    scheduleTokenRefresh: () => void;
  };
};

export type GoogleCredentialResponse = {
  credential?: string;
  select_by?: string;
  clientId?: string;
};

export function createUseLogin(dependencies: LoginDependencies) {
  const { form, navigation, notification, auth } = dependencies;

  // Regular login handler
  const handleLogin = async (data: LoginRequest) => {
    try {
      await auth.login(data);
      // Navigate to home on success
      navigation.navigate("/");
    } catch (_error) {
      notification.toast({
        title: "ログインエラー",
        description: "ログインIDまたはパスワードが間違っています",
        variant: "destructive",
      });
    }
  };

  // Google auth success handler
  const handleGoogleSuccess = async (
    credentialResponse: GoogleCredentialResponse,
  ) => {
    if (!credentialResponse.credential) {
      notification.toast({
        title: "エラー",
        description: "Google認証に失敗しました",
        variant: "destructive",
      });
      return;
    }

    try {
      const { user, token } = await auth.googleLogin(
        credentialResponse.credential,
      );
      auth.setAccessToken(token);
      auth.scheduleTokenRefresh();
      auth.setUser({ ...user, name: user.name ?? null });

      // Navigate after state updates
      setTimeout(() => {
        navigation.navigate("/");
      }, 0);
    } catch (_error) {
      notification.toast({
        title: "エラー",
        description: "Google認証に失敗しました",
        variant: "destructive",
      });
    }
  };

  // Google auth error handler
  const handleGoogleError = () => {
    notification.toast({
      title: "エラー",
      description: "Google認証に失敗しました",
      variant: "destructive",
    });
  };

  // Mobile-specific handlers
  const handleMobileGoogleLogin = async () => {
    try {
      // This would be implemented by the platform-specific code
      // For example, using react-native-google-signin
      const credential = await getMobileGoogleCredential();
      if (credential) {
        await handleGoogleSuccess({ credential });
      }
    } catch (_error) {
      handleGoogleError();
    }
  };

  // Placeholder for mobile implementation
  const getMobileGoogleCredential = async (): Promise<string | null> => {
    // This function would be provided by the mobile implementation
    // using platform-specific Google Sign-In SDK
    throw new Error("Mobile Google Sign-In not implemented");
  };

  return {
    form,
    stateProps: {
      isSubmitting: form.formState.isSubmitting,
    },
    actions: {
      onLogin: form.handleSubmit(handleLogin),
      onGoogleSuccess: handleGoogleSuccess,
      onGoogleError: handleGoogleError,
      onMobileGoogleLogin: handleMobileGoogleLogin,
    },
  };
}

// Validation schema for login form
export const createLoginValidation = () => ({
  login_id: {
    required: "ログインIDを入力してください",
    minLength: {
      value: 3,
      message: "ログインIDは3文字以上で入力してください",
    },
  },
  password: {
    required: "パスワードを入力してください",
    minLength: {
      value: 8,
      message: "パスワードは8文字以上で入力してください",
    },
  },
});
