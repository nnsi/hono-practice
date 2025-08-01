import { useGoogleAuth } from "@frontend/hooks/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";

import {
  type LoginRequest,
  loginRequestSchema,
} from "@dtos/request/LoginRequest";

import { useAuth } from "@hooks/useAuth";

import { useToast } from "@components/ui";

export const useLogin = () => {
  const { login, setUser, setAccessToken, scheduleTokenRefresh } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // フォーム管理
  const form = useForm<LoginRequest>({
    resolver: zodResolver(loginRequestSchema),
    defaultValues: {
      login_id: "",
      password: "",
    },
  });

  // 通常のログイン処理
  const handleLogin = async (data: LoginRequest) => {
    try {
      await login(data);
      // ログイン成功時にホームページにリダイレクト
      navigate({ to: "/" });
    } catch (e) {
      toast({
        description: "ログインIDまたはパスワードが間違っています",
        variant: "destructive",
      });
    }
  };

  const googleAuth = useGoogleAuth();

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
      const { user, token } = await googleAuth.mutateAsync(
        credentialResponse.credential,
      );
      setAccessToken(token);
      scheduleTokenRefresh();
      setUser({ ...user, name: user.name ?? null });
      setTimeout(() => {
        navigate({ to: "/" });
      }, 0);
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
    handleLogin,
    handleGoogleSuccess,
    handleGoogleError,
  };
};
