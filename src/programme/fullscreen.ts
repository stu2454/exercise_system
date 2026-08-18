export interface FullscreenTarget {
  requestFullscreen?: () => Promise<void>;
}

export interface FullscreenDocument {
  exitFullscreen?: () => Promise<void>;
}

export interface FullscreenResult {
  succeeded: boolean;
  message: string | null;
}

export async function enterParticipantFullscreen(
  target: FullscreenTarget,
): Promise<FullscreenResult> {
  if (!target.requestFullscreen) {
    return { succeeded: false, message: "Full screen is unavailable. Participant mode will continue here." };
  }
  try {
    await target.requestFullscreen();
    return { succeeded: true, message: null };
  } catch {
    return { succeeded: false, message: "Full screen was not permitted. Participant mode will continue here." };
  }
}

export async function exitParticipantFullscreen(
  fullscreenDocument: FullscreenDocument,
): Promise<void> {
  try {
    await fullscreenDocument.exitFullscreen?.();
  } catch {
    // Exiting participant mode must still work when the browser rejects this call.
  }
}
