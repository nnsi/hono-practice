import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import {
  type CreateUserRequest,
  createUserRequestSchema,
} from "@dtos/request/CreateUserRequest";

import { createUseCreateUserApi, createUseGoogleAuth } from "../";

import type {
  NavigationAdapter,
  NotificationAdapter,
} from "../../adapters/types";

type UseCreateUserDependencies = {
  apiClient: any;
  navigation: NavigationAdapter;
  notification: NotificationAdapter;
  useAuth: () => {
    getUser: () => Promise<void>;
    setAccessToken: (token: string) => void;
    scheduleTokenRefresh: () => void;
  };
};

export const createUseCreateUser = (deps: UseCreateUserDependencies) => {
  const { apiClient, navigation, notification, useAuth: useAuthBase } = deps;

  return () => {
    const { getUser, setAccessToken, scheduleTokenRefresh } = useAuthBase();
    const createUserApi = createUseCreateUserApi({ apiClient });
    const googleAuth = createUseGoogleAuth({ apiClient });

    const form = useForm<CreateUserRequest>({
      resolver: zodResolver(createUserRequestSchema),
      defaultValues: {
        name: "",
        loginId: "",
        password: "",
      },
    });

    const onSubmit = async (data: CreateUserRequest) => {
      try {
        const { token } = await createUserApi.mutateAsync(data);
        setAccessToken(token);
        scheduleTokenRefresh();
        await getUser();
        // ユーザー作成成功時にホームページにリダイレクト
        navigation.navigate("/");
      } catch (e) {
        notification.toast({
          title: "エラー",
          description: "ユーザー作成に失敗しました",
          variant: "destructive",
        });
      }
    };

    // Google認証成功時のハンドラ
    const handleGoogleSuccess = async (credentialResponse: any) => {
      if (!credentialResponse.credential) {
        notification.toast({
          title: "エラー",
          description: "Google認証に失敗しました",
          variant: "destructive",
        });
        return;
      }
      try {
        const { token } = await googleAuth.mutateAsync(
          credentialResponse.credential,
        );
        setAccessToken(token);
        scheduleTokenRefresh();
        await getUser();
        navigation.navigate("/");
      } catch (e) {
        notification.toast({
          title: "エラー",
          description: "Google認証に失敗しました",
          variant: "destructive",
        });
      }
    };

    // Google認証エラー時のハンドラ
    const handleGoogleError = () => {
      notification.toast({
        title: "エラー",
        description: "Google認証に失敗しました",
        variant: "destructive",
      });
    };

    return {
      form,
      onSubmit,
      handleGoogleSuccess,
      handleGoogleError,
      isLoading: createUserApi.isPending || googleAuth.isPending,
    };
  };
};
