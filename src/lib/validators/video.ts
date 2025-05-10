import { z } from "zod";
import { VideoStatus, VideoPlatform } from "@generated/prisma"; // Added VideoPlatform

export const videoSchema = z.object({
  platform: z.nativeEnum(VideoPlatform), // Added platform field
  videoId: z.string().min(1, "Video ID is required"),
  title: z.string().min(3, "Title must be at least 3 characters long"),
  description: z.string().optional(),
  url: z
    .string()
    .url({ message: "Invalid URL format" })
    .optional()
    .or(z.literal("")), // Made url optional as it can be derived
  thumbnailUrl: z
    .string()
    .url({ message: "Invalid URL format" })
    .optional()
    .or(z.literal("")), // Allow empty string to clear
  categoryId: z.coerce
    .number()
    .int()
    .positive({ message: "Please select a category" }),
  status: z.nativeEnum(VideoStatus).optional(),
});

export type VideoFormData = z.infer<typeof videoSchema>;
