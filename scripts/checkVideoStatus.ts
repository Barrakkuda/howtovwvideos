#!/usr/bin/env node
// To make this script executable, run: chmod +x scripts/checkVideoStatus.ts
// To run with path aliases (e.g., @/lib/db), you might need tsx or ts-node with tsconfig-paths:
// Example: npx tsx --tsconfig tsconfig.json scripts/checkVideoStatus.ts

// PrismaClient import removed as the service uses the shared instance from @/lib/db

import { checkPublishedVideoStatuses } from "../src/lib/services/videoMaintenanceService"; // Adjust path as needed

async function main() {
  const startTime = new Date();
  console.log(
    `[${startTime.toISOString()}] Starting video status check script...`,
  );

  try {
    // The checkPublishedVideoStatuses function uses the prisma client from @/lib/db,
    // so direct prisma instantiation might not be needed here if run in an env that resolves aliases.
    const summary = await checkPublishedVideoStatuses();

    const endTime = new Date();
    const duration = (endTime.getTime() - startTime.getTime()) / 1000;
    console.log(
      `[${endTime.toISOString()}] Video status check completed in ${duration.toFixed(2)}s.`,
    );

    if (summary.serviceError) {
      console.error(`Service Error: ${summary.serviceError}`);
    }
    console.log(`  Total videos processed in DB: ${summary.totalChecked}`);
    console.log(`  Total API errors during check: ${summary.totalApiErrors}`);
    console.log(
      `  Total videos found invalid and updated: ${summary.totalFoundInvalid}`,
    );

    if (summary.details.length > 0) {
      console.log("\nDetails of checked videos:");
      summary.details.forEach((item) => {
        let detailMsg = `  - YT ID: ${item.youtubeVideoId}, DB ID: ${item.dbVideoId}, Title: "${item.title.substring(0, 30)}..." (Old Status: ${item.oldStatus})`;
        if (!item.isValid) {
          detailMsg += ` -> INVALID (Reason: ${item.reason}). Status changed to ${item.newStatus}.`;
        }
        if (item.error) {
          detailMsg += ` | Processing Error: ${item.error}`;
        }
        console.log(detailMsg);
      });
    }
  } catch (error) {
    const endTime = new Date();
    console.error(
      `[${endTime.toISOString()}] Critical error running video status check script:`,
      error,
    );
    process.exitCode = 1; // Indicate failure
  } finally {
    // If you had instantiated Prisma locally in this script:
    // await prisma.$disconnect();
    console.log(`[${new Date().toISOString()}] Script finished.`);
  }
}

main();
