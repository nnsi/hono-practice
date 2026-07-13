import { describe, expect, it, vi } from "vitest";

import { newCheckoutHandler } from "../checkoutHandler";

const USER_ID = "00000000-0000-4000-8000-000000000000" as never;

describe("Polar checkout gateway contract", () => {
  it("sends the authenticated Polar request and maps its URL response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "checkout_1",
          url: "https://checkout.polar.sh/checkout_1",
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );
    const handler = newCheckoutHandler({
      polarAccessToken: "polar-token",
      polarPriceId: "price_1",
      fetch: fetchMock,
    });

    await expect(
      handler.createCheckout({
        userId: USER_ID,
        successUrl: "https://app.example.com/settings?checkout=success",
      }),
    ).resolves.toEqual({
      checkoutUrl: "https://checkout.polar.sh/checkout_1",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.polar.sh/v1/checkouts/custom");
    expect(init).toMatchObject({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer polar-token",
      },
    });
    expect(JSON.parse(init.body)).toEqual({
      product_price_id: "price_1",
      success_url: "https://app.example.com/settings?checkout=success",
      metadata: { userId: USER_ID },
    });
  });

  it("rejects a successful response that violates the gateway contract", async () => {
    const handler = newCheckoutHandler({
      polarAccessToken: "polar-token",
      polarPriceId: "price_1",
      fetch: vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ id: "missing-url" }), { status: 201 }),
        ),
    });

    await expect(
      handler.createCheckout({
        userId: USER_ID,
        successUrl: "https://app.example.com/settings?checkout=success",
      }),
    ).rejects.toMatchObject({
      message: "Polar checkout returned an invalid response",
      status: 502,
    });
  });
});
