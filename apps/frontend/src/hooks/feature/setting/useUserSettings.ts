import { useToast } from "@frontend/components/ui";
import { useLinkGoogleAccount } from "@frontend/hooks/api";
import { useAuth } from "@frontend/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

export const useUserSettings = () => {
  const { user, logout, getUser } = useAuth();
  const linkGoogleAccount = useLinkGoogleAccount();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isGoogleLinked = user?.providers?.includes("google") || false;
  const googleEmail = user?.providerEmails?.google;

  const handleLogout = async () => {
    try {
      await logout();
      navigate({
        to: "/",
      });
    } catch (e) {
      toast({
        title: "エラー",
        description: "ログアウトに失敗しました",
        variant: "destructive",
      });
    }
  };

  // Googleアカウント紐付け処理
  const handleGoogleLink = async (credentialResponse: any) => {
    if (!credentialResponse.credential) {
      toast({
        title: "Error",
        description: "Failed to link Google account",
        variant: "destructive",
      });
      return;
    }
    try {
      await linkGoogleAccount.mutateAsync(credentialResponse.credential);
      toast({
        title: "Success",
        description: "Successfully linked Google account",
      });
      // ユーザー情報を再取得して「Google連携済み」を表示
      await getUser();
      queryClient.invalidateQueries({ queryKey: ["user", "me"] });
    } catch (e) {
      toast({
        title: "Error",
        description: "Failed to link Google account",
        variant: "destructive",
      });
    }
  };

  // Google紐付けエラー時のハンドラ
  const handleGoogleLinkError = () => {
    toast({
      title: "Error",
      description: "Failed to link Google account",
      variant: "destructive",
    });
  };

  return {
    isGoogleLinked,
    googleEmail,
    handleLogout,
    handleGoogleLink,
    handleGoogleLinkError,
  };
};
