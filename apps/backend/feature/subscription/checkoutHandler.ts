import { AppError } from "@backend/error";
import type { UserId } from "@packages/domain/user/userSchema";

type CheckoutDeps = {
  polarAccessToken: string;
  polarPriceId: string;
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

function createCheckout(deps: CheckoutDeps) {
  return async (params: CheckoutParams): Promise<CheckoutResult> => {
    const res = await fetch("https://api.polar.sh/v1/checkouts/custom", {
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

    const data = (await res.json()) as { url: string };
    return { checkoutUrl: data.url };
  };
}
