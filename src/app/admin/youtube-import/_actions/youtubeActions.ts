"use server";

import { prisma } from "@/lib/db";
import { VideoPlatform, VideoStatus } from "@generated/prisma";
import { revalidatePath } from "next/cache";

// Define the structure of a single video item from YouTube API results
export interface YouTubeVideoItem {
  id: string; // Video ID
  title: string;
  description: string;
  thumbnailUrl: string; // Default thumbnail URL
  channelTitle: string;
  publishedAt: string;
}

// Define the structure of the server action's response
interface YouTubeSearchResponse {
  success: boolean;
  data?: YouTubeVideoItem[];
  error?: string;
  quotaExceeded?: boolean;
}

// Define the structure for the import action's response
export interface ImportVideoResponse {
  success: boolean;
  message: string;
  videoId?: string; // YouTube video ID
}

// Minimal type for YouTube API error objects
interface YouTubeApiError {
  reason?: string;
  message?: string;
  // other potential fields
}

// Minimal type for YouTube API search result item
interface YouTubeApiItem {
  id: { videoId: string };
  snippet: {
    title: string;
    description: string;
    thumbnails: {
      default: { url: string };
      medium?: { url: string };
      high?: { url: string };
    };
    channelTitle: string;
    publishedAt: string;
  };
}

const YOUTUBE_API_KEY = process.env.YOUTUBE_DATA_API_KEY;
const YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3/search";

function decodeHtmlEntities(text: string): string {
  if (!text) return "";
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

export async function searchYouTubeVideos(
  query: string,
  maxResults: number = 10,
): Promise<YouTubeSearchResponse> {
  if (!YOUTUBE_API_KEY) {
    console.error("YouTube API key is not configured.");
    return {
      success: false,
      error:
        "YouTube API key is not configured. Please check server configuration.",
    };
  }

  if (!query.trim()) {
    return { success: false, error: "Search query cannot be empty." };
  }

  const params = new URLSearchParams({
    key: YOUTUBE_API_KEY,
    q: query,
    part: "snippet",
    type: "video",
    maxResults: maxResults.toString(),
    // You can add more parameters like regionCode, relevanceLanguage, etc.
    // relevanceLanguage: 'en',
    // videoEmbeddable: 'true',
  });

  try {
    const response = await fetch(`${YOUTUBE_API_URL}?${params.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      console.error("YouTube API Error:", data);
      const errorMessage =
        data.error?.message ||
        "An unknown error occurred with the YouTube API.";
      const isQuotaError = data.error?.errors?.some(
        (e: YouTubeApiError) => e.reason === "quotaExceeded",
      );
      return {
        success: false,
        error: errorMessage,
        quotaExceeded: isQuotaError,
      };
    }

    if (!data.items || data.items.length === 0) {
      return { success: true, data: [] };
    }

    const videos: YouTubeVideoItem[] = data.items.map(
      (item: YouTubeApiItem) => ({
        id: item.id.videoId,
        title: decodeHtmlEntities(item.snippet.title),
        description: decodeHtmlEntities(item.snippet.description),
        thumbnailUrl: item.snippet.thumbnails.default.url, // or medium/high
        channelTitle: decodeHtmlEntities(item.snippet.channelTitle),
        publishedAt: item.snippet.publishedAt,
      }),
    );

    return { success: true, data: videos };
  } catch (error) {
    console.error("Failed to fetch from YouTube API:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return {
      success: false,
      error: "An unexpected error occurred while fetching videos.",
    };
  }
}

export async function importYouTubeVideo(
  videoData: YouTubeVideoItem,
  categoryId: number, // Assuming categoryId is passed for now
): Promise<ImportVideoResponse> {
  if (!videoData || !videoData.id) {
    return { success: false, message: "Invalid video data provided." };
  }
  if (!categoryId) {
    return { success: false, message: "Category ID is required." };
  }

  try {
    const existingVideo = await prisma.video.findUnique({
      where: { videoId: videoData.id },
    });

    if (existingVideo) {
      return {
        success: false,
        message: `Video "${videoData.title}" already exists in the database.`,
        videoId: videoData.id,
      };
    }

    const newVideo = await prisma.video.create({
      data: {
        platform: VideoPlatform.YOUTUBE,
        videoId: videoData.id,
        title: videoData.title,
        description: videoData.description || "",
        url: `https://www.youtube.com/watch?v=${videoData.id}`,
        thumbnailUrl: videoData.thumbnailUrl,
        status: VideoStatus.DRAFT, // Default status
        categoryId: categoryId,
        // publishedAt from YouTube is a string, Prisma expects DateTime.
        // We can either store it as a string in a new field, or parse it.
        // For now, not storing YouTube's publishedAt.
      },
    });

    revalidatePath("/admin/videos"); // Revalidate the main videos list
    revalidatePath("/admin/dashboard"); // Revalidate dashboard for counts

    return {
      success: true,
      message: `Video "${newVideo.title}" imported successfully!`,
      videoId: newVideo.videoId,
    };
  } catch (error) {
    console.error("Failed to import YouTube video:", error);
    let errorMessage = "An unexpected error occurred during import.";
    if (error instanceof Error) {
      // Check for specific Prisma errors if needed, e.g., P2002 for unique constraint
      errorMessage = error.message;
    }
    return {
      success: false,
      message: errorMessage,
      videoId: videoData.id,
    };
  }
}
