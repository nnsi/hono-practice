import { apiClient } from "@frontend/utils/apiClient";
import { zodResolver } from "@hookform/resolvers/zod";
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
  const { getUser } = useAuth();

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
      const json = await res.json();
      localStorage.setItem("token", json.token);

      await getUser();
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
  );
};
