import { useEffect, useState } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createFileRoute,
  useNavigate,
  useParams,
} from "@tanstack/react-router";

import { apiClient } from "@/frontend/src/utils/apiClient";
import { GetTaskResponseSchema } from "@/types/response";

import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Textarea,
  useToast,
} from "@components/ui";

import { qp } from "../../utils/queryParams";

const TaskDetail: React.FC = () => {
  const { id } = useParams({ from: "/task/$id" });
  const navigate = useNavigate();
  const api = apiClient.users.tasks[":id"];
  const [memo, setMemo] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, error } = useQuery({
    ...qp({
      queryKey: ["task", id],
      queryFn: () =>
        api.$get({
          param: { id },
        }),
      schema: GetTaskResponseSchema,
    }),
  });

  useEffect(() => {
    return () => {
      queryClient.removeQueries({ queryKey: ["task", id] });
    };
  }, []);

  if (error) {
    toast({
      title: "Error",
      description: error.message,
    });
  }

  const handleClose = () => {
    navigate({ to: "/task" });
  };

  const handleSubmit = async () => {
    if (!memo) return handleClose();
    const res = await api.$put({
      param: { id },
      json: { memo },
    });
    if (res.status === 200) {
      await res.json();
      toast({
        title: "Success",
        description: "Task has been updated successfully",
      });
      navigate({ to: "/task" });
    } else {
      const json = (await res.json()) as any;

      toast({
        title: "Error",
        description: json.message,
      });
    }
  };

  if (!data)
    return (
      <Dialog
        open={true}
        onOpenChange={(open) => {
          if (!open) handleClose();
        }}
      />
    );

  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent className="flex flex-col w-[50%] max-w-full h-1/2 max-h-full min-w-96">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{data.title}</DialogTitle>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto">
          <Textarea
            id="username"
            defaultValue={data.memo || ""}
            className="h-full"
            onChange={(e) => setMemo(e.target.value)}
          />
        </div>
        <DialogFooter className="flex-shrink-0">
          <Button type="submit" onClick={handleSubmit}>
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const Route = createFileRoute("/task/$id")({
  component: TaskDetail,
});
