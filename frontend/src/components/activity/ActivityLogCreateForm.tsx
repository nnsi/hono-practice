import {
  GetActivityLogResponseSchema,
  GetActivityLogsResponse,
} from "@/types/response/GetActivityLogsResponse";
import { PopoverClose } from "@radix-ui/react-popover";
import { useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Form,
  FormField,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  useToast,
} from "@ui/.";
import dayjs from "dayjs";
import { useApiClient } from "../../hooks/useApiClient";
import { useForm } from "react-hook-form";
import {
  CreateActivityLogRequest,
  CreateActivityLogRequestSchema,
} from "@/types/request/CreateActivityLogRequest";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";

type ActivityLogCreateFormProps = {
  activity: {
    id: string;
    name: string;
    quantityLabel: string;
  };
  date?: Date;
};

export const ActivityLogCreateForm: React.FC<ActivityLogCreateFormProps> = ({
  activity,
  date,
}) => {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [timer, setTimer] = useState(0);

  const form = useForm({
    resolver: zodResolver(CreateActivityLogRequestSchema),
    defaultValues: {
      date: dayjs(date).toDate(),
      quantity: undefined,
    },
  });

  const onSubmit = async (data: CreateActivityLogRequest) => {
    if (!date) {
      return toast({
        title: "Error",
        description: "Failed to create activity log",
        variant: "destructive",
      });
    }
    const res = await api.users.activities[":id"].logs.$post({
      param: {
        id: activity.id,
      },
      json: {
        ...data,
      },
    });
    if (res.status !== 200) {
      toast({
        title: "Error",
        description: "Failed to create activity log",
        variant: "destructive",
      });
      return;
    }
    const json = await res.json();
    const parsedJson = GetActivityLogResponseSchema.safeParse(json);
    if (!parsedJson.success) {
      toast({
        title: "Error",
        description: "Failed to create activity log",
        variant: "destructive",
      });
      return;
    }

    queryClient.setQueryData(
      ["activity-logs-daily", dayjs(date).format("YYYY-MM-DD")],
      (prev: GetActivityLogsResponse) => {
        return [...(prev ?? []), parsedJson.data];
      }
    );
    queryClient.setQueryData(
      ["activity-logs-monthly", dayjs(date).format("YYYY-MM")],
      (prev: GetActivityLogsResponse) => {
        return [...(prev ?? []), parsedJson.data];
      }
    );
  };

  const handleMouseDown = () => {
    setTimer(performance.now() + 300);
  };

  return (
    <Popover key={activity.id}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          onMouseDown={handleMouseDown}
          onClick={(e) => {
            if (performance.now() - timer > 0) {
              e.preventDefault();
              form.handleSubmit(onSubmit);
            }
            setTimer(0);
          }}
          className={`${timer > 0 && performance.now() - timer > 0 ? "bg-red-500" : ""}`}
        >
          {activity.name}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 mt-[-0.5rem]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <p className="mb-3 font-bold">[{activity.name}]を記録する</p>
            <div className="grid grid-cols-3 gap-5 items-center">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => <Input {...field} />}
              />
              <Label className="col-span-1">{activity.quantityLabel}</Label>
              <div className="col-span-3 text-center">
                <PopoverClose asChild>
                  <Button type="submit" variant="secondary" className="w-full">
                    Record it!
                  </Button>
                </PopoverClose>
              </div>
            </div>
          </form>
        </Form>
      </PopoverContent>
    </Popover>
  );
};
