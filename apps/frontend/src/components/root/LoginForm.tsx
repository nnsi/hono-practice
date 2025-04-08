import { zodResolver } from "@hookform/resolvers/zod";
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
} from "@components/ui";

export const LoginForm: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

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
      console.error("LoginForm:", e);
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
      </CardContent>
    </Card>
  );
};
