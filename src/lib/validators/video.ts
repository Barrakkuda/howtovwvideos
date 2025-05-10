import { z } from "zod";
import { VideoStatus } from "@prisma/client"; // Adjust if your generated client path is different

export const videoSchema = z.object({
  videoId: z.string().min(1, "Video ID is required"),
  title: z.string().min(3, "Title must be at least 3 characters long"),
  description: z.string().optional(),
  url: z.string().url({ message: "Invalid URL format" }),
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
