import { YoutubeTranscript } from "youtube-transcript";

export interface YouTubeVideoItem {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  channelTitle: string;
  channelUrl: string;
  publishedAt: string;
}

export interface YouTubeSearchResponse {
  success: boolean;
  data?: YouTubeVideoItem[];
  error?: string;
  quotaExceeded?: boolean;
}

export interface YouTubeVideoInfoResponse {
  success: boolean;
  data?: YouTubeVideoItem;
  error?: string;
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
      standard?: { url: string };
      maxres?: { url: string };
    };
    channelTitle: string;
    publishedAt: string;
  };
  statistics: {
    viewCount: string;
    likeCount: string;
    commentCount: string;
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
    part: "snippet,statistics",
    type: "video",
  });
  params.append("maxResults", maxResults.toString());

  const fetchUrl = `${YOUTUBE_API_URL}?${params.toString()}`;

  try {
    const response = await fetch(fetchUrl);
    const data = await response.json();

    if (!response.ok) {
      console.error("YouTube API Error:", data.error?.message || data);
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

    const videos: YouTubeVideoItem[] = await Promise.all(
      data.items.map(async (item: YouTubeApiItem) => {
        // Get full video details using videos.list endpoint
        const fullVideoInfo = await getYouTubeVideoInfo(item.id.videoId);

        if (fullVideoInfo.success && fullVideoInfo.data) {
          return fullVideoInfo.data;
        }

        // Fallback to search result data if full video info fetch fails
        const thumbs = item.snippet.thumbnails;
        let selectedThumbnailUrl = thumbs.default.url;

        if (thumbs.standard?.url) {
          selectedThumbnailUrl = thumbs.standard.url;
        } else if (thumbs.high?.url) {
          selectedThumbnailUrl = thumbs.high.url;
        } else if (thumbs.medium?.url) {
          selectedThumbnailUrl = thumbs.medium.url;
        }

        const snippet = item.snippet;
        const statistics = item.statistics;

        if (!snippet || !statistics) {
          console.warn(
            `Snippet or statistics missing for video ID: ${item.id.videoId}`,
          );
          return null;
        }

        // --- Calculate Popularity Score ---
        const now = new Date();
        const publishedDate = new Date(snippet.publishedAt);
        const ageInMilliseconds = now.getTime() - publishedDate.getTime();

        // Calculate age in days. Ensure at least 1 day to avoid division by zero for brand new videos.
        const ageInDays = Math.max(
          1,
          ageInMilliseconds / (1000 * 60 * 60 * 24),
        );

        const viewCount = parseInt(statistics.viewCount) || 0;
        const likeCount = parseInt(statistics.likeCount) || 0;
        //const commentCount = parseInt(item.statistics.commentCount) || 0;

        const viewsPerDay = viewCount / ageInDays;
        const likesPerDay = likeCount / ageInDays;
        // const commentsPerDay = commentCount / ageInDays; // If using comments

        // Define weights for each factor (these are subjective and can be tuned)
        const WEIGHT_VIEWS_RATE = 0.6; // Give more weight to view velocity
        const WEIGHT_LIKES_RATE = 0.4; // Give less weight to like velocity
        // const WEIGHT_COMMENTS_RATE = 0.1; // Example if adding comments

        const popularityScore =
          WEIGHT_VIEWS_RATE * viewsPerDay + WEIGHT_LIKES_RATE * likesPerDay;
        // + (WEIGHT_COMMENTS_RATE * commentsPerDay); // If using comments

        return {
          id: item.id.videoId,
          title: decodeHtmlEntities(item.snippet.title),
          description: decodeHtmlEntities(item.snippet.description),
          thumbnailUrl: selectedThumbnailUrl,
          channelTitle: decodeHtmlEntities(item.snippet.channelTitle),
          channelUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(item.snippet.channelTitle)}`,
          popularityScore: parseFloat(popularityScore.toFixed(4)),
          publishedAt: item.snippet.publishedAt,
        };
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

  let retries = 3;
  let lastError: unknown = null;

  while (retries > 0) {
    try {
      const transcriptResponse =
        await YoutubeTranscript.fetchTranscript(videoId);
      if (transcriptResponse && transcriptResponse.length > 0) {
        const rawTranscriptText = transcriptResponse
          .map((line) => line.text)
          .join(" ");
        const decodedTranscriptText = decodeHtmlEntities(rawTranscriptText);
        return { success: true, transcript: decodedTranscriptText };
      } else {
        // Transcript was "found" but is empty. No need to retry.
        return { success: false, error: "No transcript found or it is empty." };
      }
    } catch (error) {
      lastError = error;
      retries--;
      console.warn(
        `Attempt to fetch transcript for video ID ${videoId} failed. Retries left: ${retries}`,
        error,
      );
      if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second before retrying
      } else {
        // All retries failed, proceed to the main error handling below
        break;
      }
    }
  }

  // If loop finishes due to retries exhausted, lastError will be set
  // The original catch block will handle formatting this error
  console.error(
    `All attempts to fetch transcript for video ID ${videoId} failed. Last error:`,
    lastError,
  );
  let errorMessage = "Failed to fetch transcript after multiple attempts.";
  if (lastError instanceof Error) {
    if (lastError.message.includes("disabled transcripts")) {
      errorMessage = "Transcripts are disabled for this video.";
    } else if (lastError.message.includes("no transcripts are available")) {
      errorMessage = "No transcripts are available for this video.";
    } else {
      errorMessage = `Failed to fetch transcript: ${lastError.message}`;
    }
  }

  return { success: false, error: errorMessage };
}

export async function getYouTubeVideoInfo(
  videoId: string,
): Promise<YouTubeVideoInfoResponse> {
  if (!YOUTUBE_API_KEY) {
    console.error("YouTube API key is not configured.");
    return {
      success: false,
      error:
        "YouTube API key is not configured. Please check server configuration.",
    };
  }

  if (!videoId) {
    return { success: false, error: "Video ID is required." };
  }

  const params = new URLSearchParams({
    key: YOUTUBE_API_KEY,
    id: videoId,
    part: "snippet",
  });

  const fetchUrl = `${YOUTUBE_API_URL.replace("/search", "/videos")}?${params.toString()}`;

  try {
    const response = await fetch(fetchUrl);
    const data = await response.json();

    if (!response.ok) {
      console.error("YouTube API Error:", data.error?.message || data);
      const errorMessage =
        data.error?.message ||
        "An unknown error occurred with the YouTube API.";
      return {
        success: false,
        error: errorMessage,
      };
    }

    if (!data.items || data.items.length === 0) {
      return { success: false, error: "Video not found." };
    }

    const item = data.items[0];
    const thumbs = item.snippet.thumbnails;
    let selectedThumbnailUrl = thumbs.default.url;

    if (thumbs.standard?.url) {
      selectedThumbnailUrl = thumbs.standard.url;
    } else if (thumbs.high?.url) {
      selectedThumbnailUrl = thumbs.high.url;
    } else if (thumbs.medium?.url) {
      selectedThumbnailUrl = thumbs.medium.url;
    }

    // Get channel ID from the snippet
    const channelId = item.snippet.channelId;
    const channelUrl = `https://www.youtube.com/channel/${channelId}`;

    const videoInfo: YouTubeVideoItem = {
      id: item.id,
      title: decodeHtmlEntities(item.snippet.title),
      description: decodeHtmlEntities(item.snippet.description),
      thumbnailUrl: selectedThumbnailUrl,
      channelTitle: decodeHtmlEntities(item.snippet.channelTitle),
      channelUrl,
      publishedAt: item.snippet.publishedAt,
    };

    return { success: true, data: videoInfo };
  } catch (error) {
    console.error("Failed to fetch from YouTube API:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return {
      success: false,
      error: "An unexpected error occurred while fetching video information.",
    };
  }
}

// Interface for the status of a single video from our new function
export interface YouTubeVideoStatus {
  id: string;
  found: boolean;
  uploadStatus?: string; // e.g., "processed", "failed", "deleted", "rejected"
  privacyStatus?: string; // e.g., "public", "private", "unlisted"
  embeddable?: boolean;
  liveBroadcastContent?: string; // "none", "live", "upcoming"
  // Add other relevant status fields if needed
}

// Define a more specific type for the status object from YouTube API's video item
interface YouTubeApiVideoStatusObject {
  uploadStatus: string;
  privacyStatus: string;
  license: string;
  embeddable: boolean;
  publicStatsViewable: boolean;
  madeForKids?: boolean;
  selfDeclaredMadeForKids?: boolean;
  liveBroadcastContent?: string; // Added this as it's in YouTubeVideoStatus
}

// The new function to get publication statuses for multiple video IDs
export async function getVideoPublicationStatuses(videoIds: string[]): Promise<{
  success: boolean;
  statuses?: YouTubeVideoStatus[];
  error?: string;
  quotaExceeded?: boolean;
}> {
  if (!YOUTUBE_API_KEY) {
    console.error("YouTube API key is not configured.");
    return {
      success: false,
      error: "YouTube API key not configured.",
    };
  }
  if (!videoIds || videoIds.length === 0) {
    return { success: true, statuses: [] }; // No IDs, no work, success.
  }
  if (videoIds.length > 50) {
    // YouTube API limit for videos.list by ID is 50.
    // This function could be enhanced to handle >50 by batching, but for now, it errors.
    // For a robust cron job, batching would be implemented here or in the calling service.
    console.warn(
      "getVideoPublicationStatuses called with >50 video IDs. API limit is 50. Processing only first 50.",
    );
    // For simplicity in this step, we'll just slice. A real implementation would batch.
    // videoIds = videoIds.slice(0, 50); // Or error out as below:
    return {
      success: false,
      error:
        "Cannot fetch more than 50 video statuses at once with this version. Please implement batching.",
    };
  }

  const params = new URLSearchParams({
    key: YOUTUBE_API_KEY,
    id: videoIds.join(","),
    part: "status,id", // Requesting status and id parts
  });

  const fetchUrl = `https://www.googleapis.com/youtube/v3/videos?${params.toString()}`;
  const results: YouTubeVideoStatus[] = [];

  try {
    const response = await fetch(fetchUrl);
    const data = await response.json(); // Assuming youtube_v3.Schema$VideoListResponse structure

    if (!response.ok) {
      console.error(
        "YouTube API Error (getVideoPublicationStatuses):",
        data.error?.message || data,
      );
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

    const statusMap = new Map<string, YouTubeApiVideoStatusObject>(); // Use the new interface
    if (data.items && Array.isArray(data.items)) {
      // Add Array.isArray check for robustness
      for (const item of data.items) {
        // item should be typed if possible, e.g., { id: string; status: YouTubeApiVideoStatusObject }
        if (item && typeof item.id === "string" && item.status) {
          // Ensure item.id and item.status exist
          statusMap.set(item.id, item.status as YouTubeApiVideoStatusObject);
        }
      }
    }

    // Ensure all requested IDs have an entry, even if not found by API
    for (const reqId of videoIds) {
      const statusDetail = statusMap.get(reqId);
      if (statusDetail) {
        results.push({
          id: reqId,
          found: true,
          uploadStatus: statusDetail.uploadStatus,
          privacyStatus: statusDetail.privacyStatus,
          embeddable: statusDetail.embeddable,
          liveBroadcastContent: statusDetail.liveBroadcastContent, // This might not be on statusDetail if not on YouTubeApiVideoStatusObject
        });
      } else {
        results.push({
          id: reqId,
          found: false, // Video ID not found in API response
        });
      }
    }
    return { success: true, statuses: results };
  } catch (error) {
    console.error("Failed to fetch video statuses from YouTube API:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.",
    };
  }
}
