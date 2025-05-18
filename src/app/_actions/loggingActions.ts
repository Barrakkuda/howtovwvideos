"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/db";

/**
 * Anonymizes an IPv4 address by returning only the first three octets.
 * e.g., "123.45.67.89" becomes "123.45.67.0"
 * Returns null if the IP is not a valid IPv4 address or is undefined.
 */
function anonymizeIp(ip: string | undefined | null): string | null {
  if (!ip) return null;

  // Handle IPv6 loopback specifically for local development
  if (ip === "::1") {
    return "localhost";
  }

  const parts = ip.split(".");
  if (
    parts.length === 4 &&
    parts.every((part) => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    })
  ) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
  }
  return null; // Not a standard IPv4 address
}

/**
 * Logs a search term, anonymized IP address, and results count to the database.
 * This function is designed to fail silently from the client's perspective if logging fails,
 * logging errors to the server console instead.
 */
export async function logSearch(
  term: string,
  resultsCount: number,
): Promise<void> {
  if (!term || term.trim() === "") {
    console.warn("logSearch: Attempted to log an empty search term.");
    return;
  }

  try {
    const headerList = await headers();
    // x-forwarded-for can contain multiple IPs (client, proxy1, proxy2). The first one is usually the client.
    const forwardedFor = headerList.get("x-forwarded-for");
    const remoteAddr = headerList.get("remote-addr"); // Also get remote-addr for logging

    const ipAddress = forwardedFor
      ? forwardedFor.split(",")[0].trim()
      : remoteAddr; // Use remoteAddr if forwardedFor is not available

    const partialIp = anonymizeIp(ipAddress);

    await prisma.searchLog.create({
      data: {
        term: term.trim(),
        partialIpAddress: partialIp,
        resultsCount: resultsCount,
      },
    });
    // console.log(`Search logged: ${term.trim()}, IP (partial): ${partialIp}, Results: ${resultsCount}`); // Optional: for server-side log confirmation
  } catch (error) {
    console.error("Error logging search term:", error);
    // Do not re-throw, as logging failure should not block user search functionality
  }
}

export interface SearchLogForTable {
  id: number;
  term: string;
  partialIpAddress: string | null;
  resultsCount: number;
  createdAt: Date;
}

export interface FetchSearchLogsResponse {
  success: boolean;
  data?: SearchLogForTable[];
  totalPages?: number;
  totalCount?: number;
  error?: string;
}

export async function fetchSearchLogs({
  page = 1,
  pageSize = 20,
  sortBy = "createdAt",
  sortDirection = "desc",
}: {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
} = {}): Promise<FetchSearchLogsResponse> {
  try {
    const skip = (page - 1) * pageSize;
    const totalCount = await prisma.searchLog.count();

    // Basic validation for sortBy to prevent arbitrary field injection if necessary,
    // though Prisma itself will error on invalid field names.
    // For now, we assume sortBy will be a valid field of SearchLog.
    const orderByObject: { [key: string]: "asc" | "desc" } = {};
    if (sortBy && (sortDirection === "asc" || sortDirection === "desc")) {
      orderByObject[sortBy] = sortDirection;
    } else {
      // Fallback to default sort if params are invalid/missing
      orderByObject["createdAt"] = "desc";
    }

    const logs = await prisma.searchLog.findMany({
      orderBy: orderByObject,
      skip: skip,
      take: pageSize,
    });

    return {
      success: true,
      data: logs.map((log) => ({
        ...log,
        partialIpAddress:
          log.partialIpAddress === null ? "N/A" : log.partialIpAddress,
      })),
      totalPages: Math.ceil(totalCount / pageSize),
      totalCount,
    };
  } catch (error) {
    console.error("Error fetching search logs:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unknown error occurred while fetching search logs.",
    };
  }
}
