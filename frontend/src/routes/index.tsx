import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/frontend/src/hooks/api";
import { Button } from "@/frontend/src/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/frontend/src/components/ui/card";

export const App: React.FC = () => {
  const api = useApiClient();
  const query = useQuery({
    queryKey: ["hello"],
    queryFn: async () => {
      const res = await api.hello.$get();
      if (res.status === 200) {
        return await res.json();
      } else if (res.status === 500) {
        const json = await res.json();
        console.log(json.message);
      }
      return await res.json();
    },
  });

  return (
    <div className="m-5">
      <Card className={"m-auto w-1/2"}>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card Description</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Card Content</p>
        </CardContent>
        <CardFooter>
          <p>Card Footer</p>
        </CardFooter>
      </Card>
      <Button>Hello {query.data?.message}</Button>
    </div>
  );
};

export const Route = createFileRoute("/")({
  component: App,
});
