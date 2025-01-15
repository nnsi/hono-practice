import {
  loginRequestSchema,
  type LoginRequest,
} from "@dtos/request/LoginRequest";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";


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
    } catch (e) {
      console.error("LoginForm:", e);
    }
  };

  return (
    <div className="h-svh flex items-center justify-center">
      <Card className="w-96">
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
                      <Input placeholder="パスワード" {...field} />
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
    </div>
  );
};
