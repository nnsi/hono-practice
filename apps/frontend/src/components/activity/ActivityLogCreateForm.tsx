import { useState } from "react";

import { apiClient } from "@frontend/utils/apiClient";
import { zodResolver } from "@hookform/resolvers/zod";
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
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  useToast,
} from "@components/ui";

import type { UseFormReturn } from "react-hook-form";

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
    <Dialog key={activity.id}>
      <DialogTrigger asChild>
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
      </DialogTrigger>
      <DialogContent className="w-80 mt-[-0.5rem]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <p className="mb-3 font-bold">Record [{activity.name}]</p>
            <div className="grid grid-cols-3 gap-3 items-center">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <Input
                    type="number"
                    className="col-span-2"
                    inputMode="numeric"
                    {...field}
                  />
                )}
              />
              <Label className="col-span-1">{activity.quantityUnit}</Label>
              {activity.kinds.length > 0 && (
                <div className="col-span-3">
                  <FormField
                    control={form.control}
                    name="activityKindId"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-3">
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={
                              field.value ? String(field.value) : undefined
                            }
                            className="flex flex-col space-y-1"
                          >
                            {activity.kinds.map((kind) => (
                              <FormItem
                                key={kind.id}
                                className="flex items-center space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <RadioGroupItem value={String(kind.id)} />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {kind.name}
                                </FormLabel>
                              </FormItem>
                            ))}
                          </RadioGroup>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              )}
              <div className="col-span-3 text-center">
                <DialogClose>
                  <Button type="submit" variant="secondary" className="w-full">
                    Record it!
                  </Button>
                </DialogClose>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export function ActivityLogCreateFormBody({
  form,
  activity,
  onSubmit,
}: {
  form: UseFormReturn<CreateActivityLogRequest, any, undefined>;
  activity: GetActivityResponse;
  onSubmit: (data: CreateActivityLogRequest) => Promise<void>;
}) {
  return (
    <Form<CreateActivityLogRequest> {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <p className="mb-3 font-bold">Record [{activity.name}]</p>
        <div className="grid grid-cols-3 gap-3 items-center">
          <FormField<CreateActivityLogRequest>
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <Input
                type="number"
                className="col-span-2"
                inputMode="numeric"
                {...field}
              />
            )}
          />
          <Label className="col-span-1">{activity.quantityUnit}</Label>
          {activity.kinds.length > 0 && (
            <div className="col-span-3">
              <FormField<CreateActivityLogRequest>
                control={form.control}
                name="activityKindId"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={
                          field.value ? String(field.value) : undefined
                        }
                        className="flex flex-col space-y-1"
                      >
                        {activity.kinds.map((kind) => (
                          <FormItem
                            key={kind.id}
                            className="flex items-center space-x-3 space-y-0"
                          >
                            <FormControl>
                              <RadioGroupItem value={String(kind.id)} />
                            </FormControl>
                            <FormLabel className="font-normal">
                              {kind.name}
                            </FormLabel>
                          </FormItem>
                        ))}
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          )}
          <div className="col-span-3 text-center">
            <Button type="submit" variant="secondary" className="w-full">
              Record it!
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
