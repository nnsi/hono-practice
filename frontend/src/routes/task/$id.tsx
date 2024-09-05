import {
  createFileRoute,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { useApiClient } from "../../hooks/useApiClient";
import { useQuery } from "@tanstack/react-query";
import { Textarea } from "../../components/ui/textarea";
import { useState } from "react";
import { useToast } from "../../components/ui/use-toast";

const TaskDetail: React.FC = () => {
  const { id } = useParams({ from: "/task/$id" });
  const navigate = useNavigate();
  const api = useApiClient();
  const [memo, setMemo] = useState<string>("");
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ["task", id],
    queryFn: async () => {
      const res = await api.users.tasks[":id"].$get({
        param: { id },
      });
      if (res.status === 200) {
        return await res.json();
      }

      const json = await res.json();
      console.log(json.message);
      return;
    },
  });

  const task = query.data;

  const handleClose = () => {
    navigate({ to: "/task" });
  };

  const handleSubmit = async () => {
    if (!memo) return handleClose();
    const res = await api.users.tasks[":id"].$put({
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
      const json = await res.json();
      toast({
        title: "Error",
        description: json.message,
      });
    }
  };

  if (!task)
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
          <DialogTitle>{task.title}</DialogTitle>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto">
          <Textarea
            id="username"
            defaultValue={task.memo || ""}
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
