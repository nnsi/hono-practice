import { hc } from "hono/client";
import { AppType } from "@/backend/index";
import { Hono } from "hono";

export function useApiClient() {
  return hc<AppType>("http://localhost:3456/", {
    init: {
      mode: "cors",
      credentials: "include",
    },
  });
}

// 1. Honoの型構造からルートを抽出するユーティリティ型
type ExtractHonoRoutes<T> = T extends Hono<any, infer R, any> ? R : never;

// 2. AppTypeからルート定義を抽出
type Routes = ExtractHonoRoutes<AppType>;

// 3. HTTPメソッドの型を定義
type HttpMethod = "$get" | "$post" | "$put" | "$delete" | "$patch";

// 4. 各HTTPメソッドに対応する型を生成
export type ApiRouteBase = {
  [Path in keyof Routes]: {
    [Method in HttpMethod]: Method extends keyof Routes[Path]
      ? Routes[Path][Method] extends { input: any; output: any }
        ? Routes[Path][Method]["output"]
        : Routes[Path][Method]
      : never;
  };
};
