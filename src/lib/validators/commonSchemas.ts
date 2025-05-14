import { z } from "zod";

export const slugSchema = z
  .string()
  .min(3, { message: "Slug must be at least 3 characters long." })
  .max(200, { message: "Slug cannot exceed 200 characters." })
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      "Slug must be lowercase alphanumeric with hyphens, and cannot start or end with a hyphen or have consecutive hyphens.",
  })
  .refine((s) => !s.startsWith("-") && !s.endsWith("-"), {
    message: "Slug cannot start or end with a hyphen.",
  })
  .refine((s) => !s.includes("--"), {
    message: "Slug cannot contain consecutive hyphens.",
  });

// Example: Shared ID schema (can be uncommented and used if needed elsewhere)
// export const idSchema = z.coerce.number().int().positive();
