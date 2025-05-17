import { z } from "zod";
import { VideoStatus, VideoPlatform } from "@generated/prisma";
import { slugSchema } from "./commonSchemas";

export const videoSchema = z.object({
  platform: z.nativeEnum(VideoPlatform),
  id: z.number().optional(),
  videoId: z.string().min(1, "Video ID is required"),
  title: z.string().min(3, "Title must be at least 3 characters long"),
  description: z.string().optional(),
  url: z
    .string()
    .url({ message: "Invalid URL format" })
    .optional()
    .or(z.literal("")),
  slug: slugSchema.optional().or(z.literal("")),
  thumbnailUrl: z
    .string()
    .url({ message: "Invalid URL format" })
    .optional()
    .or(z.literal("")),
  channelTitle: z.string().optional(),
  channelUrl: z
    .string()
    .url({ message: "Invalid channel URL format" })
    .optional()
    .or(z.literal("")),
  categoryIds: z
    .array(z.coerce.number().int().positive())
    .optional()
    .default([]),
  status: z.nativeEnum(VideoStatus),
  tags: z.array(z.string()).optional().default([]),
  vwTypes: z.array(z.string()).optional().default([]),
  transcript: z.string().optional(),
  popularityScore: z.number().nullable().optional(),
});

export type VideoFormData = z.infer<typeof videoSchema>;
