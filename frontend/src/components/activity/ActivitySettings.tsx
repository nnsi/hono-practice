import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { apiClient } from "@/frontend/src/utils/apiClient";
import {
  CreateActivityRequest,
  CreateActivityRequestSchema,
} from "@/types/request/CreateActivityRequest";
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

  const onSubmit = async (data: CreateActivityRequest) => {
    mutate(data);
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <SheetHeader>
            <SheetTitle>Activity Setting</SheetTitle>
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
        <Accordion
          type="single"
          collapsible
          value={accordionValue}
          onValueChange={setAccordionValue}
        >
          {activities.map((activity) => (
            <AccordionItem value={activity.id} key={activity.id}>
              <AccordionTrigger>{activity.name}</AccordionTrigger>
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
