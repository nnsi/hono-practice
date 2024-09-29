import { ZodTypeAny, ZodObject, ZodArray, ZodOptional, ZodNullable } from "zod";

export function zodSchemaToSelector(schema: ZodTypeAny): any {
  if (schema instanceof ZodObject) {
    const shape = schema.shape;
    const selector: any = {};
    for (const key in shape) {
      selector[key] = zodSchemaToSelector(shape[key]);
    }
    return selector;
  } else if (schema instanceof ZodArray) {
    return zodSchemaToSelector(schema.element);
  } else if (schema instanceof ZodOptional || schema instanceof ZodNullable) {
    return zodSchemaToSelector(schema.unwrap());
  } else {
    return true;
  }
}
