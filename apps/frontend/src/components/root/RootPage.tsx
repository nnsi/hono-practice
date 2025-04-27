import { useEffect } from "react";

import { AuthenticatedLayout } from "@frontend/components";
import { CreateUserForm } from "@frontend/components/root/CreateUserForm";
import { LoginForm } from "@frontend/components/root/LoginForm";
import { useAuth } from "@frontend/hooks/useAuth";
import { useNavigate } from "@tanstack/react-router";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Toaster,
  useToast,
} from "@components/ui";

export const RootPage: React.FC = () => {
  const { user, requestStatus, refreshToken } = useAuth();

  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    function handleApiError(e: CustomEvent<string>) {
      toast({
        title: "Error",
        description: e.detail,
        variant: "destructive",
      });
    }
    async function handleUnauthorized() {
      // すでに未認証状態なら何もしない
      if (!user) return;
      try {
        // トークンリフレッシュを試みる
        await refreshToken();
      } catch (e) {
        // リフレッシュに失敗した場合のみログインページにリダイレクト
        navigate({
          to: "/",
        });
      }
    }
    function handleDisablePinchZoom(e: TouchEvent) {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    }
    window.addEventListener("api-error", handleApiError);
    window.addEventListener("unauthorized", handleUnauthorized);
    window.addEventListener("touchstart", handleDisablePinchZoom, {
      passive: false,
    });

    return () => {
      window.removeEventListener("api-error", handleApiError);
      window.removeEventListener("unauthorized", handleUnauthorized);
      window.removeEventListener("touchstart", handleDisablePinchZoom);
    };
  }, []);

  // 認証情報取得中
  if (!user && requestStatus === "loading") return <div>Loading...</div>;

  // ログイン済み
  if (user) {
    return <AuthenticatedLayout />;
  }

  // 未ログインの場合はログインor新規登録フォーム

  return (
    <>
      <div className="w-full flex justify-center p-5">
        <Tabs defaultValue="login" className="w-80">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="login" className="w-1/2">
              Login
            </TabsTrigger>
            <TabsTrigger value="create" className="w-1/2">
              New
            </TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <LoginForm />
          </TabsContent>
          <TabsContent value="create">
            <CreateUserForm />
          </TabsContent>
        </Tabs>
      </div>
      <Toaster />
    </>
  );
};
