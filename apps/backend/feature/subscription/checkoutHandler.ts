import { AppError } from "@backend/error";
import type { UserId } from "@packages/domain/user/userSchema";
import { z } from "zod";

type CheckoutDeps = {
  polarAccessToken: string;
  polarPriceId: string;
  fetch?: typeof fetch;
};

type CheckoutParams = {
  userId: UserId;
  successUrl: string;
};

type CheckoutResult = {
  checkoutUrl: string;
};

export type CheckoutHandler = {
  createCheckout: (params: CheckoutParams) => Promise<CheckoutResult>;
};

export function newCheckoutHandler(deps: CheckoutDeps): CheckoutHandler {
  return {
    createCheckout: createCheckout(deps),
  };
}

const polarCheckoutResponseSchema = z.object({
  url: z.string().url(),
});

function createCheckout(deps: CheckoutDeps) {
  return async (params: CheckoutParams): Promise<CheckoutResult> => {
    const request = deps.fetch ?? fetch;
    const res = await request("https://api.polar.sh/v1/checkouts/custom", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${deps.polarAccessToken}`,
      },
      body: JSON.stringify({
        product_price_id: deps.polarPriceId,
        success_url: params.successUrl,
        metadata: { userId: params.userId },
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new AppError(
        `Polar checkout creation failed: ${res.status} ${errorBody}`,
        502,
      );
    }

    const parsed = polarCheckoutResponseSchema.safeParse(await res.json());
    if (!parsed.success) {
      throw new AppError("Polar checkout returned an invalid response", 502);
    }
    const data = parsed.data;
    return { checkoutUrl: data.url };
  };
}
