import { describe, expect, it } from "vitest";

import {
  type ScopeConfig,
  V1_SCOPE_MAPPING,
  resolveScope,
  resolveScopeForPath,
} from "../scopeMapping";

describe("resolveScope", () => {
  describe("kind: resource", () => {
    const tasksConfig: ScopeConfig = { kind: "resource", resource: "tasks" };
    const logsConfig: ScopeConfig = {
      kind: "resource",
      resource: "activity-logs",
    };

    it("GET → :read", () => {
      expect(resolveScope(tasksConfig, "GET")).toBe("tasks:read");
      expect(resolveScope(logsConfig, "GET")).toBe("activity-logs:read");
    });

    it("HEAD → :read", () => {
      expect(resolveScope(tasksConfig, "HEAD")).toBe("tasks:read");
    });

    it("POST / PUT / DELETE / PATCH → :write", () => {
      expect(resolveScope(tasksConfig, "POST")).toBe("tasks:write");
      expect(resolveScope(tasksConfig, "PUT")).toBe("tasks:write");
      expect(resolveScope(tasksConfig, "DELETE")).toBe("tasks:write");
      expect(resolveScope(tasksConfig, "PATCH")).toBe("tasks:write");
    });

    it("method は大小文字非依存", () => {
      expect(resolveScope(tasksConfig, "get")).toBe("tasks:read");
      expect(resolveScope(tasksConfig, "post")).toBe("tasks:write");
    });
  });

  describe("kind: fixed", () => {
    const voiceConfig: ScopeConfig = { kind: "fixed", scope: "voice" };

    it("method に依らず固定 scope を返す", () => {
      expect(resolveScope(voiceConfig, "GET")).toBe("voice");
      expect(resolveScope(voiceConfig, "POST")).toBe("voice");
      expect(resolveScope(voiceConfig, "DELETE")).toBe("voice");
    });
  });
});

describe("resolveScopeForPath", () => {
  it("リソース prefix 完全一致で scope を返す", () => {
    expect(resolveScopeForPath("GET", "/tasks")).toBe("tasks:read");
    expect(resolveScopeForPath("POST", "/tasks")).toBe("tasks:write");
    expect(resolveScopeForPath("GET", "/activity-logs")).toBe(
      "activity-logs:read",
    );
  });

  it("prefix + '/' 分岐 (/tasks/archived, /tasks/:id)", () => {
    expect(resolveScopeForPath("GET", "/tasks/archived")).toBe("tasks:read");
    expect(resolveScopeForPath("PUT", "/tasks/123")).toBe("tasks:write");
    expect(resolveScopeForPath("DELETE", "/tasks/123")).toBe("tasks:write");
  });

  it("fixed prefix (/ai/activity-logs) は voice を返す", () => {
    expect(resolveScopeForPath("POST", "/ai/activity-logs")).toBe("voice");
    expect(resolveScopeForPath("POST", "/ai/activity-logs/from-speech")).toBe(
      "voice",
    );
  });

  it("誤一致しない: /ai/activity-logs は /activity-logs として解決されない", () => {
    // /activity-logs を先に書いても /ai/activity-logs は /activity-logs prefix に含まれない
    expect(resolveScopeForPath("POST", "/ai/activity-logs/from-speech")).toBe(
      "voice",
    );
  });

  it("誤一致しない: 類似名 path は prefix + '/' 区切りで区別される", () => {
    // V1_SCOPE_MAPPING に無い path は null
    expect(resolveScopeForPath("GET", "/activity-logs-archived")).toBeNull();
    expect(resolveScopeForPath("GET", "/tasks-export")).toBeNull();
  });

  it("未登録 path は null", () => {
    expect(resolveScopeForPath("GET", "/unknown")).toBeNull();
    expect(resolveScopeForPath("GET", "/")).toBeNull();
  });
});

describe("V1_SCOPE_MAPPING", () => {
  it("全エントリの resource/scope が ApiKeyScope と整合する", () => {
    // type システムで担保されているが、実行時にも Object.entries で網羅チェック
    for (const [prefix, config] of Object.entries(V1_SCOPE_MAPPING)) {
      expect(prefix.startsWith("/")).toBe(true);
      if (config.kind === "resource") {
        // resource 名は ResourceName 型で縛られている
        expect(["activity-logs", "tasks"]).toContain(config.resource);
      } else {
        expect(["all", "voice"]).toContain(config.scope);
      }
    }
  });
});
