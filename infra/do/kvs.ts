import type { DurableObjectState } from "@cloudflare/workers-types";

type StoredValue<T> = {
  data: T;
  expiresAt: number;
};

// クリーンアップ間隔（1分）
const CLEANUP_INTERVAL_MS = 60 * 1000;

/**
 * 単一インスタンスで全キーを管理するKey-Value Store用Durable Object
 * 定期的なalarmで期限切れエントリをクリーンアップ
 */
export class KeyValueDO {
  private state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    switch (url.pathname) {
      case "/get":
        return this.handleGet(url.searchParams.get("key") ?? "");
      case "/set":
        return this.handleSet(request);
      case "/delete":
        return this.handleDelete(url.searchParams.get("key") ?? "");
      default:
        return new Response("Not Found", { status: 404 });
    }
  }

  private async handleGet(key: string): Promise<Response> {
    const stored = await this.state.storage.get<StoredValue<unknown>>(key);

    if (!stored) {
      return new Response(null, { status: 404 });
    }

    // 期限切れチェック
    if (stored.expiresAt < Date.now()) {
      await this.state.storage.delete(key);
      return new Response(null, { status: 404 });
    }

    return Response.json(stored.data);
  }

  private async handleSet(request: Request): Promise<Response> {
    const body = (await request.json()) as {
      key: string;
      value: unknown;
      ttl?: number;
    };
    const { key, value, ttl } = body;

    const expiresAt = ttl ? Date.now() + ttl * 1000 : Date.now() + 86400 * 1000; // デフォルト24時間

    await this.state.storage.put(key, { data: value, expiresAt });

    // クリーンアップalarmを設定（まだなければ）
    const currentAlarm = await this.state.storage.getAlarm();
    if (!currentAlarm) {
      await this.state.storage.setAlarm(Date.now() + CLEANUP_INTERVAL_MS);
    }

    return new Response("OK");
  }

  private async handleDelete(key: string): Promise<Response> {
    await this.state.storage.delete(key);
    return new Response("OK");
  }

  async alarm(): Promise<void> {
    // 期限切れエントリを一括削除
    const all = await this.state.storage.list<StoredValue<unknown>>();
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, stored] of all) {
      if (stored.expiresAt < now) {
        keysToDelete.push(key);
      }
    }

    if (keysToDelete.length > 0) {
      await this.state.storage.delete(keysToDelete);
    }

    // まだデータが残っていれば次回alarmを設定
    const remaining = await this.state.storage.list({ limit: 1 });
    if (remaining.size > 0) {
      await this.state.storage.setAlarm(Date.now() + CLEANUP_INTERVAL_MS);
    }
  }
}
