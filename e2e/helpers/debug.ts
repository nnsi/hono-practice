import type { Page } from "playwright";

/** ページのbodyテキストをコンソールに出力する */
export async function dumpBodyText(page: Page, label = "body") {
  const text = await page.evaluate(() => document.body?.innerText ?? "");
  console.log(`[debug:${label}] ${text.substring(0, 1000)}`);
}

/** Dexie authState の中身をコンソールに出力する */
export async function dumpAuthState(page: Page) {
  const raw = await page.evaluate(() => {
    return new Promise<string>((resolve, reject) => {
      const req = indexedDB.open("actiko");
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction("authState", "readonly");
        const store = tx.objectStore("authState");
        const get = store.get("current");
        get.onsuccess = () => resolve(JSON.stringify(get.result, null, 2));
        get.onerror = () => reject(get.error);
      };
      req.onerror = () => reject(req.error);
    });
  });
  console.log(`[debug:authState] ${raw}`);
}

/** ブラウザコンソールのエラーとページエラーを収集して返す */
export function collectBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`[console] ${msg.text()}`);
  });
  page.on("pageerror", (err) => errors.push(`[pageerror] ${err.message}`));
  return {
    get: () => errors,
    dump: () => {
      if (errors.length > 0) {
        console.log(`[debug:browserErrors]\n${errors.join("\n")}`);
      }
    },
  };
}

/** navigator.language と i18n 検出結果をダンプ */
export async function dumpLocaleInfo(page: Page) {
  const info = await page.evaluate(() =>
    JSON.stringify({
      language: navigator.language,
      languages: navigator.languages,
    }),
  );
  console.log(`[debug:locale] ${info}`);
}
