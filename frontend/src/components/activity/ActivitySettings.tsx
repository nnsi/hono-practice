import {
  CreateActivityRequest,
  CreateActivityRequestSchema,
} from "@/types/request/CreateActivityRequest";
import {
  GetActivitiesResponse,
  GetActivityResponseSchema,
} from "@/types/response/GetActivitiesResponse";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Button,
  Form,
  Card,
  Input,
  CardHeader,
  FormField,
  CardTitle,
  CardFooter,
  CardContent,
  buttonVariants,
} from "../ui";
import { useApiClient } from "../../hooks/useApiClient";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/frontend/utils";

type ActivitySettingsProps = {
  activities?: GetActivitiesResponse;
};

export const ActivitySettings: React.FC<ActivitySettingsProps> = ({
  activities,
}) => {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const form = useForm<CreateActivityRequest>({
    resolver: zodResolver(CreateActivityRequestSchema),
  });

  const onSubmit = async (data: CreateActivityRequest) => {
    const res = await api.users.activities.$post({ json: data });
    const json = await res.json();
    const parsedJson = GetActivityResponseSchema.safeParse(json);
    if (!parsedJson.success) {
      console.log(parsedJson.error);
      return;
    }
    queryClient.setQueryData(["activity"], (prev: GetActivitiesResponse) => {
      return [parsedJson.data, ...prev];
    });
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
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
            <CardFooter></CardFooter>
          </Card>
        </form>
      </Form>
      {activities && (
        <ul className="mt-5 border-t border-solid pt-5">
          {activities.map((activity) => (
            <li
              className={cn(buttonVariants({ variant: "ghost" }), "w-full")}
              style={{ justifyContent: "left" }}
            >
              {activity.name}
            </li>
          ))}
        </ul>
      )}
    </>
  );
};
