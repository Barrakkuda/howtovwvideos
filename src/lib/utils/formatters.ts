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
      return String(status);
  }
};

export function formatDate(date: Date | string | number): string {
  try {
    const d = new Date(date);
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

export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return "0";

  const absNum = Math.abs(num);
  if (absNum >= 1e9) {
    return (num / 1e9).toFixed(1) + "B";
  }
  if (absNum >= 1e6) {
    return (num / 1e6).toFixed(1) + "M";
  }
  if (absNum >= 1e3) {
    return (num / 1e3).toFixed(1) + "K";
  }
  return num.toString();
}
