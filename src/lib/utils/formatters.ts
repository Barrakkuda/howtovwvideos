import { VideoStatus } from "@generated/prisma";

export const formatVideoStatus = (status: VideoStatus): string => {
  switch (status) {
    case VideoStatus.DRAFT:
      return "Draft";
    case VideoStatus.PUBLISHED:
      return "Published";
    case VideoStatus.ARCHIVED:
      return "Archived";
    case VideoStatus.REJECTED:
      return "Rejected";
    case VideoStatus.UNAVAILABLE:
      return "Unavailable";
    default:
      // Optional: Handle unexpected status, though Prisma types should prevent this.
      // const _exhaustiveCheck: never = status;
      // console.warn(`Unknown VideoStatus encountered: ${_exhaustiveCheck}`);
      return String(status); // Fallback to the raw enum key
  }
};

export function formatDate(date: Date | string | number): string {
  try {
    const d = new Date(date);
    // Example format: Jan 1, 2023, 5:30 PM
    // You can customize this using toLocaleDateString, toLocaleTimeString, or a library like date-fns
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch (error) {
    console.error("Error formatting date:", date, error);
    return "Invalid Date";
  }
}

// You can add other formatting functions here in the future, e.g.:
// export const formatVWType = (type: VWType): string => { ... };
