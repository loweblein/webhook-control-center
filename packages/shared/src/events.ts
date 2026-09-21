export const supportedEventTypes = [
  "payment.completed",
  "user.created",
  "invoice.failed",
  "subscription.deleted"
] as const;

export type SupportedEventType = (typeof supportedEventTypes)[number];

export const deliveryStatuses = ["PENDING", "PROCESSING", "SUCCESS", "FAILED", "DEAD"] as const;

export type DeliveryStatus = (typeof deliveryStatuses)[number];
