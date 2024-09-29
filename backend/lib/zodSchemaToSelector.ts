import { z } from "zod";

// ラッパー型をアンラップするユーティリティ型
type UnwrapZodType<T extends z.ZodTypeAny> =
  T extends z.ZodOptional<infer U>
    ? UnwrapZodType<U>
    : T extends z.ZodNullable<infer U>
      ? UnwrapZodType<U>
      : T extends z.ZodDefault<infer U>
        ? UnwrapZodType<U>
        : T extends z.ZodEffects<infer U>
          ? UnwrapZodType<U>
          : T extends z.ZodLazy<infer U>
            ? UnwrapZodType<U>
            : T extends z.ZodBranded<infer U, any>
              ? UnwrapZodType<U>
              : T extends z.ZodUnion<infer U>
                ? UnwrapZodType<U[number]>
                : T;

// unwrapZodType関数の定義
function unwrapZodType(schema: z.ZodTypeAny): z.ZodTypeAny {
  if (
    schema instanceof z.ZodOptional ||
    schema instanceof z.ZodNullable ||
    schema instanceof z.ZodDefault
  ) {
    return unwrapZodType(schema._def.innerType);
  } else if (schema instanceof z.ZodEffects) {
    return unwrapZodType(schema._def.schema);
  } else if (schema instanceof z.ZodLazy) {
    return unwrapZodType(schema._def.getter());
  } else if (schema instanceof z.ZodBranded) {
    return unwrapZodType(schema._def.type);
  } else if (schema instanceof z.ZodUnion) {
    // ユニオン型の最初のオプションをアンラップ
    return unwrapZodType(schema._def.options[0]);
  } else {
    return schema;
  }
}

// ZodSchemaToSelectorユーティリティ型の定義
type ZodSchemaToSelector<
  ResponseSchema extends z.ZodTypeAny,
  SelectSchema extends z.ZodTypeAny | undefined = undefined,
> =
  UnwrapZodType<ResponseSchema> extends z.ZodArray<infer ResponseElement>
    ? ZodSchemaToSelector<ResponseElement, SelectSchema>
    : UnwrapZodType<ResponseSchema> extends z.ZodObject<infer ResponseShape>
      ? SelectSchema extends z.ZodTypeAny
        ? UnwrapZodType<SelectSchema> extends z.ZodObject<infer SelectShape>
          ? {
              [K in keyof ResponseShape &
                keyof SelectShape]: ZodSchemaToSelector<
                ResponseShape[K],
                SelectShape[K]
              > extends infer R
                ? R extends true
                  ? true
                  : { select: R }
                : never;
            }
          : {
              [K in keyof ResponseShape]: ZodSchemaToSelector<
                ResponseShape[K],
                undefined
              > extends infer R
                ? R extends true
                  ? true
                  : { select: R }
                : never;
            }
        : {
            [K in keyof ResponseShape]: ZodSchemaToSelector<
              ResponseShape[K],
              undefined
            > extends infer R
              ? R extends true
                ? true
                : { select: R }
              : never;
          }
      : true;

// zodSchemaToSelector関数の定義
export function zodSchemaToSelector<
  ResponseSchema extends z.ZodTypeAny,
  SelectSchema extends z.ZodTypeAny | undefined = undefined,
>(
  responseSchema: ResponseSchema,
  selectSchema?: SelectSchema
): ZodSchemaToSelector<ResponseSchema, SelectSchema> {
  const unwrappedResponseSchema = unwrapZodType(responseSchema);
  const unwrappedSelectSchema = selectSchema
    ? unwrapZodType(selectSchema)
    : undefined;

  if (unwrappedResponseSchema instanceof z.ZodArray) {
    return zodSchemaToSelector(
      unwrappedResponseSchema.element,
      unwrappedSelectSchema
    ) as any;
  } else if (unwrappedResponseSchema instanceof z.ZodObject) {
    const responseShape = unwrappedResponseSchema.shape;
    const selectShape =
      unwrappedSelectSchema instanceof z.ZodObject
        ? unwrappedSelectSchema.shape
        : undefined;

    const selector: any = {};
    for (const key in responseShape) {
      const responseField = responseShape[key];
      const selectField = selectShape ? selectShape[key] : undefined;

      const result = zodSchemaToSelector(responseField, selectField);

      if (result === true) {
        selector[key] = true;
      } else {
        selector[key] = { select: result };
      }
    }
    return selector;
  } else {
    return true as any;
  }
}
