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
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { useApiClient } from "../../hooks/useApiClient";
import { useQuery } from "@tanstack/react-query";
import { Textarea } from "../../components/ui/textarea";

const TaskDetail: React.FC = () => {
  const { id } = useParams({ from: "/task/$id" });
  const navigate = useNavigate();
  const api = useApiClient();
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
      <DialogContent className="w-96 max-w-full h-1/2 max-h-full min-w-96">
        <DialogHeader>
          <DialogTitle>{task.title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              タスク名
            </Label>
            <Input id="name" defaultValue={task.title} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="username" className="text-right">
              メモ
            </Label>
            <Textarea
              rows={3}
              id="username"
              defaultValue={task.memo}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit">Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const Route = createFileRoute("/task/$id")({
  component: TaskDetail,
});
