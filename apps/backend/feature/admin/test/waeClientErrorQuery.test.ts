import { afterEach, describe, expect, it, vi } from "vitest";

import { newWaeClientErrorProvider } from "../waeClientErrorQuery";

describe("client error dashboard diagnostic exclusion", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("keeps expected session transitions out of error totals and details", async () => {
    const fetch = vi
      .fn()
      .mockImplementation(async () => Response.json({ data: [] }));
    vi.stubGlobal("fetch", fetch);
    const provider = newWaeClientErrorProvider(
      "test-credential",
      "test-account",
    );
    await provider.getSummary();
    await provider.getDetails("ios");
    expect(fetch).toHaveBeenCalledTimes(2);
    for (const [, request] of fetch.mock.calls) {
      expect(request.body).toContain("AND blob1 <> 'auth_diagnostic'");
    }
  });
});
