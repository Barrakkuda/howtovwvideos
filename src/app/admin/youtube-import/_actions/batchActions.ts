"use server";

import {
  batchImportVideos,
  BatchImportOptions,
  BatchImportResult,
} from "@/lib/services/batch/batchService";

export async function importVideosBatch(
  options: BatchImportOptions,
): Promise<BatchImportResult[]> {
  return batchImportVideos(options);
}
