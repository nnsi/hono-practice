import { useEffect, useState } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createFileRoute,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import dayjs from "dayjs";

import {
  GetActivitiesResponse,
  GetActivityLogResponseSchema,
} from "@/types/response";

import { useApiClient } from "@hooks/useApiClient";

import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogFooter,
  Textarea,
  Input,
  DialogDescription,
} from "@components/ui";

const ActivityModal: React.FC = () => {
  const api = useApiClient();
  const { id } = useParams({ from: "/activity/$id" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [memo, setMemo] = useState<string>("");
  const [quantity, setQuantity] = useState<number | null>(null);
  const activities = useQuery<GetActivitiesResponse>({
    queryKey: ["activity"],
    enabled: false,
  });

  const query = useQuery({
    queryKey: ["activityDetail", id],
    queryFn: async () => {
      const res = await api.users["activity-logs"].single[":id"].$get({
        param: { id },
      });
      if (res.status !== 200) {
        const json = await res.json();
        console.log(json.message);
        return;
      }

      const json = await res.json();
      const parsedJson = GetActivityLogResponseSchema.safeParse(json);
      if (!parsedJson.success) {
        console.log(JSON.stringify(parsedJson.error));
        return;
      }

      setMemo(parsedJson.data.memo);
      setQuantity(parsedJson.data.quantity);
      return parsedJson.data;
    },
  });

  const activity = activities.data?.find(
    (activity) => activity.id === query.data?.activity.id
  );

  useEffect(() => {
    return () => {
      queryClient.removeQueries({ queryKey: ["activityDetail", id] });
    };
  }, []);

  const handleClose = () => {
    navigate({ to: "/activity" });
  };

  const handleSubmit = async (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    e.preventDefault();
    if (!query.data || !activity) {
      return handleClose();
    }
    await api.users.activities[":id"].logs[":logId"].$put({
      param: { logId: id, id: activity.id },
      json: { memo, quantity: quantity ?? undefined },
    });
    queryClient.invalidateQueries({
      queryKey: [
        "activity-logs-daily",
        dayjs(query.data.date).format("YYYY-MM-DD"),
      ],
    });

    return handleClose();
  };

  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent className="flex flex-col w-1/2 max-w-full h-1/2 max-h-full min-w-96">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {dayjs(query.data?.date).format("YYYY-MM-DD")} -
            {query.data?.activity.name}
          </DialogTitle>
          <DialogDescription></DialogDescription>
        </DialogHeader>
        <div className="flex justify-between">
          <div className="flex items-center gap-2">
            <Input
              defaultValue={quantity ?? ""}
              onChange={(e) => setQuantity(parseInt(e.target.value))}
              className="w-14"
              inputMode="numeric"
            />
            {query.data?.activity.quantityLabel}
          </div>
        </div>
        <Textarea
          defaultValue={query.data?.memo || ""}
          className="h-full"
          onChange={(e) => setMemo(e.target.value)}
        />
        <DialogFooter className="flex-shrink-0">
          <Button type="submit" onClick={handleSubmit}>
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const Route = createFileRoute("/activity/$id")({
  component: ActivityModal,
});
