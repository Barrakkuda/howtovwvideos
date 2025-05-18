import { YoutubeTranscript } from "youtube-transcript";
import { VideoPlatform } from "@generated/prisma";

// New interface for detailed channel information
export interface YouTubeChannelDetails {
  platformId: string; // YouTube Channel ID
  name: string;
  url: string;
  thumbnailUrl?: string;
  description?: string;
  customUrl?: string;
  country?: string;
  publishedAt?: string; // Channel's publishedAt
  subscriberCount?: number;
  videoCount?: number;
  viewCount?: number; // Total views for the channel's videos
  platform: VideoPlatform;
}

export interface YouTubeVideoItem {
  id: string; // Video ID
  title: string;
  description: string;
  thumbnailUrl: string;
  channel?: YouTubeChannelDetails; // Nested channel details
  publishedAt: string; // Video's publishedAt
  viewCount?: number;
  likeCount?: number;
  popularityScore?: number;
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

// For Video API Item
interface YouTubeVideoApiItemSnippet {
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
  publishedAt: string; // Video published at
  channelId: string;
}

interface YouTubeVideoApiItemStatistics {
  viewCount: string;
  likeCount: string;
  commentCount: string; // Though we don't use it now
}

interface YouTubeVideoApiItem {
  id: string; // Video ID
  snippet: YouTubeVideoApiItemSnippet;
  statistics?: YouTubeVideoApiItemStatistics;
}

// For Channel API Item
interface YouTubeChannelApiItem {
  id: string; // Channel ID
  snippet: {
    title: string;
    description?: string;
    customUrl?: string;
    publishedAt?: string; // Channel published at
    thumbnails: {
      default?: { url: string };
      medium?: { url: string };
      high?: { url: string };
    };
    country?: string;
  };
  statistics: {
    viewCount: string; // Channel total views
    subscriberCount: string;
    hiddenSubscriberCount: boolean;
    videoCount: string;
  };
  brandingSettings?: {
    // For more thumbnail options, though usually snippet.thumbnails is enough
    image?: {
      bannerExternalUrl?: string;
    };
  };
}

interface YouTubeSearchApiResultItem {
  kind: string;
  etag: string;
  id: {
    kind: string;
    videoId: string;
  };
  snippet: YouTubeVideoApiItemSnippet; // Assuming YouTubeVideoApiItemSnippet is defined above
}

const YOUTUBE_API_KEY = process.env.YOUTUBE_DATA_API_KEY;
const YOUTUBE_API_BASE_URL = "https://www.googleapis.com/youtube/v3";

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

export function calculatePopularityScore(
  viewCountInput: number | undefined | null,
  likeCountInput: number | undefined | null,
  publishedAt: string | Date | undefined | null, // Video's publishedAt
): number | null {
  if (!publishedAt) {
    console.log(
      "[DEBUG] calculatePopularityScore returning null due to missing video publishedAt.",
    );
    return null;
  }
  const views = Number(viewCountInput);
  const likes = Number(likeCountInput);
  const now = new Date();
  const videoPublishedDate = new Date(publishedAt);
  if (isNaN(videoPublishedDate.getTime())) {
    console.log(
      "[DEBUG] calculatePopularityScore returning null due to invalid video publishedAt date.",
    );
    return null;
  }
  const ageInMilliseconds = now.getTime() - videoPublishedDate.getTime();
  const ageInDays = Math.max(1, ageInMilliseconds / (1000 * 60 * 60 * 24));
  if (isNaN(ageInDays) || ageInDays <= 0) {
    console.log(
      "[DEBUG] calculatePopularityScore returning null due to invalid ageInDays for video.",
    );
    return null;
  }
  const viewsPerDay = views / ageInDays;
  const likesPerDay = likes / ageInDays;
  const WEIGHT_VIEWS_RATE = 0.6;
  const WEIGHT_LIKES_RATE = 0.4;
  const score =
    WEIGHT_VIEWS_RATE * viewsPerDay + WEIGHT_LIKES_RATE * likesPerDay;
  if (isNaN(score)) {
    console.log("[DEBUG] Popularity score is NaN. Inputs:", {
      views,
      likes,
      ageInDays,
      viewsPerDay,
      likesPerDay,
    });
    return null;
  }
  return parseFloat(score.toFixed(4));
}

async function getYouTubeChannelDetailsByApi( // Renamed to avoid conflict if you had another
  channelPlatformId: string,
): Promise<YouTubeChannelDetails | null> {
  if (!YOUTUBE_API_KEY) {
    console.error("YouTube API key is not configured for channel details.");
    return null;
  }
  if (!channelPlatformId) {
    console.error("Channel ID is required to fetch channel details.");
    return null;
  }

  const params = new URLSearchParams({
    key: YOUTUBE_API_KEY,
    id: channelPlatformId,
    part: "snippet,statistics,brandingSettings", // brandingSettings for more image options if needed
  });
  const fetchUrl = `${YOUTUBE_API_BASE_URL}/channels?${params.toString()}`;

  try {
    const response = await fetch(fetchUrl);
    const data = await response.json();

    if (!response.ok || !data.items || data.items.length === 0) {
      console.error(
        `Failed to fetch channel details for ID ${channelPlatformId}:`,
        data.error?.message || "Channel not found or API error",
      );
      return null;
    }

    const item: YouTubeChannelApiItem = data.items[0];
    const snippet = item.snippet;
    const stats = item.statistics;

    let channelThumbnail = snippet.thumbnails?.default?.url;
    if (snippet.thumbnails?.medium?.url)
      channelThumbnail = snippet.thumbnails.medium.url;
    if (snippet.thumbnails?.high?.url)
      channelThumbnail = snippet.thumbnails.high.url;

    const channelUrl = item.snippet.customUrl
      ? `https://www.youtube.com/${item.snippet.customUrl}`
      : `https://www.youtube.com/channel/${item.id}`;

    return {
      platformId: item.id,
      name: decodeHtmlEntities(snippet.title),
      url: channelUrl,
      thumbnailUrl: channelThumbnail,
      description: snippet.description
        ? decodeHtmlEntities(snippet.description)
        : undefined,
      customUrl: snippet.customUrl
        ? decodeHtmlEntities(snippet.customUrl)
        : undefined,
      country: snippet.country,
      publishedAt: snippet.publishedAt, // Channel's published date
      subscriberCount: stats.hiddenSubscriberCount
        ? undefined
        : parseInt(stats.subscriberCount) || 0,
      videoCount: parseInt(stats.videoCount) || 0,
      viewCount: parseInt(stats.viewCount) || 0,
      platform: VideoPlatform.YOUTUBE,
    };
  } catch (error) {
    console.error(
      `Error fetching channel details for ID ${channelPlatformId}:`,
      error,
    );
    return null;
  }
}

export async function getYouTubeVideoInfo(
  videoId: string,
): Promise<YouTubeVideoInfoResponse> {
  if (!YOUTUBE_API_KEY) {
    console.error("YouTube API key is not configured.");
    return { success: false, error: "YouTube API key not configured." };
  }
  if (!videoId) {
    return { success: false, error: "Video ID is required." };
  }

  const videoParams = new URLSearchParams({
    key: YOUTUBE_API_KEY,
    id: videoId,
    part: "snippet,statistics",
  });
  const videoFetchUrl = `${YOUTUBE_API_BASE_URL}/videos?${videoParams.toString()}`;

  try {
    const videoResponse = await fetch(videoFetchUrl);
    const videoData = await videoResponse.json();

    if (!videoResponse.ok) {
      console.error(
        "YouTube API Error (Video Info):",
        videoData.error?.message || videoData,
      );
      return {
        success: false,
        error: videoData.error?.message || "Unknown API error fetching video.",
      };
    }
    if (!videoData.items || videoData.items.length === 0) {
      return { success: false, error: "Video not found." };
    }

    const videoItem: YouTubeVideoApiItem = videoData.items[0];
    const snippet = videoItem.snippet;
    const statistics = videoItem.statistics;

    const thumbs = snippet.thumbnails;
    let selectedThumbnailUrl = thumbs.default.url;
    if (thumbs.standard?.url) selectedThumbnailUrl = thumbs.standard.url;
    else if (thumbs.high?.url) selectedThumbnailUrl = thumbs.high.url;
    else if (thumbs.medium?.url) selectedThumbnailUrl = thumbs.medium.url;

    let channelData: YouTubeChannelDetails | null = null;
    if (snippet.channelId) {
      channelData = await getYouTubeChannelDetailsByApi(snippet.channelId);
    }

    const viewCount = statistics ? parseInt(statistics.viewCount) || 0 : 0;
    const likeCount = statistics ? parseInt(statistics.likeCount) || 0 : 0;
    const popularityScoreValue = calculatePopularityScore(
      viewCount,
      likeCount,
      snippet.publishedAt, // Video's publishedAt for score calculation
    );

    const videoInfo: YouTubeVideoItem = {
      id: videoItem.id,
      title: decodeHtmlEntities(snippet.title),
      description: decodeHtmlEntities(snippet.description),
      thumbnailUrl: selectedThumbnailUrl,
      publishedAt: snippet.publishedAt, // Video's publishedAt
      viewCount: viewCount,
      likeCount: likeCount,
      channel: channelData ?? undefined,
      popularityScore:
        popularityScoreValue === null ? undefined : popularityScoreValue,
    };
    return { success: true, data: videoInfo };
  } catch (error) {
    console.error("Failed to fetch from YouTube API (Video Info):", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unexpected error.",
    };
  }
}

export async function searchYouTubeVideos(
  query: string,
  maxResults: number = 10,
): Promise<YouTubeSearchResponse> {
  if (!YOUTUBE_API_KEY) {
    console.error("YouTube API key is not configured.");
    return { success: false, error: "YouTube API key not configured." };
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
  const fetchUrl = `${YOUTUBE_API_BASE_URL}/search?${params.toString()}`;

  try {
    const response = await fetch(fetchUrl);
    const data = await response.json();

    if (!response.ok) {
      const errorMessage =
        data.error?.message || "Unknown API error during search.";
      const isQuotaError = data.error?.errors?.some(
        (e: YouTubeApiError) => e.reason === "quotaExceeded", // Ensure YouTubeApiError is defined
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

    const videoPromises = data.items.map(
      async (item: YouTubeSearchApiResultItem) => {
        // Corrected type here
        if (item.id?.videoId) {
          const fullVideoInfo = await getYouTubeVideoInfo(item.id.videoId);
          if (fullVideoInfo.success && fullVideoInfo.data) {
            return fullVideoInfo.data;
          }
        }
        console.warn(
          `Could not retrieve full info for search result item: ${item.id?.videoId}`,
        );
        return null;
      },
    );

    const videosWithDetails = (await Promise.all(videoPromises)).filter(
      (video): video is YouTubeVideoItem => video !== null, // Ensure YouTubeVideoItem is defined
    );
    return { success: true, data: videosWithDetails };
  } catch (error) {
    console.error("Failed to fetch from YouTube API (Search):", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unexpected error.",
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
        return {
          success: true,
          transcript: decodeHtmlEntities(rawTranscriptText),
        };
      } else {
        return { success: false, error: "No transcript found or it is empty." };
      }
    } catch (error) {
      lastError = error;
      retries--;
      console.warn(
        `Transcript fetch attempt for ${videoId} failed. Retries left: ${retries}`,
        error,
      );
      if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } else {
        break;
      }
    }
  }
  console.error(
    `All transcript fetch attempts for ${videoId} failed. Last error:`,
    lastError,
  );
  let errorMessage = "Failed to fetch transcript after multiple attempts.";
  if (lastError instanceof Error) {
    if (lastError.message.includes("disabled transcripts"))
      errorMessage = "Transcripts are disabled for this video.";
    else if (lastError.message.includes("no transcripts are available"))
      errorMessage = "No transcripts available.";
    else errorMessage = `Failed to fetch transcript: ${lastError.message}`;
  }
  return { success: false, error: errorMessage };
}

// Interface for the status of a single video from our new function
export interface YouTubeVideoStatus {
  id: string;
  found: boolean;
  uploadStatus?: string;
  privacyStatus?: string;
  embeddable?: boolean;
  liveBroadcastContent?: string;
}

interface YouTubeApiVideoStatusObject {
  uploadStatus: string;
  privacyStatus: string;
  license: string;
  embeddable: boolean;
  publicStatsViewable: boolean;
  madeForKids?: boolean;
  selfDeclaredMadeForKids?: boolean;
  liveBroadcastContent?: string;
}

export async function getVideoPublicationStatuses(videoIds: string[]): Promise<{
  success: boolean;
  statuses?: YouTubeVideoStatus[];
  error?: string;
  quotaExceeded?: boolean;
}> {
  if (!YOUTUBE_API_KEY) {
    console.error("YouTube API key is not configured.");
    return { success: false, error: "YouTube API key not configured." };
  }
  if (!videoIds || videoIds.length === 0) {
    return { success: true, statuses: [] };
  }
  if (videoIds.length > 50) {
    console.warn(
      "getVideoPublicationStatuses called with >50 video IDs. API limit is 50.",
    );
    return {
      success: false,
      error: "Cannot fetch >50 video statuses at once. Implement batching.",
    };
  }

  const params = new URLSearchParams({
    key: YOUTUBE_API_KEY,
    id: videoIds.join(","),
    part: "status,id",
  });
  const fetchUrl = `${YOUTUBE_API_BASE_URL}/videos?${params.toString()}`;
  const results: YouTubeVideoStatus[] = [];

  try {
    const response = await fetch(fetchUrl);
    const data = await response.json();

    if (!response.ok) {
      console.error(
        "YouTube API Error (getVideoPublicationStatuses):",
        data.error?.message || data,
      );
      const errorMessage = data.error?.message || "Unknown API error.";
      const isQuotaError = data.error?.errors?.some(
        (e: YouTubeApiError) => e.reason === "quotaExceeded",
      );
      return {
        success: false,
        error: errorMessage,
        quotaExceeded: isQuotaError,
      };
    }

    const statusMap = new Map<string, YouTubeApiVideoStatusObject>();
    if (data.items && Array.isArray(data.items)) {
      for (const item of data.items) {
        if (item && typeof item.id === "string" && item.status) {
          statusMap.set(item.id, item.status as YouTubeApiVideoStatusObject);
        }
      }
    }

    for (const reqId of videoIds) {
      const statusDetail = statusMap.get(reqId);
      if (statusDetail) {
        results.push({
          id: reqId,
          found: true,
          uploadStatus: statusDetail.uploadStatus,
          privacyStatus: statusDetail.privacyStatus,
          embeddable: statusDetail.embeddable,
          liveBroadcastContent: statusDetail.liveBroadcastContent,
        });
      } else {
        results.push({ id: reqId, found: false });
      }
    }
    return { success: true, statuses: results };
  } catch (error) {
    console.error("Failed to fetch video statuses from YouTube API:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unexpected error.",
    };
  }
}
