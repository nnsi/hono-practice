import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { apiClient } from "@/frontend/src/utils/apiClient";
import {
  type CreateActivityRequest,
  CreateActivityRequestSchema,
} from "@/types/request/CreateActivityRequest";
import type { UpdateActivityOrderRequest } from "@/types/request/UpdateActivityRequest";
import {
  type GetActivitiesResponse,
  GetActivityResponseSchema,
} from "@/types/response/GetActivitiesResponse";

import {
  Button,
  Form,
  Card,
  Input,
  CardHeader,
  FormField,
  CardTitle,
  CardContent,
  SheetHeader,
  SheetTitle,
  AccordionTrigger,
  Accordion,
  AccordionContent,
  AccordionItem,
  SheetDescription,
} from "@components/ui";

import { mp } from "../../utils";

import { ActivityEditForm } from "./ActivityEditForm";

type ActivitySettingsProps = {};

export const ActivitySettings: React.FC<ActivitySettingsProps> = () => {
  const api = apiClient;
  const form = useForm<CreateActivityRequest>({
    resolver: zodResolver(CreateActivityRequestSchema),
  });
  const [accordionValue, setAccordionValue] = useState<string>("");

  const { data: activities } = useQuery<GetActivitiesResponse>({
    queryKey: ["activity"],
    enabled: false,
  });

  const [localActivities, setLocalActivities] = useState<
    GetActivitiesResponse | undefined
  >([]);
  useEffect(() => {
    if (activities) {
      setLocalActivities(activities);
    }
  }, [activities]);

  const queryClient = useQueryClient();
  const { mutate } = useMutation({
    ...mp({
      queryKey: ["activity"],
      mutationFn: (data: CreateActivityRequest) =>
        api.users.activities.$post({
          json: data,
        }),
      requestSchema: CreateActivityRequestSchema,
      responseSchema: GetActivityResponseSchema,
    }),
  });

  // @ts-expect-error いずれ再びD&D出来るようにする
  const { mutate: mutateOrder } = useMutation({
    ...mp({
      queryKey: ["activity"],
      mutationFn: (data: UpdateActivityOrderRequest) =>
        api.users.activities[":id"].order.$put({
          param: { id: data.current },
          json: data,
        }),
    }),
    onMutate: async (newOrder: UpdateActivityOrderRequest) => {
      queryClient.setQueryData(["activity"], (prev: GetActivitiesResponse) => {
        const newActivities = [...prev];
        const currentIndex = newActivities.findIndex(
          (a) => a.id === newOrder.current,
        );
        const [reorderedActivity] = newActivities.splice(currentIndex, 1);
        const destinationIndex = newOrder.prev
          ? newActivities.findIndex((a) => a.id === newOrder.prev) + 1
          : 0;
        newActivities.splice(destinationIndex, 0, reorderedActivity);
        return newActivities;
      });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
  });

  const onSubmit = async (data: CreateActivityRequest) => {
    mutate(data);
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <SheetHeader>
            <SheetTitle>Activity Setting</SheetTitle>
            <SheetDescription></SheetDescription>
            <Card>
              <CardHeader>
                <CardTitle>New Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-3">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <Input
                        type="text"
                        className="col-span-3"
                        placeholder="Activity Name"
                        {...field}
                      />
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="quantityLabel"
                    render={({ field }) => (
                      <Input type="text" placeholder="Label" {...field} />
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <Input
                        className="col-span-3"
                        type="text"
                        placeholder="Description"
                        {...field}
                      />
                    )}
                  />
                  <Button type="submit">Create</Button>
                </div>
              </CardContent>
            </Card>
          </SheetHeader>
        </form>
      </Form>
      {localActivities && (
        <Accordion
          type="single"
          collapsible
          value={accordionValue}
          onValueChange={setAccordionValue}
        >
          {localActivities.map((activity) => (
            <AccordionItem value={activity.id}>
              <div className="flex items-center gap-3">
                <div className="flex-1 w-full">
                  <AccordionTrigger id={activity.id}>
                    {activity.name}
                  </AccordionTrigger>
                </div>
              </div>
              <AccordionContent className="relative group">
                <ActivityEditForm
                  activity={activity}
                  handleClose={() => setAccordionValue("")}
                />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </>
  );
};
