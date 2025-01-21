import { useEffect, useState } from "react";

import { CreateUserForm } from "@frontend/components/root/CreateUserForm";
import { LoginForm } from "@frontend/components/root/LoginForm";
import { useAuth } from "@frontend/hooks/useAuth";
import {
  ArchiveIcon,
  FileTextIcon,
  HomeIcon,
  RocketIcon,
} from "@radix-ui/react-icons";
import {
  Link,
  Outlet,
  createRootRoute,
  useNavigate,
} from "@tanstack/react-router";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Toaster,
  useToast,
} from "@components/ui";

// ログイン済みユーザー向けのルートコンポーネント
const AuthenticatedHome: React.FC = () => {
  return (
    <>
      <div className="h-screen w-full max-w-3xl mx-auto flex flex-col">
        <main className="flex-1 p-4 overflow-y-auto">
          <Outlet />
        </main>
        <footer className="w-full bg-gray-50 shadow-lg">
          <nav className="flex justify-around items-center p-4">
            <Link
              to="/"
              className="[&.active]:font-bold [&.active]:text-blue-600"
            >
              <button type="button" className="flex flex-col items-center">
                <HomeIcon />
                <span className="text-xs mt-1">Home</span>
              </button>
            </Link>
            <Link
              to="/task"
              className="[&.active]:font-bold [&.active]:text-blue-600"
            >
              <button type="button" className="flex flex-col items-center">
                <FileTextIcon />
                <span className="text-xs mt-1">Task</span>
              </button>
            </Link>
            <Link
              to="/activity"
              className="[&.active]:font-bold [&.active]:text-blue-600"
            >
              <button type="button" className="flex flex-col items-center">
                <ArchiveIcon />
                <span className="text-xs mt-1">Activity</span>
              </button>
            </Link>
            <Link
              to="/goal"
              className="[&.active]:font-bold [&.active]:text-blue-600"
            >
              <button type="button" className="flex flex-col items-center">
                <RocketIcon />
                <span className="text-xs mt-1">Goal</span>
              </button>
            </Link>
          </nav>
        </footer>
      </div>
      <Toaster />
    </>
  );
};

const RootComponent: React.FC = () => {
  const { user, getUser } = useAuth();

  const [isTriedAuthentication, setIsTrieduthentication] = useState(false);

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
    function handleUnauthorized() {
      navigate({
        to: "/",
      });
    }
    window.addEventListener("api-error", handleApiError);
    window.addEventListener("unauthorized", handleUnauthorized);
    (async () => {
      await getUser();
      setIsTrieduthentication(true);
    })();

    return () => {
      window.removeEventListener("api-error", handleApiError);
      window.removeEventListener("unauthorized", handleUnauthorized);
    };
  }, []);

  // 認証情報取得中
  if (!isTriedAuthentication) return <div>Loading...</div>;

  // ログイン済み
  if (user) {
    return <AuthenticatedHome />;
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

export const Route = createRootRoute({
  component: RootComponent,
});
