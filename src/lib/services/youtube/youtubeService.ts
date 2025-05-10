import { YoutubeTranscript } from "youtube-transcript";

// Types
export interface YouTubeVideoItem {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  channelTitle: string;
  publishedAt: string;
}

export interface YouTubeSearchResponse {
  success: boolean;
  data?: YouTubeVideoItem[];
  error?: string;
  quotaExceeded?: boolean;
}

interface YouTubeApiError {
  reason?: string;
  message?: string;
}

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
        thumbnailUrl: item.snippet.thumbnails.default.url,
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

export async function getYouTubeTranscript(
  videoId: string,
): Promise<{ success: boolean; transcript?: string; error?: string }> {
  if (!videoId) {
    return { success: false, error: "Video ID is required." };
  }

  try {
    const transcriptResponse = await YoutubeTranscript.fetchTranscript(videoId);
    if (transcriptResponse && transcriptResponse.length > 0) {
      const rawTranscriptText = transcriptResponse
        .map((line) => line.text)
        .join(" ");
      const decodedTranscriptText = decodeHtmlEntities(rawTranscriptText);
      return { success: true, transcript: decodedTranscriptText };
    } else {
      return { success: false, error: "No transcript found or it is empty." };
    }
  } catch (error) {
    console.warn(`Could not fetch transcript for video ID ${videoId}:`, error);
    let errorMessage = "Failed to fetch transcript.";
    if (
      error instanceof Error &&
      error.message.includes("disabled transcripts")
    ) {
      errorMessage = "Transcripts are disabled for this video.";
    } else if (
      error instanceof Error &&
      error.message.includes("no transcripts are available")
    ) {
      errorMessage = "No transcripts are available for this video.";
    }

    return { success: false, error: errorMessage };
  }
}
