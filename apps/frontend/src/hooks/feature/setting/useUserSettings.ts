import { useToast } from "@frontend/components/ui";
import { useAuth } from "@frontend/hooks/useAuth";
import { apiClient } from "@frontend/utils/apiClient";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

export const useUserSettings = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isGoogleLinked = user?.providers?.includes("google");

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
      const res = await apiClient.auth.google.link.$post({
        json: { credential: credentialResponse.credential },
      });
      if (res.status === 200) {
        toast({
          title: "Success",
          description: "Successfully linked Google account",
        });
        queryClient.invalidateQueries({ queryKey: ["user", "me"] });
      } else {
        toast({
          title: "Error",
          description: "Failed to link Google account",
        });
      }
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
    handleLogout,
    handleGoogleLink,
    handleGoogleLinkError,
  };
};
