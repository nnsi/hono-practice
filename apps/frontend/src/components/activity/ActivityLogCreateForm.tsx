import type { CreateActivityLogRequest } from "@dtos/request/CreateActivityLogRequest";
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
                autoFocus
                onFocus={(e) => e.target.select()}
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
                  <FormItem className="w-full">
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={
                          field.value ? String(field.value) : undefined
                        }
                        className="flex flex-col space-y-0"
                      >
                        {activity.kinds.map((kind) => (
                          <FormItem
                            key={kind.id}
                            className="flex items-center space-x-3 space-y-0"
                          >
                            <FormLabel className="flex items-center w-full cursor-pointer border border-gray-200 rounded-md px-3 py-2 hover:bg-gray-50 has-[:checked]:bg-gray-100 transition-colors">
                              <FormControl>
                                <RadioGroupItem
                                  value={String(kind.id)}
                                  className="mr-3"
                                />
                              </FormControl>
                              <span className="font-normal mt-[-1px]">
                                {kind.name}
                              </span>
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
