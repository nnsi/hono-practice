import {
  MutationFunction,
  QueryKey,
  useQueryClient,
} from "@tanstack/react-query";
import { ZodSchema } from "zod";

export function mutationFnFunc<TRequest, TResponse>(
  queryKey: QueryKey,
  requestFn: (data: TRequest) => Promise<Response>,
  schema: ZodSchema<TResponse>
): {
  mutationFn: MutationFunction<TResponse, TRequest>;
  onSuccess: () => void;
} {
  const queryClient = useQueryClient();
  return {
    mutationFn: async (data: TRequest) => {
      const res = await requestFn(data);

      if (res.status !== 200) {
        const json = await res.json().catch(() => null);
        const message = json?.message || res.statusText;
        throw new Error(message);
      }

      const json = await res.json();
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
