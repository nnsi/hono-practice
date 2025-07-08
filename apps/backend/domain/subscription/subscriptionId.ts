export type SubscriptionId = {
  value: string;
};

export const newSubscriptionId = (value: string): SubscriptionId => {
  if (!value || value.trim() === "") {
    throw new Error("SubscriptionId cannot be empty");
  }
  return { value };
};
