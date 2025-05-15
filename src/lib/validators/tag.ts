import { z } from "zod";

// Schema for Tag data, used for validation when creating/updating
export const tagSchema = z.object({
  name: z
    .string({
      required_error: "Name is required.",
      invalid_type_error: "Name must be a string.",
    })
    .trim()
    .min(1, "Name cannot be empty.")
    .max(100, "Name must be 100 characters or fewer."),
  slug: z
    .string({
      required_error: "Slug is required.",
      invalid_type_error: "Slug must be a string.",
    })
    .trim()
    .min(1, "Slug cannot be empty.")
    .max(120, "Slug must be 120 characters or fewer.")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase, alphanumeric, and can contain hyphens (e.g., 'my-tag-slug'). No spaces or special characters other than hyphens.",
    ),
  description: z
    .string({
      invalid_type_error: "Description must be a string.",
    })
    .trim()
    .max(500, "Description must be 500 characters or fewer.")
    .nullable()
    .optional(), // Description is optional
});

// Schema for processing form data for Tags.
// Slug is made optional here because it can be manually entered or generated via a separate client/server action.
// The server action will ensure a slug is present and valid before saving.
export const tagFormDataSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required.")
    .max(100, "Name must be 100 characters or fewer.")
    .trim(),
  slug: z
    .string()
    .max(120, "Slug must be 120 characters or fewer.")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message:
        "Slug must be lowercase, alphanumeric, and hyphenated (e.g., 'my-tag-slug') if provided.",
    })
    .optional()
    .transform((e) => (e === "" ? undefined : e)), // Treat empty string as undefined so optional works as expected
  description: z
    .string()
    .max(500, "Description must be 500 characters or fewer.")
    .optional(),
});

// TypeScript type for form data, derived from the schema
export type TagFormData = z.infer<typeof tagFormDataSchema>;
