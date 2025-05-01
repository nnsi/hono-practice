import type { ClientResponse } from "hono/client";

import type { QueryFunction, QueryKey } from "@tanstack/react-query";
import type { ZodSchema } from "zod";

type queryPropsParamsFunc<T> = {
  queryKey: QueryKey;
  queryFn: () => Promise<ClientResponse<unknown, any, any>>;
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
        throw parsedResult.error;
      }
      return parsedResult.data;
    },
  };
}
