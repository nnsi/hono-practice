import { apiClient } from "@frontend/utils/apiClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";

import {
  type CreateUserRequest,
  createUserRequestSchema,
} from "@dtos/request/CreateUserRequest";

import { useAuth } from "@hooks/useAuth";

import { useToast } from "@components/ui";

export const useCreateUser = () => {
  const api = apiClient;
  const { getUser, setAccessToken, scheduleTokenRefresh } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

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
      const res = await api.user.$post({ json: data });
      if (res.status === 200) {
        const { token } = await res.json();
        setAccessToken(token);
        scheduleTokenRefresh();
        await getUser();
        // ユーザー作成成功時にホームページにリダイレクト
        navigate({ to: "/" });
      }
    } catch (e) {
      toast({
        title: "エラー",
        description: "ユーザー作成に失敗しました",
        variant: "destructive",
      });
    }
  };

  // Google認証成功時のハンドラ
  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse.credential) {
      toast({
        title: "エラー",
        description: "Google認証に失敗しました",
        variant: "destructive",
      });
      return;
    }
    try {
      const res = await apiClient.auth.google.$post({
        json: { credential: credentialResponse.credential },
      });
      if (res.status === 200) {
        const { token } = await res.json();
        setAccessToken(token);
        scheduleTokenRefresh();
        await getUser();
        navigate({ to: "/" });
      } else {
        await res.json();
        toast({
          title: "エラー",
          description: "Google認証に失敗しました",
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({
        title: "エラー",
        description: "Google認証に失敗しました",
        variant: "destructive",
      });
    }
  };

  // Google認証エラー時のハンドラ
  const handleGoogleError = () => {
    toast({
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
  };
};
