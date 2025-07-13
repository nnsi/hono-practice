import { apiClient } from "@frontend/utils/apiClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";

import {
  type LoginRequest,
  loginRequestSchema,
} from "@dtos/request/LoginRequest";

import { useAuth } from "@hooks/useAuth";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  useToast,
} from "@components/ui";

export const LoginForm: React.FC = () => {
  const { login, setUser, setAccessToken, scheduleTokenRefresh } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<LoginRequest>({
    resolver: zodResolver(loginRequestSchema),
    defaultValues: {
      login_id: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginRequest) => {
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

  return (
    <Card className="w-80">
      <CardHeader>ログインする</CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-wrap gap-5"
          >
            <FormField
              control={form.control}
              name="login_id"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>ログインID</FormLabel>
                  <FormControl>
                    <Input placeholder="ログインID" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>パスワード</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="パスワード"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="m-auto">
              ログイン
            </Button>
          </form>
        </Form>
        <div className="flex flex-col items-center mt-4">
          <GoogleLogin
            onSuccess={async (credentialResponse) => {
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
                  const { user, token } = await res.json();
                  setAccessToken(token);
                  scheduleTokenRefresh();
                  setUser({ ...user, name: user.name ?? null });
                  setTimeout(() => {
                    navigate({ to: "/" });
                  }, 0);
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
            }}
            onError={() => {
              toast({
                title: "エラー",
                description: "Google認証に失敗しました",
                variant: "destructive",
              });
            }}
            useOneTap
          />
        </div>
      </CardContent>
    </Card>
  );
};
