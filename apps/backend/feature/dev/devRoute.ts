import { Hono } from "hono";

import { isLocalHost, isLocalOrigin } from "@backend/utils/isLocalOrigin";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

import type { AppContext } from "../../context";
import { newSubscriptionRepository } from "../subscription/subscriptionRepository";
import { newUserRepository } from "../user/userRepository";
import { newDevSubscriptionUsecase } from "./devSubscriptionUsecase";

// E2E / 開発専用エンドポイント。production / stg では 404。
// development では同一ホスト (localhost / private IP) からのみ受け付ける。
// LAN 配信時に同一ネットワーク上の他ホストから他人のサブスクリプションを
// 書き換えられないように、admin/dev-login と同じ二重ガードを踏襲する。
const setPlanSchema = z.object({
  loginId: z.string().min(1),
  plan: z.enum(["free", "premium"]),
});

export function createDevRoute() {
  const app = new Hono<AppContext>();

  app.use("*", async (c, next) => {
    const env = c.env.NODE_ENV;
    if (env !== "test" && env !== "development") {
      return c.json({ message: "not available" }, 404);
    }
    if (env === "development") {
      // Origin はブラウザからの request にのみ付く。React Native 実機 (LAN
      // 配信) からは Origin が無く Host だけ (例: "192.168.1.10:8787") に
      // なるため、両方で local/private IP を許可する。
      const origin = c.req.header("Origin") ?? "";
      const host = c.req.header("Host") ?? "";
      if (!isLocalOrigin(origin) && !isLocalHost(host)) {
        return c.json({ message: "not available" }, 403);
      }
    }
    await next();
  });

  return app.post(
    "/subscription/plan",
    zValidator("json", setPlanSchema),
    async (c) => {
      const { loginId, plan } = c.req.valid("json");
      const db = c.env.DB;
      const usecase = newDevSubscriptionUsecase(
        newUserRepository(db),
        newSubscriptionRepository(db),
      );
      await usecase.setPlanByLoginId(loginId, plan);
      return c.json({ ok: true, plan });
    },
  );
}

export const devRoute = createDevRoute();
