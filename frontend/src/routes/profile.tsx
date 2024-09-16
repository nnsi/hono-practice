import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { useApiClient } from "@/frontend/src/hooks/useApiClient";

const ProfilePage: React.FC = () => {
  const api = useApiClient();
  const query = useQuery({
    queryKey: ["profile"],
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

  const data = query.data;

  return <>{data && <div>MyName: {data.name || "Anonymous"}</div>}</>;
};

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});
