import { QueryFunction, QueryKey } from "@tanstack/react-query";
import { ZodSchema } from "zod";

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

      if (res.status !== 200) {
        const json = await res.json().catch(() => null);
        const message = json?.message || res.statusText;
        console.error(`Error ${res.status}: ${message}`);
        throw new Error(message);
      }

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
