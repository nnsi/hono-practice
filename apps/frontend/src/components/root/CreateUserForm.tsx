import { apiClient } from "@frontend/utils/apiClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";

import {
  type CreateUserRequest,
  createUserRequestSchema,
} from "@dtos/request/CreateUserRequest";

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
} from "@components/ui";

export const CreateUserForm: React.FC = () => {
  const api = apiClient;
  const { getUser, setAccessToken, scheduleTokenRefresh } = useAuth();
  const navigate = useNavigate();

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
      console.error("CreateUserForm", e);
    }
  };

  return (
    <Card className="w-80">
      <CardHeader>ユーザー作成</CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-wrap gap-5"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>ユーザー名</FormLabel>
                  <FormControl>
                    <Input placeholder="ユーザー名" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="loginId"
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
              ユーザー作成
            </Button>
          </form>
        </Form>
        <div className="flex flex-col items-center mt-4">
          <GoogleLogin
            onSuccess={async (credentialResponse) => {
              if (!credentialResponse.credential) {
                console.error("Google認証: credentialが取得できませんでした");
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
                  const error = await res.json();
                  console.error("Googleアカウントでユーザー作成失敗", error);
                }
              } catch (e) {
                console.error("Googleアカウントでユーザー作成失敗", e);
              }
            }}
            onError={() => {
              console.error("Googleアカウントでユーザー作成失敗");
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
};
