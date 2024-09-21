import {
  MutationFunction,
  QueryKey,
  useQueryClient,
} from "@tanstack/react-query";
import { ZodSchema } from "zod";

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

      if (res.status !== 200) {
        const json = await res.json().catch(() => null);
        const message = json?.message || res.statusText;
        throw new Error(message);
      }

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
