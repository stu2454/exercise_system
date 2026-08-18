const VIDEO_EXTENSIONS = [".mov", ".mp4"] as const;

export function referenceVideoPath(filename: string | null | undefined): string | null {
  const trimmed = filename?.trim();
  if (!trimmed || trimmed.includes("/") || trimmed.includes("\\")) return null;
  const lower = trimmed.toLowerCase();
  if (!VIDEO_EXTENSIONS.some((extension) => lower.endsWith(extension))) return null;
  return `/videos/${encodeURIComponent(trimmed)}`;
}

export function referenceVideoFilename(path: string | null | undefined): string | null {
  if (!path?.startsWith("/videos/")) return null;
  const encodedFilename = path.slice("/videos/".length);
  if (!encodedFilename || encodedFilename.includes("/")) return null;
  try {
    const filename = decodeURIComponent(encodedFilename);
    return referenceVideoPath(filename) === path ? filename : null;
  } catch {
    return null;
  }
}

export function referenceVideoMimeType(path: string): string | null {
  const lower = path.toLowerCase();
  if (lower.endsWith(".mov")) return "video/quicktime";
  if (lower.endsWith(".mp4")) return "video/mp4";
  return null;
}
