import { z } from "zod";

export const ActivityIconUploadRequestSchema = z.object({
  base64: z.string().min(1),
  mimeType: z.string().min(1),
});

export type ActivityIconUploadRequest = z.infer<
  typeof ActivityIconUploadRequestSchema
>;
