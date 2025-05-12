import { z } from "zod";
import { VideoStatus, VideoPlatform, VWType } from "@generated/prisma";

export const videoSchema = z.object({
  platform: z.nativeEnum(VideoPlatform),
  videoId: z.string().min(1, "Video ID is required"),
  title: z.string().min(3, "Title must be at least 3 characters long"),
  description: z.string().optional(),
  url: z
    .string()
    .url({ message: "Invalid URL format" })
    .optional()
    .or(z.literal("")),
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
    .min(1, { message: "Please select at least one category" }),
  status: z.nativeEnum(VideoStatus).optional(),
  tags: z.array(z.string()).optional().default([]),
  vwTypes: z.array(z.nativeEnum(VWType)).optional().default([]),
});

// Manually define VideoFormData to include fields not in the schema for submission (like read-only transcript)
export interface VideoFormData {
  platform: VideoPlatform;
  videoId: string;
  title: string;
  description?: string;
  url?: string;
  thumbnailUrl?: string;
  channelTitle?: string;
  channelUrl?: string;
  categoryIds: number[];
  status?: VideoStatus;
  transcript?: string | null;
  tags?: string[];
  vwTypes?: VWType[];
}
