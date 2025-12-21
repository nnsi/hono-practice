import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Toaster,
} from "@components/ui";
import { AuthenticatedLayout } from "@frontend/components";
import { CreateUserForm } from "@frontend/components/root/CreateUserForm";
import { LoginForm } from "@frontend/components/root/LoginForm";
import { useAuthInitializer } from "@frontend/hooks/feature/auth/useAuthInitializer";

export const RootPage: React.FC = () => {
  const { isInitialized, user, requestStatus } = useAuthInitializer();

  // 初期化中（/tokenリクエスト中）
  if (!isInitialized) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium">Loading...</div>
        </div>
      </div>
    );
  }

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
