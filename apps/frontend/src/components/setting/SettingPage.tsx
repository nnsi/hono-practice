import { ApiKeyManager } from "@frontend/components/apiKey";
import { Button, useToast } from "@frontend/components/ui";
import { useAuth } from "@frontend/hooks/useAuth";
import { apiClient } from "@frontend/utils/apiClient";
import { GoogleLogin } from "@react-oauth/google";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

export const SettingPage: React.FC = () => {
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
      console.error("Root", e);
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

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">アカウント</h3>
          <div className="flex items-center gap-4">
            <Button onClick={handleLogout}>ログアウト</Button>
            {isGoogleLinked ? (
              <span style={{ color: "green", fontWeight: "bold" }}>
                Google認証済み
              </span>
            ) : (
              <GoogleLogin
                onSuccess={handleGoogleLink}
                onError={() =>
                  toast({
                    title: "Error",
                    description: "Failed to link Google account",
                    variant: "destructive",
                  })
                }
              />
            )}
          </div>
        </div>
      </div>

      <ApiKeyManager />
    </div>
  );
};
