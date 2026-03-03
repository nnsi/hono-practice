import {
  type Browser,
  type BrowserContext,
  type Page,
  chromium,
} from "playwright";
import { afterAll, afterEach, beforeAll, beforeEach } from "vitest";

export function setupBrowser() {
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  });

  afterAll(async () => {
    await browser?.close();
  });

  beforeEach(async () => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  afterEach(async () => {
    await context?.close();
  });

  return {
    getPage: () => page,
    getContext: () => context,
  };
}
