"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { Channel, VideoPlatform } from "@generated/prisma";

// Validation schema for channel data
const channelSchema = z.object({
  name: z.string().min(1, "Name is required"),
  platformChannelId: z.string().min(1, "Platform Channel ID is required"),
  url: z.string().url("Invalid URL").min(1, "URL is required"),
  thumbnailUrl: z.string().url("Invalid URL").optional(),
  subscriberCount: z.number().optional(),
  videoCount: z.number().optional(),
  description: z.string().optional(),
});

type ChannelFormData = z.infer<typeof channelSchema>;

// Response type for channel actions
interface ActionResponse<T> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

// Get all channels
export async function getChannels(): Promise<ActionResponse<Channel[]>> {
  try {
    const channels = await prisma.channel.findMany({
      orderBy: { name: "asc" },
    });
    return { success: true, data: channels };
  } catch (error) {
    console.error("Error fetching channels:", error);
    return {
      success: false,
      error: "Failed to fetch channels",
    };
  }
}

// Get channel by ID
export async function getChannelById(
  id: number,
): Promise<ActionResponse<Channel>> {
  try {
    const channel = await prisma.channel.findUnique({
      where: { id },
    });

    if (!channel) {
      return {
        success: false,
        error: "Channel not found",
      };
    }

    return { success: true, data: channel };
  } catch (error) {
    console.error("Error fetching channel:", error);
    return {
      success: false,
      error: "Failed to fetch channel",
    };
  }
}

// Add a new channel
export async function addChannel(
  data: ChannelFormData,
): Promise<ActionResponse<Channel>> {
  try {
    // Validate input data
    const validationResult = channelSchema.safeParse(data);
    if (!validationResult.success) {
      return {
        success: false,
        error: "Invalid channel data",
      };
    }

    // Check if channel with same platformChannelId already exists
    const existingChannel = await prisma.channel.findUnique({
      where: {
        platform_platformChannelId: {
          platform: VideoPlatform.YOUTUBE,
          platformChannelId: data.platformChannelId,
        },
      },
    });

    if (existingChannel) {
      return {
        success: false,
        error: "A channel with this Platform Channel ID already exists",
      };
    }

    // Create new channel
    const channel = await prisma.channel.create({
      data: {
        name: data.name,
        platform: VideoPlatform.YOUTUBE,
        platformChannelId: data.platformChannelId,
        url: data.url,
        thumbnailUrl: data.thumbnailUrl || undefined,
        subscriberCount: data.subscriberCount || 0,
        videoCount: data.videoCount || 0,
        description: data.description || undefined,
      },
    });

    return { success: true, data: channel };
  } catch (error) {
    console.error("Error adding channel:", error);
    return {
      success: false,
      error: "Failed to add channel",
    };
  }
}

// Update an existing channel
export async function updateChannel(
  id: number,
  data: ChannelFormData,
): Promise<ActionResponse<Channel>> {
  try {
    // Validate input data
    const validationResult = channelSchema.safeParse(data);
    if (!validationResult.success) {
      return {
        success: false,
        error: "Invalid channel data",
      };
    }

    // Check if channel exists
    const existingChannel = await prisma.channel.findUnique({
      where: { id },
    });

    if (!existingChannel) {
      return {
        success: false,
        error: "Channel not found",
      };
    }

    // Check if another channel with the same platformChannelId exists
    if (data.platformChannelId !== existingChannel.platformChannelId) {
      const duplicateChannel = await prisma.channel.findUnique({
        where: {
          platform_platformChannelId: {
            platform: VideoPlatform.YOUTUBE,
            platformChannelId: data.platformChannelId,
          },
        },
      });

      if (duplicateChannel) {
        return {
          success: false,
          error: "A channel with this Platform Channel ID already exists",
        };
      }
    }

    // Update channel
    const channel = await prisma.channel.update({
      where: { id },
      data: {
        name: data.name,
        platform: VideoPlatform.YOUTUBE,
        platformChannelId: data.platformChannelId,
        url: data.url,
        thumbnailUrl: data.thumbnailUrl || undefined,
        subscriberCount: data.subscriberCount || 0,
        videoCount: data.videoCount || 0,
        description: data.description || undefined,
      },
    });

    return { success: true, data: channel };
  } catch (error) {
    console.error("Error updating channel:", error);
    return {
      success: false,
      error: "Failed to update channel",
    };
  }
}

// Delete a channel
export async function deleteChannel(id: number): Promise<ActionResponse<null>> {
  try {
    // Check if channel exists
    const existingChannel = await prisma.channel.findUnique({
      where: { id },
    });

    if (!existingChannel) {
      return {
        success: false,
        error: "Channel not found",
      };
    }

    // Delete channel
    await prisma.channel.delete({
      where: { id },
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting channel:", error);
    return {
      success: false,
      error: "Failed to delete channel",
    };
  }
}

// Bulk delete channels
export async function bulkDeleteChannels(
  ids: number[],
): Promise<ActionResponse<null>> {
  if (!ids || ids.length === 0) {
    return {
      success: false,
      error: "No channel IDs provided for deletion.",
    };
  }

  try {
    const result = await prisma.channel.deleteMany({
      where: {
        id: { in: ids },
      },
    });

    return {
      success: true,
      message: `${result.count} channel(s) deleted successfully.`,
    };
  } catch (error) {
    console.error("Failed to bulk delete channels:", error);
    return {
      success: false,
      error: "An error occurred while deleting channels.",
    };
  }
}
