import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/frontend/src/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/frontend/src/components/ui/form";
import { Input } from "@/frontend/src/components/ui/input";
import { useForm } from "react-hook-form";
import {
  createUserRequestSchema,
  CreateUserRequest,
} from "@/types/request/CreateUserRequest";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/frontend/src/components/ui/card";
import { useAuth } from "../../hooks/useAuth";
import { useApiClient } from "@/frontend/src/hooks/useApiClient";

export const CreateUserForm: React.FC = () => {
  const api = useApiClient();
  const { getUser } = useAuth();

  const form = useForm<CreateUserRequest>({
    resolver: zodResolver(createUserRequestSchema),
    defaultValues: {
      name: "",
      login_id: "",
      password: "",
    },
  });

  const onSubmit = async (data: CreateUserRequest) => {
    try {
      await api.auth["create-user"].$post({ json: data });
      await getUser();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="h-svh flex items-center justify-center">
      <Card className="w-96">
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
                ユーザー作成
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};
