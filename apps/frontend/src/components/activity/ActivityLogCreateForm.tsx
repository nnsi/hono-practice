
import type {
  CreateActivityLogRequest,
} from "@dtos/request/CreateActivityLogRequest";
import type { GetActivityResponse } from "@dtos/response";

import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
} from "@components/ui";

import type { UseFormReturn } from "react-hook-form";

export function ActivityLogCreateFormBody({
  form,
  activity,
  onSubmit,
}: {
  form: UseFormReturn<CreateActivityLogRequest, any, CreateActivityLogRequest>;
  activity: GetActivityResponse;
  onSubmit: (data: CreateActivityLogRequest) => Promise<void>;
}) {
  return (
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
                autoComplete="off"
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
            <Button type="submit" variant="secondary" className="w-full">
              Record it!
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
