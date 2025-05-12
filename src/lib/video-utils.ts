export interface VideoPlatformInfo {
  platform: "youtube" | "vimeo" | "unknown";
  videoId: string | null;
}

export function getVideoPlatformInfo(
  url: string | null | undefined,
): VideoPlatformInfo {
  if (!url) {
    return { platform: "unknown", videoId: null };
  }

  const youtubeRegex =
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const vimeoRegex = /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(?:video\/)?(\d+)/;

  const youtubeMatch = url.match(youtubeRegex);
  if (youtubeMatch && youtubeMatch[1]) {
    return { platform: "youtube", videoId: youtubeMatch[1] };
  }

  const vimeoMatch = url.match(vimeoRegex);
  if (vimeoMatch && vimeoMatch[1]) {
    return { platform: "vimeo", videoId: vimeoMatch[1] };
  }

  return { platform: "unknown", videoId: null };
}
