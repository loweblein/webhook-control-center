import { z } from "zod";
import { deliveryStatuses, supportedEventTypes } from "./events.js";

export const emailSchema = z.string().email().max(255);
export const passwordSchema = z.string().min(8).max(128);

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(2).max(120),
  workspaceName: z.string().min(2).max(120).optional()
});

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema
});

export const createWorkspaceSchema = z.object({
  name: z.string().min(2).max(120)
});

export const createApiKeySchema = z.object({
  name: z.string().min(2).max(120)
});

export const createEndpointSchema = z.object({
  name: z.string().min(2).max(120),
  url: z.string().url().max(2048),
  active: z.boolean().default(true),
  eventTypes: z.array(z.enum(supportedEventTypes)).min(1)
});

export const updateEndpointSchema = createEndpointSchema.partial().extend({
  eventTypes: z.array(z.enum(supportedEventTypes)).min(1).optional()
});

export const ingestEventSchema = z.object({
  type: z.enum(supportedEventTypes),
  data: z.record(z.string(), z.unknown())
});

export const deliveryFilterSchema = z.object({
  status: z.enum(deliveryStatuses).optional(),
  endpointId: z.string().optional(),
  eventType: z.enum(supportedEventTypes).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional()
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateEndpointInput = z.infer<typeof createEndpointSchema>;
export type UpdateEndpointInput = z.infer<typeof updateEndpointSchema>;
export type IngestEventInput = z.infer<typeof ingestEventSchema>;
