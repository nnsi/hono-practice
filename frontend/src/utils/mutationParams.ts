import {
  type MutationFunction,
  type QueryKey,
  useQueryClient,
} from "@tanstack/react-query";

import type { ZodSchema } from "zod";

type MaybeUndefined<T> = T extends void ? void : T | undefined;

type MutationPropsParamsFunc<TRequest = void, TResponse = unknown> = {
  queryKey: QueryKey;
  mutationFn: (data: TRequest) => Promise<Response>;
  requestSchema?: ZodSchema<TResponse>;
  responseSchema?: ZodSchema;
};

export function mp<TRequest = void, TResponse = unknown>({
  queryKey,
  mutationFn,
  requestSchema,
  responseSchema,
}: MutationPropsParamsFunc<TRequest, TResponse>): {
  mutationFn: MutationFunction<TResponse, MaybeUndefined<TRequest>>;
  onSuccess: () => void;
} {
  const queryClient = useQueryClient();
  return {
    mutationFn: async (data: MaybeUndefined<TRequest>) => {
      if (requestSchema) {
        requestSchema.parse(data);
      }
      const res = await mutationFn(data as TRequest);

      const json = await res.json();
      if (!responseSchema) {
        return json;
      }

      const parsedResult = responseSchema.safeParse(json);
      if (!parsedResult.success) {
        throw parsedResult.error;
      }

      return parsedResult.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  };
}
