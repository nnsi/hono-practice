import {
  UpdateActivityRequest,
  UpdateActivityRequestSchema,
} from "@/types/request/UpdateActivityRequest";
import {
  GetActivitiesResponse,
  GetActivityResponse,
  GetActivityResponseSchema,
} from "@/types/response";
import { zodResolver } from "@hookform/resolvers/zod";
import { TrashIcon } from "@radix-ui/react-icons";
import { useForm, useFieldArray } from "react-hook-form";
import { Form, Button, FormField, Input } from "../ui";
import { useApiClient } from "../../hooks/useApiClient";
import { useQueryClient } from "@tanstack/react-query";

type ActivityEditFormProps = {
  activity: GetActivityResponse;
};

export const ActivityEditForm: React.FC<ActivityEditFormProps> = ({
  activity,
}) => {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const form = useForm<UpdateActivityRequest>({
    resolver: zodResolver(UpdateActivityRequestSchema),
    defaultValues: {
      activity: {
        name: activity.name,
        description: activity.description,
        quantityLabel: activity.quantityLabel,
      },
      options: activity.options.map((option) => ({
        id: option.id,
        quantity: option.quantity,
      })),
      kinds: activity.kinds.map((kind) => ({
        id: kind.id,
        name: kind.name,
      })),
    },
  });
  /*
  const {
    fields: optionFields,
    append: optiponAppend,
    remove: optionRemove,
  } = useFieldArray({
    control: form.control,
    name: "options",
  });
*/
  const {
    fields: kindFields,
    append: kindAppend,
    remove: kindRemove,
  } = useFieldArray({
    control: form.control,
    name: "kinds",
  });

  const onSubmit = async (data: UpdateActivityRequest) => {
    const res = await api.users.activities[":id"].$put({
      param: { id: activity.id },
      json: data,
    });
    const json = await res.json();
    const parsedJson = GetActivityResponseSchema.safeParse(json);
    if (!parsedJson.success) {
      console.log(parsedJson.error);
      return;
    }
    queryClient.setQueryData(["activity"], (prev: GetActivitiesResponse) => {
      return prev.map((activity) => {
        if (activity.id === parsedJson.data.id) {
          return parsedJson.data;
        }
        return activity;
      });
    });
  };

  return (
    <>
      <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
        <TrashIcon
          onClick={(e) => {
            e.preventDefault();
          }}
        />
      </div>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-wrap gap-3 p-2"
        >
          <FormField
            control={form.control}
            name="activity.name"
            render={({ field }) => <Input {...field} />}
          />

          {kindFields.map((field, index) => (
            <div key={field.id} className="flex w-full gap-3">
              <FormField
                key={field.id}
                control={form.control}
                name={`kinds.${index}.name`}
                render={({ field }) => <Input {...field} />}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => kindRemove(index)}
              >
                -
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => kindAppend({ name: "" })}
          >
            +
          </Button>
          <Button type="submit">Save</Button>
        </form>
      </Form>
    </>
  );
};
