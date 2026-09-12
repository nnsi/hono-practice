import {
  type Browser,
  type BrowserContext,
  type Page,
  chromium,
  firefox,
} from "playwright";
import { afterAll, afterEach, beforeAll, beforeEach } from "vitest";

export function setupBrowser(engine: "chromium" | "firefox" = "chromium") {
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;

  beforeAll(async () => {
    browser = await (engine === "firefox" ? firefox : chromium).launch({
      headless: true,
      // playwrightのバージョンとプリインストール済みブラウザのrevisionが
      // ズレている環境（リモート実行環境等）向けの逃げ道
      executablePath:
        (engine === "firefox"
          ? process.env.PLAYWRIGHT_FIREFOX_EXECUTABLE
          : process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) || undefined,
    });
  });

  afterAll(async () => {
    await browser?.close();
  });

  beforeEach(async () => {
    context = await browser.newContext({ locale: "ja-JP" });
    page = await context.newPage();
  });

  afterEach(async () => {
    await context?.close();
  });

  return {
    getBrowser: () => browser,
    getPage: () => page,
    getContext: () => context,
  };
}
