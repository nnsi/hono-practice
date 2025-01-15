import { apiClient } from "@frontend/utils/apiClient";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";


const ProfilePage: React.FC = () => {
  const api = apiClient;
  const query = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await api.user.me.$get();
      return await res.json();
    },
  });

  const data = query.data;

  return <>{data && <div>MyName: {data.name || "Anonymous"}</div>}</>;
};

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});
