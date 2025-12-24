import type { DurableObjectState } from "@cloudflare/workers-types";

/**
 * Key-Value Store用のDurable Object
 * TTL対応のシンプルなKVストレージを提供
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
        return this.handleGet();
      case "/set":
        return this.handleSet(request);
      case "/delete":
        return this.handleDelete();
      default:
        return new Response("Not Found", { status: 404 });
    }
  }

  private async handleGet(): Promise<Response> {
    const value = await this.state.storage.get("value");
    if (value === undefined) {
      return new Response(null, { status: 404 });
    }
    return Response.json(value);
  }

  private async handleSet(request: Request): Promise<Response> {
    const body = (await request.json()) as { value: unknown; ttl?: number };
    const { value, ttl } = body;

    await this.state.storage.put("value", value);

    if (ttl && ttl > 0) {
      await this.state.storage.setAlarm(Date.now() + ttl * 1000);
    } else {
      await this.state.storage.deleteAlarm();
    }

    return new Response("OK");
  }

  private async handleDelete(): Promise<Response> {
    await this.state.storage.delete("value");
    await this.state.storage.deleteAlarm();
    return new Response("OK");
  }

  async alarm(): Promise<void> {
    await this.state.storage.delete("value");
  }
}
