import { useEffect, useState } from "react";

import { apiClient } from "@frontend/utils/apiClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createFileRoute,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import dayjs from "dayjs";

import {
  type GetActivitiesResponse,
  GetActivityLogResponseSchema,
} from "@dtos/response";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  RadioGroup,
  RadioGroupItem,
  Textarea,
  useToast,
} from "@components/ui";

const ActivityModal: React.FC = () => {
  const api = apiClient;
  const { id } = useParams({ from: "/activity/$id" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [memo, setMemo] = useState<string>("");
  const [quantity, setQuantity] = useState<number | null>(null);
  const [activityKindId, setActivityKindId] = useState<string>("");
  const activities = useQuery<GetActivitiesResponse>({
    queryKey: ["activity"],
    enabled: false,
  });

  const query = useQuery({
    queryKey: ["activityDetail", id],
    queryFn: async () => {
      const res = await api.users["activity-logs"][":id"].$get({
        param: { id },
      });

      const json = await res.json();
      const parsedJson = GetActivityLogResponseSchema.safeParse(json);
      if (!parsedJson.success) {
        toast({
          title: "Error",
          description: "Failed to fetch tasks",
          variant: "destructive",
        });
        return;
      }

      setMemo(parsedJson.data.memo);
      setQuantity(parsedJson.data.quantity);
      setActivityKindId(parsedJson.data.activityKind?.id ?? "");
      return parsedJson.data;
    },
  });

  const activity = activities.data?.find(
    (activity) => activity.id === query.data?.activity.id,
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
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => {
    e.preventDefault();
    if (!query.data || !activity) {
      return handleClose();
    }
    await api.users["activity-logs"][":id"].$put({
      param: { id: id },
      json: { memo, quantity: quantity ?? undefined, activityKindId },
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
            {dayjs(query.data?.date).format("YYYY-MM-DD")}
          </DialogTitle>
          <DialogDescription>
            <span>{query.data?.activity.name ?? ""}</span>
            {query.data && (
              <span className="pl-2">
                {query.data.activityKind?.name ?? "未指定"}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-start gap-3">
          <div className="flex items-center gap-2">
            <Input
              defaultValue={quantity ?? ""}
              onChange={(e) => setQuantity(Number.parseInt(e.target.value))}
              className="w-20"
              inputMode="numeric"
            />
            {query.data?.activity.quantityUnit}
          </div>
          {activity?.kinds && (
            <RadioGroup
              className="flex"
              defaultValue={query.data?.activityKind?.id}
              onValueChange={(v) => setActivityKindId(v)}
            >
              <div className="flex items-center space-y-0 gap-1">
                <RadioGroupItem value={""} />
                未指定
              </div>
              {activity.kinds.map((kind) => (
                <div
                  key={kind.id}
                  className="flex items-center space-y-0 gap-1"
                >
                  <RadioGroupItem value={kind.id} />
                  {kind.name}
                </div>
              ))}
            </RadioGroup>
          )}
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
