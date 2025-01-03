import { zodResolver } from "@hookform/resolvers/zod";
import { TrashIcon } from "@radix-ui/react-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFieldArray, useForm } from "react-hook-form";

import { apiClient } from "@/frontend/src/utils/apiClient";
import {
  type UpdateActivityRequest,
  UpdateActivityRequestSchema,
} from "@/types/request/UpdateActivityRequest";
import {
  type GetActivityResponse,
  GetActivityResponseSchema,
} from "@/types/response";

import { Button, Form, FormField, Input } from "@components/ui";

import { mp } from "../../utils";

type ActivityEditFormProps = {
  activity: GetActivityResponse;
  handleClose: () => void;
};

export const ActivityEditForm: React.FC<ActivityEditFormProps> = ({
  activity,
  handleClose,
}) => {
  const api = apiClient;
  const queryClient = useQueryClient();
  const form = useForm<UpdateActivityRequest>({
    resolver: zodResolver(UpdateActivityRequestSchema),
    defaultValues: {
      activity: {
        name: activity.name,
        description: activity.description,
        quantityUnit: activity.quantityUnit,
        emoji: activity.emoji,
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
  const {
    fields: kindFields,
    append: kindAppend,
    remove: kindRemove,
  } = useFieldArray({
    control: form.control,
    name: "kinds",
  });

  const { mutate } = useMutation({
    ...mp({
      queryKey: ["activity"],
      mutationFn: (data: UpdateActivityRequest) =>
        api.users.activities[":id"].$put({
          param: { id: activity.id },
          json: data,
        }),
      requestSchema: UpdateActivityRequestSchema,
      responseSchema: GetActivityResponseSchema,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity"] });
      handleClose();
    },
  });

  const onSubmit = async (data: UpdateActivityRequest) => {
    mutate(data);
  };

  const handleDelete = async (id: string) => {
    const res = await api.users.activities[":id"].$delete({
      param: { id },
    });
    if (res.status !== 200) {
      console.log("failed to delete activity");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["activity"] });
    handleClose();
  };

  return (
    <>
      <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
        <TrashIcon
          onClick={(e) => {
            e.preventDefault();
            handleDelete(activity.id);
          }}
        />
      </div>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-wrap gap-3 p-2"
        >
          <div className="flex w-full gap-3">
            <FormField
              control={form.control}
              name="activity.name"
              render={({ field }) => <Input {...field} className="flex-grow" />}
            />

            <FormField
              control={form.control}
              name="activity.emoji"
              render={({ field }) => (
                <Input {...field} className="text-center" />
              )}
            />
          </div>

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
