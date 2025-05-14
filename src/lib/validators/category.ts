import { z } from "zod";
import { slugSchema } from "./commonSchemas";

export const categorySchema = z.object({
  name: z
    .string()
    .min(1, "Category name is required")
    .max(100, "Category name must be 100 characters or less"),
  description: z
    .string()
    .max(255, "Description must be 255 characters or less")
    .optional(),
  slug: slugSchema.optional().or(z.literal("")),
});

export type CategoryFormData = z.infer<typeof categorySchema>;
