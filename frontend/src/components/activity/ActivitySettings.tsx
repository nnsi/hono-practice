import { useState } from "react";

import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { zodResolver } from "@hookform/resolvers/zod";
import { DragHandleVerticalIcon } from "@radix-ui/react-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { apiClient } from "@/frontend/src/utils/apiClient";
import {
  CreateActivityRequest,
  CreateActivityRequestSchema,
} from "@/types/request/CreateActivityRequest";
import { UpdateActivityOrderRequest } from "@/types/request/UpdateActivityRequest";
import {
  GetActivitiesResponse,
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

type ActivitySettingsProps = {
  activities?: GetActivitiesResponse;
};

export const ActivitySettings: React.FC<ActivitySettingsProps> = ({
  activities,
}) => {
  const api = apiClient;
  const form = useForm<CreateActivityRequest>({
    resolver: zodResolver(CreateActivityRequestSchema),
  });
  const [accordionValue, setAccordionValue] = useState<string>("");
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
          (a) => a.id === newOrder.current
        );
        const [reorderedActivity] = newActivities.splice(currentIndex, 1);
        const destinationIndex = newOrder.prev
          ? newActivities.findIndex((a) => a.id === newOrder.prev) + 1
          : 0;
        newActivities.splice(destinationIndex, 0, reorderedActivity);
        return newActivities;
      });
    },
  });

  const onSubmit = async (data: CreateActivityRequest) => {
    mutate(data);
  };

  const onDragEnd = (result: DropResult) => {
    if (
      !activities ||
      !result.destination ||
      result.source.index === result.destination?.index
    )
      return;

    const newOrder: UpdateActivityOrderRequest = {
      prev: activities[result.destination.index]?.id,
      next: activities[result.destination.index + 1]?.id,
      current: result.draggableId,
    };

    if (result.destination.index === 0) {
      newOrder.next = newOrder.prev;
      newOrder.prev = undefined;
    }

    mutateOrder(newOrder);
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
      {activities && (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="dnd-accordion">
            {(provided) => (
              <Accordion
                type="single"
                collapsible
                value={accordionValue}
                onValueChange={setAccordionValue}
                ref={provided.innerRef}
                {...provided.droppableProps}
              >
                {activities.map((activity, index) => (
                  <Draggable
                    key={activity.id}
                    draggableId={activity.id}
                    index={index}
                  >
                    {(provided) => (
                      <div ref={provided.innerRef} {...provided.draggableProps}>
                        <AccordionItem value={activity.id}>
                          <div className="flex items-center gap-3">
                            <span {...provided.dragHandleProps}>
                              <DragHandleVerticalIcon />
                            </span>
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
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </Accordion>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </>
  );
};
