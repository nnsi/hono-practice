import { z } from "zod";

// This is a secret recovery proof, separate from the public diagnostic flow ID.
// Persist before sending a refresh; never include the value in logs or URLs.
export const REFRESH_OPERATION_HEADER = "X-Refresh-Operation";
export const refreshOperationIdSchema = z.string().uuid();
