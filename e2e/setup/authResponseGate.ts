type Gate = (request: Request, response: Response) => Promise<Response>;

let activeGate: Gate | undefined;

export async function gateAuthResponse(request: Request, response: Response) {
  return activeGate ? activeGate(request, response) : response;
}

// Runs after the real backend has committed, before Node sends any headers.
// Playwright route.fetch cannot substitute for this: it applies Set-Cookie to
// the browser context even when route.fulfill has not delivered the response.
export function holdSuccessfulRefreshResponses(
  count: number,
  phase: "headers" | "body" = "headers",
) {
  if (activeGate) throw new Error("A refresh response gate is already active");
  const releases: Array<() => void> = [];
  const statuses: number[] = [];
  const gate: Gate = async (request, response) => {
    if (
      request.method !== "POST" ||
      new URL(request.url).pathname !== "/auth/token" ||
      !response.ok ||
      statuses.length >= count
    ) {
      return response;
    }
    statuses.push(response.status);
    const released = new Promise<void>((resolve) => releases.push(resolve));
    if (phase === "headers") {
      await released;
      return response;
    }
    const body = await response.arrayBuffer();
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        // Send a valid JSON prefix so Node flushes Set-Cookie before the gate.
        const bytes = new Uint8Array(body);
        controller.enqueue(bytes.slice(0, 1));
        await released;
        if (cancelled) return;
        controller.enqueue(bytes.slice(1));
        controller.close();
      },
      cancel() {
        cancelled = true;
      },
    });
    const headers = new Headers(response.headers);
    headers.delete("Content-Length");
    return new Response(stream, { status: response.status, headers });
  };
  activeGate = gate;
  return {
    get blockedCount() {
      return statuses.length;
    },
    releaseAll() {
      for (const release of releases) release();
    },
    dispose() {
      if (activeGate === gate) activeGate = undefined;
      for (const release of releases) release();
    },
  };
}
