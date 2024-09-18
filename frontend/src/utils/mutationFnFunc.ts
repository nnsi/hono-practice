import {
  MutationFunction,
  QueryKey,
  useQueryClient,
} from "@tanstack/react-query";
import { ZodSchema } from "zod";

type MaybeUndefined<T> = T extends void ? void : T | undefined;

export function mutationFnFunc<TRequest = void, TResponse = unknown>(
  queryKey: QueryKey,
  requestFn: (data: TRequest) => Promise<Response>,
  schema?: ZodSchema<TResponse>
): {
  mutationFn: MutationFunction<TResponse, MaybeUndefined<TRequest>>;
  onSuccess: () => void;
} {
  const queryClient = useQueryClient();
  return {
    mutationFn: async (data: MaybeUndefined<TRequest>) => {
      const res = await requestFn(data as TRequest);

      if (res.status !== 200) {
        const json = await res.json().catch(() => null);
        const message = json?.message || res.statusText;
        throw new Error(message);
      }

      const json = await res.json();
      if (!schema) {
        return json;
      }

      const parsedResult = schema.safeParse(json);
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
