import type { QueryFunction, QueryKey } from "@tanstack/react-query";
import type { ZodSchema } from "zod";

type queryPropsParamsFunc<T> = {
  queryKey: QueryKey;
  queryFn: () => Promise<Response>;
  schema: ZodSchema<T>;
};

export function qp<T>({ queryKey, queryFn, schema }: queryPropsParamsFunc<T>): {
  queryKey: QueryKey;
  queryFn: QueryFunction<T>;
} {
  return {
    queryKey,
    queryFn: async () => {
      const res = await queryFn();

      const json = await res.json();
      const parsedResult = schema.safeParse(json);
      if (!parsedResult.success) {
        console.error("Validation error:", parsedResult.error);
        throw parsedResult.error;
      }

      return parsedResult.data;
    },
  };
}
