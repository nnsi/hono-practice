import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { userProviders } from "../schema/userSchema";

describe("user_provider schema", () => {
  it("requires a partial unique index for active OAuth identities", () => {
    const config = getTableConfig(userProviders);
    const identityIndex = config.indexes.find(
      (index) => index.config.name === "user_provider_identity_unique",
    );

    expect(identityIndex).toBeDefined();
    expect(identityIndex?.config.unique).toBe(true);
    expect(identityIndex?.config.columns).toHaveLength(2);
    expect(identityIndex?.config.where).toBeDefined();
  });
});
