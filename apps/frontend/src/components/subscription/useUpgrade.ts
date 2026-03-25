import { useCallback, useState } from "react";

import { useMutation } from "@tanstack/react-query";

import { apiClient } from "../../utils/apiClient";

export function useUpgrade() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const successUrl = `${window.location.origin}/settings?checkout=success`;
      const res = await apiClient.users.subscription.checkout.$post({
        json: { successUrl },
      });

      if (!res.ok) {
        throw new Error("Failed to create checkout session");
      }

      const data = await res.json();
      return data.checkoutUrl;
    },
    onSuccess: (checkoutUrl: string) => {
      window.location.href = checkoutUrl;
    },
  });

  const openUpgradeModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const closeUpgradeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const startCheckout = useCallback(() => {
    checkoutMutation.mutate();
  }, [checkoutMutation]);

  return {
    isModalOpen,
    openUpgradeModal,
    closeUpgradeModal,
    startCheckout,
    isCheckoutLoading: checkoutMutation.isPending,
    checkoutError: checkoutMutation.error,
  };
}
