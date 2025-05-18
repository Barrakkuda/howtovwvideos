"use server";

import { prisma } from "@/lib/db";
import { VideoPlatform, VideoStatus } from "@generated/prisma";
import { getVideoPublicationStatuses } from "./youtube/youtubeService";

export interface VideoCheckResultItem {
  dbVideoId: number;
  youtubeVideoId: string;
  title: string;
  oldStatus: VideoStatus;
  newStatus?: VideoStatus;
  isValid: boolean;
  reason?: string;
  error?: string;
}

export interface OverallCheckSummary {
  totalChecked: number;
  totalFoundInvalid: number;
  totalApiErrors: number;
  details: VideoCheckResultItem[];
  serviceError?: string;
}

const YOUTUBE_ID_BATCH_SIZE = 50;

export async function checkPublishedVideoStatuses(): Promise<OverallCheckSummary> {
  const summary: OverallCheckSummary = {
    totalChecked: 0,
    totalFoundInvalid: 0,
    totalApiErrors: 0,
    details: [],
  };

  try {
    const videosInDb = await prisma.video.findMany({
      where: {
        status: VideoStatus.PUBLISHED,
        platform: VideoPlatform.YOUTUBE,
      },
      select: {
        id: true,
        videoId: true,
        title: true,
        status: true,
      },
    });

    if (videosInDb.length === 0) {
      summary.serviceError = "No published YouTube videos found to check.";
      return summary;
    }

    summary.totalChecked = videosInDb.length;
    const dbVideoMap = new Map(videosInDb.map((v) => [v.videoId, v]));

    for (let i = 0; i < videosInDb.length; i += YOUTUBE_ID_BATCH_SIZE) {
      const batchDbVideos = videosInDb.slice(i, i + YOUTUBE_ID_BATCH_SIZE);
      const batchVideoIds = batchDbVideos.map((v) => v.videoId);

      const apiResponse = await getVideoPublicationStatuses(batchVideoIds);

      if (!apiResponse.success || !apiResponse.statuses) {
        summary.totalApiErrors++;
        // Log this error for the whole batch
        const errorMessage = `API error for batch starting with ${batchVideoIds[0]}: ${apiResponse.error || "Unknown API error"}`;
        console.error(errorMessage);
        // Add a detail item for this batch failure or handle as needed
        summary.details.push({
          dbVideoId: 0, // Placeholder
          youtubeVideoId: `Batch starting with ${batchVideoIds[0]}`,
          title: "API Batch Failed",
          oldStatus: VideoStatus.PUBLISHED, // Assuming all were published
          isValid: false,
          reason: "API call failed for this batch.",
          error: apiResponse.error || "Unknown API error",
        });
        if (apiResponse.quotaExceeded) {
          summary.serviceError =
            "YouTube API quota exceeded. Aborting further checks.";
          return summary; // Stop if quota is hit
        }
        continue; // Move to next batch or handle error differently
      }

      for (const apiStatus of apiResponse.statuses) {
        const dbVideo = dbVideoMap.get(apiStatus.id);
        if (!dbVideo) {
          // Should not happen if videosInDb was the source
          console.warn(
            `Video ID ${apiStatus.id} from API not found in DB map.`,
          );
          continue;
        }

        let isValid = true;
        let reason = "Video is public and processed.";
        let newDbStatus: VideoStatus | undefined = undefined;

        if (!apiStatus.found) {
          isValid = false;
          reason = "Video not found on YouTube.";
          newDbStatus = VideoStatus.UNAVAILABLE;
        } else if (apiStatus.privacyStatus !== "public") {
          isValid = false;
          reason = `Video is not public (privacy: ${apiStatus.privacyStatus}).`;
          newDbStatus = VideoStatus.UNAVAILABLE;
        } else if (apiStatus.uploadStatus !== "processed") {
          isValid = false;
          reason = `Video upload status is not 'processed' (status: ${apiStatus.uploadStatus}).`;
          newDbStatus = VideoStatus.UNAVAILABLE;
        }
        // Add more checks if needed (e.g., apiStatus.embeddable === false)

        const resultItem: VideoCheckResultItem = {
          dbVideoId: dbVideo.id,
          youtubeVideoId: dbVideo.videoId,
          title: dbVideo.title,
          oldStatus: dbVideo.status,
          isValid: isValid,
          reason: reason,
        };

        if (!isValid && newDbStatus) {
          summary.totalFoundInvalid++;
          try {
            await prisma.video.update({
              where: { id: dbVideo.id },
              data: {
                status: newDbStatus,
                processingError: reason, // Log the reason
                updatedAt: new Date(), // Explicitly set updatedAt
              },
            });
            resultItem.newStatus = newDbStatus;
          } catch (dbError) {
            console.error(
              `Failed to update DB for video ${dbVideo.videoId}:`,
              dbError,
            );
            resultItem.error =
              dbError instanceof Error ? dbError.message : "DB update failed.";
            // Potentially revert isValid or handle this case
          }
        }
        summary.details.push(resultItem);
      }
    }
  } catch (error) {
    console.error("Error in checkPublishedVideoStatuses service:", error);
    summary.serviceError =
      error instanceof Error ? error.message : "Unknown service error.";
  }
  return summary;
}
