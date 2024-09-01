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
import { loginRequestSchema, LoginRequest } from "@/types/request/LoginRequest";
import { Card } from "../ui/card";
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
      console.log("done");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Card className="h-svh flex items-center justify-center">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="w-96 flex flex-wrap gap-5"
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
            Submit
          </Button>
        </form>
      </Form>
    </Card>
  );
};
/*
"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { toast } from "@/components/hooks/use-toast"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

const FormSchema = z.object({
  username: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
})

export function InputForm() {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      username: "",
    },
  })

  function onSubmit(data: z.infer<typeof FormSchema>) {
    toast({
      title: "You submitted the following values:",
      description: (
        <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
          <code className="text-white">{JSON.stringify(data, null, 2)}</code>
        </pre>
      ),
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-2/3 space-y-6">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="shadcn" {...field} />
              </FormControl>
              <FormDescription>
                This is your public display name.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  )
}
*/
