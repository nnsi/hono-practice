import { describe, it } from "vitest";

import { login } from "../helpers/auth";
import { setupBrowser } from "../helpers/browser";
import { backFromNote, openNewNote, openNotes } from "../helpers/note";

describe("offline sync across clients", () => {
  const { getBrowser, getContext, getPage } = setupBrowser();

  it("uploads an offline note after reconnect and downloads it in another client", async () => {
    const firstPage = getPage();
    const firstContext = getContext();
    const title = `E2E offline sync ${Date.now()}`;

    await login(firstPage, "e2e@example.com", "password123");
    await openNewNote(firstPage);
    await firstContext.setOffline(true);
    await firstPage.fill('input[placeholder="ノートのタイトル"]', title);
    await backFromNote(firstPage);
    await firstPage.waitForSelector(`text="${title}"`, { timeout: 15_000 });

    const uploaded = firstPage.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().includes("/users/v2/notes/sync") &&
        response.ok(),
      { timeout: 15_000 },
    );
    await firstContext.setOffline(false);
    await uploaded;

    const secondContext = await getBrowser().newContext({ locale: "ja-JP" });
    try {
      const secondPage = await secondContext.newPage();
      await login(secondPage, "e2e@example.com", "password123");
      await openNotes(secondPage);
      await secondPage.waitForSelector(`text="${title}"`, { timeout: 15_000 });
    } finally {
      await secondContext.close();
    }
  });
});
