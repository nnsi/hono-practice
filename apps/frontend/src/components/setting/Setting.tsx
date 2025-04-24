import { Button, useToast } from "@frontend/components/ui";
import { useAuth } from "@frontend/hooks/useAuth";
import { apiClient } from "@frontend/utils/apiClient";
import { qp } from "@frontend/utils/queryParams";
import { GoogleLogin } from "@react-oauth/google";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import {
  GetUserResponseSchema,
  type GetUserResponse,
} from "@dtos/response/GetUserResponse";

export const Setting: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<GetUserResponse>({
    ...qp({
      queryKey: ["user", "me"],
      queryFn: () => apiClient.user.me.$get(),
      schema: GetUserResponseSchema,
    }),
  });

  const isGoogleLinked = data?.providers?.includes("google");

  const handleLogout = async () => {
    try {
      await logout();
      navigate({
        to: "/",
      });
    } catch (e) {
      console.error("Root", e);
    }
  };

  // Googleアカウント紐付け処理
  const handleGoogleLink = async (credentialResponse: any) => {
    if (!credentialResponse.credential) {
      toast({
        title: "Error",
        description: "Failed to link Google account",
        variant: "destructive",
      });
      return;
    }
    try {
      const res = await apiClient.auth.google.link.$post({
        json: { credential: credentialResponse.credential },
      });
      if (res.status === 200) {
        toast({
          title: "Success",
          description: "Successfully linked Google account",
        });
        queryClient.invalidateQueries({ queryKey: ["user", "me"] });
      } else {
        toast({
          title: "Error",
          description: "Failed to link Google account",
        });
      }
    } catch (e) {
      toast({
        title: "Error",
        description: "Failed to link Google account",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Button onClick={handleLogout}>Logout</Button>
      <div style={{ marginTop: 16 }}>
        {isLoading ? (
          <span>Loading...</span>
        ) : isGoogleLinked ? (
          <span style={{ color: "green", fontWeight: "bold" }}>
            Google認証済み
          </span>
        ) : (
          <GoogleLogin
            onSuccess={handleGoogleLink}
            onError={() => alert("Google認証に失敗しました")}
          />
        )}
      </div>
    </>
  );
};
