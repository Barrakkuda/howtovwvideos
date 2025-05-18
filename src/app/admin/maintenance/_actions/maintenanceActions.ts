"use server";

import {
  checkPublishedVideoStatuses,
  OverallCheckSummary,
} from "@/lib/services/videoMaintenanceService";
import { revalidatePath } from "next/cache";

export interface TriggerVideoStatusCheckResponse {
  success: boolean;
  message: string;
  summary?: OverallCheckSummary;
  error?: string;
}

export async function triggerVideoStatusCheck(): Promise<TriggerVideoStatusCheckResponse> {
  console.log("Server Action: triggerVideoStatusCheck invoked.");
  try {
    const summary = await checkPublishedVideoStatuses();
    console.log(
      "Server Action: checkPublishedVideoStatuses completed.",
      summary,
    );

    if (summary.totalFoundInvalid > 0 || summary.totalApiErrors > 0) {
      revalidatePath("/admin/videos");
      revalidatePath("/admin/dashboard");
      revalidatePath("/");
    }

    return {
      success: true,
      message: `Video status check completed. Checked: ${summary.totalChecked}, Invalid: ${summary.totalFoundInvalid}.`,
      summary,
    };
  } catch (error) {
    console.error("Error in triggerVideoStatusCheck server action:", error);
    return {
      success: false,
      message: "Failed to run video status check due to a server action error.",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
