import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@ui/form";
import { Input } from "@ui/input";
import { useForm } from "react-hook-form";
import { loginRequestSchema, LoginRequest } from "@/types/request/LoginRequest";
import { Card, CardContent, CardHeader } from "@ui/card";
import { useAuth } from "../../hooks/useAuth";

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
      console.error(e);
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
