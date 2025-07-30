import type { Context, Next } from "hono";

import { AppError } from "@backend/error";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function multipartMiddleware(c: Context, next: Next) {
  const contentType = c.req.header("content-type");

  if (!contentType?.includes("multipart/form-data")) {
    return next();
  }

  try {
    const formData = await c.req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      throw new AppError("No file uploaded", 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new AppError("File size exceeds 5MB limit", 400);
    }

    // Store the file in context for later use
    c.set("uploadedFile", file);

    return next();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("Failed to parse multipart form data", 400);
  }
}
