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
import { useLogin } from "@hooks/feature/login/useLogin";
import { GoogleLogin } from "@react-oauth/google";

export const LoginForm: React.FC = () => {
  const { form, handleLogin, handleGoogleSuccess, handleGoogleError } =
    useLogin();

  return (
    <Card className="w-80">
      <CardHeader>ログインする</CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={handleLogin} className="flex flex-wrap gap-5">
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
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            useOneTap
          />
        </div>
      </CardContent>
    </Card>
  );
};
