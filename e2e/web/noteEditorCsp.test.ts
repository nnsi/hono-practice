import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { login } from "../helpers/auth";
import { setupBrowser } from "../helpers/browser";
import {
  backFromNote,
  getNoteEditor,
  openNewNote,
  waitForNoteSaved,
} from "../helpers/note";

describe("note editor under production CSP", () => {
  const { getPage } = setupBrowser();

  it("CSP 下でも既存本文を表示し、編集・再読み込みで保持する", async () => {
    const page = getPage();
    const headers = await readFile("apps/frontend/public/_headers", "utf8");
    const policy = headers.match(/Content-Security-Policy:\s*([^\n]+)/)![1];
    const violations: string[] = [];
    page.on("console", (message) => {
      if (/content security policy.*script-src/i.test(message.text())) {
        violations.push(message.text());
      }
    });

    await page.route("**/*", async (route) => {
      // The intercepted host document makes Chromium apply localhost access
      // checks to the opaque iframe. Serve its real asset via routing as well;
      // CSP enforcement remains enabled in the browser.
      if (
        route.request().resourceType() === "script" &&
        new URL(route.request().url()).pathname.endsWith(
          "/noteEditorRuntime.js",
        )
      ) {
        await route.fulfill({ response: await route.fetch() });
        return;
      }
      if (route.request().resourceType() !== "document") {
        await route.continue();
        return;
      }
      const response = await route.fetch();
      const body = await response.text();
      // Vite dev injects an inline React Refresh preamble. Authorize only the
      // exact scripts in the host HTML; iframe scripts still face the deployed
      // CSP, without unsafe-inline or any editor-specific hash exception.
      const hashes = [
        ...body.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g),
      ]
        .filter(
          ([, attributes, script]) => !/\bsrc\s*=/.test(attributes) && script,
        )
        .map(
          ([, , script]) =>
            `'sha256-${createHash("sha256").update(script).digest("base64")}'`,
        );
      const devPolicy = policy.replace(
        /script-src ([^;]+)/,
        (_, sources: string) => `script-src ${sources} ${hashes.join(" ")}`,
      );
      await route.fulfill({
        response,
        headers: {
          ...response.headers(),
          "content-security-policy": devPolicy,
        },
        body,
      });
    });

    await login(page, "e2e@example.com", "password123");
    await openNewNote(page);
    const title = `CSP note ${Date.now()}`;
    await page
      .getByRole("textbox", { name: "タイトル", exact: true })
      .fill(title);
    const editor = getNoteEditor(page);
    await expect
      .poll(() => editor.getAttribute("contenteditable"), { timeout: 15000 })
      .toBe("true");
    expect(violations).toEqual([]);
    await editor.fill("CSP 下で保存した本文");
    await waitForNoteSaved(page);
    await backFromNote(page);
    await page.getByRole("heading", { name: title, exact: true }).click();
    await expect.poll(() => editor.innerText()).toBe("CSP 下で保存した本文");

    await page.setViewportSize({ width: 375, height: 812 });
    await editor.press("End");
    await editor.pressSequentially(" 更新");
    await waitForNoteSaved(page);
    await backFromNote(page);
    await page.getByRole("heading", { name: title, exact: true }).click();
    await page.reload();
    await expect
      .poll(() => editor.innerText())
      .toBe("CSP 下で保存した本文 更新");
    expect(violations).toEqual([]);
  });
});
