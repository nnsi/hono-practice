import { useState } from "react";

import { apiClient } from "@frontend/utils/apiClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { PopoverClose } from "@radix-ui/react-popover";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useForm } from "react-hook-form";

import {
  type CreateActivityLogRequest,
  CreateActivityLogRequestSchema,
} from "@dtos/request/CreateActivityLogRequest";
import type { GetActivityResponse } from "@dtos/response";
import {
  GetActivityLogResponseSchema,
  type GetActivityLogsResponse,
} from "@dtos/response/GetActivityLogsResponse";

import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
} from "@components/ui";



type ActivityLogCreateFormProps = {
  activity: GetActivityResponse;
  date?: Date;
};

export const ActivityLogCreateForm: React.FC<ActivityLogCreateFormProps> = ({
  activity,
  date,
}) => {
  const api = apiClient;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [timer, setTimer] = useState(0);

  const form = useForm({
    resolver: zodResolver(CreateActivityLogRequestSchema),
    defaultValues: {
      date: dayjs(date).format("YYYY-MM-DD"),
      quantity: 0,
      activityKindId: undefined,
    },
  });

  form.setValue("date", dayjs(date).format("YYYY-MM-DD"));

  const onSubmit = async (data: CreateActivityLogRequest) => {
    CreateActivityLogRequestSchema.parse(data);
    if (!date) {
      return toast({
        title: "Error",
        description: "Failed to create activity log",
        variant: "destructive",
      });
    }
    const res = await api.users["activity-logs"].$post({
      json: {
        ...data,
        activityId: activity.id,
      },
    });
    if (res.status !== 200) {
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
    form.reset();
    queryClient.setQueryData(
      ["activity-logs-daily", dayjs(date).format("YYYY-MM-DD")],
      (prev: GetActivityLogsResponse) => {
        return [...(prev ?? []), parsedJson.data];
      },
    );
    queryClient.setQueryData(
      ["activity-logs-monthly", dayjs(date).format("YYYY-MM")],
      (prev: GetActivityLogsResponse) => {
        return [...(prev ?? []), parsedJson.data];
      },
    );
  };

  const handleMouseDown = () => {
    const LONG_PRESSED_TIME = 300;
    setTimer(performance.now() + LONG_PRESSED_TIME);
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
              onSubmit(form.getValues());
            }
            setTimer(0);
          }}
          className="flex flex-wrap h-16 px-1"
        >
          <span className="text-xl w-full">{activity.emoji}</span>
          <span className="text-xs w-full">{activity.name}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 mt-[-0.5rem]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <p className="mb-3 font-bold">[{activity.name}]を記録する</p>
            <div className="grid grid-cols-3 gap-3 items-center">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => <Input {...field} />}
              />
              <Label className="col-span-1">{activity.quantityUnit}</Label>
              {activity.kinds.length > 0 && (
                <div className="col-span-3">
                  <FormField
                    control={form.control}
                    name="activityKindId"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-3">
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="サブカテゴリを選択" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {activity.kinds.map((kind) => (
                              <SelectItem key={kind.id} value={kind.id}>
                                {kind.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
              )}
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
