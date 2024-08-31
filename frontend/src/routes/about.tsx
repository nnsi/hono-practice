import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/frontend/src/hooks/api";

const About: React.FC = () => {
  const api = useApiClient();
  const query = useQuery({
    queryKey: ["hello"],
    queryFn: async () => {
      const res = await api.users.me.$get();
      if (res.status === 200) {
        return await res.json();
      } else {
        const json = (await res.json()) as { message: string };
        console.log(json.message);
        return;
      }
    },
  });
  return <div>{query.data?.id}</div>;
};

export const Route = createFileRoute("/about")({
  component: About,
});
