import { describe, expect, it, vi } from "vitest";
import { enterParticipantFullscreen, exitParticipantFullscreen } from "./fullscreen";

describe("participant fullscreen", () => {
  it("enters fullscreen when supported", async () => {
    const requestFullscreen = vi.fn().mockResolvedValue(undefined);
    await expect(enterParticipantFullscreen({ requestFullscreen })).resolves.toEqual({
      succeeded: true,
      message: null,
    });
  });

  it("continues participant mode when fullscreen is unavailable or denied", async () => {
    await expect(enterParticipantFullscreen({})).resolves.toMatchObject({ succeeded: false });
    await expect(enterParticipantFullscreen({ requestFullscreen: vi.fn().mockRejectedValue(new Error("Denied")) }))
      .resolves.toMatchObject({ succeeded: false });
  });

  it("does not throw when exiting fullscreen fails", async () => {
    await expect(exitParticipantFullscreen({ exitFullscreen: vi.fn().mockRejectedValue(new Error("Denied")) }))
      .resolves.toBeUndefined();
  });
});
