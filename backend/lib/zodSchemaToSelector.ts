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
              >;
            }
          : {
              [K in keyof ResponseShape]: true;
            }
        : {
            [K in keyof ResponseShape]: true;
          }
      : true;

// ラッパー型をアンラップする関数
function unwrapZodType<T extends z.ZodTypeAny>(schema: T): z.ZodTypeAny {
  if (
    schema instanceof z.ZodOptional ||
    schema instanceof z.ZodNullable ||
    schema instanceof z.ZodDefault ||
    schema instanceof z.ZodLazy ||
    schema instanceof z.ZodEffects
  ) {
    return unwrapZodType(schema._def.innerType);
  } else if (schema instanceof z.ZodUnion) {
    // ユニオン型の最初のオプションを使用（必要に応じて変更）
    return unwrapZodType(schema._def.options[0]);
  } else {
    return schema;
  }
}

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
      selectSchema
    ) as any;
  } else if (unwrappedResponseSchema instanceof z.ZodObject) {
    const responseShape = unwrappedResponseSchema.shape;
    const selectShape =
      unwrappedSelectSchema instanceof z.ZodObject
        ? unwrappedSelectSchema.shape
        : undefined;

    const selector: any = {};
    for (const key in responseShape) {
      if (selectShape) {
        if (key in selectShape) {
          selector[key] = zodSchemaToSelector(
            responseShape[key],
            selectShape[key]
          );
        } else {
          // SelectSchemaに存在しないキーを含めるかどうかを決定
          // 今回は含めないようにしています
          // 必要に応じて以下の行をコメント解除
          // selector[key] = true;
        }
      } else {
        selector[key] = true;
      }
    }
    return selector;
  } else {
    return true as any;
  }
}
