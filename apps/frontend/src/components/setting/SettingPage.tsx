import { ApiKeyManager } from "@frontend/components/apiKey";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
  useToast,
} from "@frontend/components/ui";
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

  return (
    <div className="w-full max-w-3xl mx-auto">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="account">
          <AccordionTrigger className="text-lg font-semibold">
            アカウント設定
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-4">
                <Button onClick={handleLogout} variant="outline">
                  ログアウト
                </Button>
                {isGoogleLinked ? (
                  <div className="flex items-center gap-2">
                    <span className="text-green-600 font-medium">
                      Google認証済み
                    </span>
                  </div>
                ) : (
                  <GoogleLogin
                    onSuccess={handleGoogleLink}
                    onError={handleGoogleLinkError}
                  />
                )}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="api-keys">
          <AccordionTrigger className="text-lg font-semibold">
            APIキー管理
          </AccordionTrigger>
          <AccordionContent>
            <ApiKeyManager />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
