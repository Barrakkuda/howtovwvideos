import { z } from "zod";
import { slugSchema } from "./commonSchemas";

export const vwTypeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: slugSchema.optional().or(z.literal("")),
  description: z.string().optional(),
  sortOrder: z.coerce.number().int().default(0),
});

export type VWTypeFormData = z.infer<typeof vwTypeSchema>;

export const vwTypeUpdateSchema = vwTypeSchema.extend({
  id: z.number(),
});

export type VWTypeUpdateFormData = z.infer<typeof vwTypeUpdateSchema>;
