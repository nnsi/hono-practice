import { z } from "zod";

// 5MB（base64エンコード後の文字列長）。decode後は約 5MB * 3/4 = 3.75MB
const MAX_BASE64_LENGTH = 5 * 1024 * 1024;

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const ActivityIconUploadRequestSchema = z.object({
  base64: z.string().min(1).max(MAX_BASE64_LENGTH),
  mimeType: z.enum(ALLOWED_MIME_TYPES),
});

export type ActivityIconUploadRequest = z.infer<
  typeof ActivityIconUploadRequestSchema
>;
