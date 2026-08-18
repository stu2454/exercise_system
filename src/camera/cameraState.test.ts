import { describe, expect, it } from "vitest";
import {
  cameraStateReducer,
  getCameraErrorMessage,
  initialCameraState,
} from "./cameraState";

describe("cameraStateReducer", () => {
  it("moves through requesting, active, and stopped states", () => {
    const requesting = cameraStateReducer(initialCameraState, { type: "request" });
    const active = cameraStateReducer(requesting, { type: "started" });
    const stopped = cameraStateReducer(active, { type: "stopped" });

    expect(requesting.status).toBe("requesting");
    expect(active.status).toBe("active");
    expect(stopped).toEqual({
      status: "stopped",
      message: "Camera has been stopped.",
    });
  });

  it("retains a useful failure message", () => {
    expect(
      cameraStateReducer(initialCameraState, {
        type: "failed",
        message: "A specific camera error.",
      }),
    ).toEqual({ status: "error", message: "A specific camera error." });
  });
});

describe("getCameraErrorMessage", () => {
  it("explains denied permission", () => {
    const message = getCameraErrorMessage(
      new DOMException("Permission denied", "NotAllowedError"),
    );

    expect(message).toContain("permission was denied");
  });

  it("provides a safe fallback for unknown errors", () => {
    expect(getCameraErrorMessage(new Error("Unknown"))).toContain(
      "could not be started",
    );
  });
});
