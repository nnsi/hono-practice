import { describe, expect, it } from "vitest";

import { classifyReleaseImpact } from "./release-impact.js";

describe("classifyReleaseImpact", () => {
  it("rebuilds every consumer when a shared package changes", () => {
    expect(
      classifyReleaseImpact(["packages/domain/activity/activity.ts"]),
    ).toEqual({
      admin: true,
      backend: true,
      frontend: true,
      migrations: false,
      mobile: true,
      native_mobile: false,
      tail: false,
    });
  });

  it("marks migrations as backend changes", () => {
    const impact = classifyReleaseImpact(["infra/drizzle/migrations/0042.sql"]);
    expect(impact.backend).toBe(true);
    expect(impact.migrations).toBe(true);
  });

  it("rebuilds all artifacts for lockfile and root build config changes", () => {
    for (const file of ["pnpm-lock.yaml", "tsconfig.json"]) {
      const impact = classifyReleaseImpact([file]);
      expect(impact).toMatchObject({
        admin: true,
        backend: true,
        frontend: true,
        mobile: true,
        tail: true,
      });
    }
  });

  it("keeps app-only changes scoped to their artifact", () => {
    expect(classifyReleaseImpact(["apps/admin-frontend/src/main.tsx"])).toEqual(
      {
        admin: true,
        backend: false,
        frontend: false,
        migrations: false,
        mobile: false,
        native_mobile: false,
        tail: false,
      },
    );
  });

  it("detects native changes but allows JS-only mobile OTA changes", () => {
    expect(
      classifyReleaseImpact(["apps/mobile/src/hooks/useAuth.ts"]).native_mobile,
    ).toBe(false);
    expect(
      classifyReleaseImpact(["apps/mobile/modules/timer-widget/app.plugin.js"])
        .native_mobile,
    ).toBe(true);
    expect(
      classifyReleaseImpact(["apps/mobile/package.json"]).native_mobile,
    ).toBe(true);
  });

  it("flags Tail Worker changes independently", () => {
    const impact = classifyReleaseImpact(["apps/tail-worker/src/index.ts"]);
    expect(impact.tail).toBe(true);
    expect(impact.backend).toBe(false);
  });
});
