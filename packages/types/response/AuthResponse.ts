import { z } from "zod";

import { GetUserResponseSchema } from "./GetUserResponse";

// refreshToken は mobile client にのみ JSON body で返される。Web は httpOnly
// cookie で受け取るため response body には含まれない (authRoute.ts の isMobileClient
// 分岐参照)。clients (transport) はこの schema で zod parse できるよう optional に。
export const authResponseSchema = z.object({
  token: z.string(),
  refreshToken: z.string().optional(),
  user: GetUserResponseSchema,
});

export type AuthResponse = z.infer<typeof authResponseSchema>;
