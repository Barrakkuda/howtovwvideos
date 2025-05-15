"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  triggerVideoStatusCheck,
  TriggerVideoStatusCheckResponse,
} from "./_actions/maintenanceActions";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

export default function AdminMaintenancePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] =
    useState<TriggerVideoStatusCheckResponse | null>(null);

  const handleCheckVideos = async () => {
    setIsLoading(true);
    setResults(null);
    const toastId = toast.loading("Starting video status check...");
    try {
      const response = await triggerVideoStatusCheck();
      setResults(response);
      if (response.success) {
        toast.success(response.message, { id: toastId });
      } else {
        toast.error(response.message || "Video status check failed.", {
          id: toastId,
        });
        if (response.error) {
          console.error("Detailed error:", response.error);
        }
      }
    } catch (error) {
      console.error("Client-side error triggering video check:", error);
      toast.error("An unexpected error occurred on the client.", {
        id: toastId,
      });
      setResults({
        success: false,
        message: "Client-side error. Check console for details.",
      });
    }
    setIsLoading(false);
  };

  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Site Maintenance</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>YouTube Video Status Check</CardTitle>
          <CardDescription>
            Verify that all published YouTube videos are still accessible and
            public. Invalid videos will have their status updated in the
            database (e.g., to ARCHIVED).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleCheckVideos} disabled={isLoading}>
            {isLoading
              ? "Checking Videos..."
              : "Start YouTube Video Status Check"}
          </Button>
        </CardContent>
        {results && (
          <CardFooter className="flex flex-col items-start gap-4 pt-4 border-t">
            <h3 className="text-lg font-semibold">
              Results: {results.success ? "Completed" : "Failed"}
            </h3>
            <p className="text-sm text-muted-foreground">{results.message}</p>
            {results.summary && (
              <div className="text-sm w-full">
                <p>Total Videos Checked: {results.summary.totalChecked}</p>
                <p>
                  Total Found Invalid/Updated:{" "}
                  {results.summary.totalFoundInvalid}
                </p>
                <p>Total API Errors: {results.summary.totalApiErrors}</p>
                {results.summary.serviceError && (
                  <p className="text-red-500">
                    Service Error: {results.summary.serviceError}
                  </p>
                )}
                {results.summary.details &&
                  results.summary.details.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Details:</h4>
                      <ul className="list-disc pl-5 space-y-1 max-h-96 overflow-y-auto">
                        {results.summary.details.map((item, index) => (
                          <li
                            key={item.youtubeVideoId + index}
                            className={`text-xs ${!item.isValid ? (item.newStatus ? "text-orange-600" : "text-red-600") : "text-green-600"}`}
                          >
                            <strong>{item.title.substring(0, 50)}...</strong>{" "}
                            (YT ID: {item.youtubeVideoId})
                            {item.isValid
                              ? " is still valid."
                              : ` was invalid (Reason: ${item.reason}).`}
                            {item.newStatus &&
                              ` Status changed to ${item.newStatus}.`}
                            {item.error && (
                              <span className="text-red-700">
                                {" "}
                                Processing Error: {item.error}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
            )}
            {results.error && (
              <p className="text-red-500">
                Server Action Error: {results.error}
              </p>
            )}
          </CardFooter>
        )}
      </Card>

      {/* Add more maintenance tasks here as cards if needed */}
    </>
  );
}
