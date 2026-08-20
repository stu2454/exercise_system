import { createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { PoseQuality } from "../pose/types";
import { ClientDemoOnboarding } from "./ClientDemoOnboarding";

const QUALITY: PoseQuality = { level: "insufficient", personPresent: false, fullBodyVisible: false, missingRequiredLandmarks: [], warnings: [] };

function render(stage: Parameters<typeof ClientDemoOnboarding>[0]["stage"], overrides: Partial<Parameters<typeof ClientDemoOnboarding>[0]> = {}) {
  return renderToStaticMarkup(<ClientDemoOnboarding
    stage={stage}
    cameraState={{ status: "idle", message: "Camera is off." }}
    poseStatus="idle"
    poseFrame={null}
    poseQuality={QUALITY}
    videoRef={createRef<HTMLVideoElement>()}
    canvasRef={createRef<HTMLCanvasElement>()}
    onNext={() => undefined}
    onEnableCamera={() => undefined}
    onStartProgramme={() => undefined}
    onCameraSurfaceReady={() => undefined}
    {...overrides}
  />);
}

describe("Client Demo onboarding UI", () => {
  it("opens on Welcome without requesting the camera", () => {
    const requestCamera = vi.fn();
    const html = render("welcome", { onEnableCamera: requestCamera });
    expect(html).toContain("Exercise Programme Demo");
    expect(html).toContain("GET STARTED");
    expect(html).not.toContain("ENABLE CAMERA");
    expect(requestCamera).not.toHaveBeenCalled();
  });

  it("explains camera use before exposing the permission action", () => {
    const html = render("camera-setup");
    expect(html).toContain("Camera Setup");
    expect(html).toContain("ENABLE CAMERA");
  });

  it("shows participant-facing camera recovery copy", () => {
    const html = render("camera-setup", { cameraState: { status: "error", message: "Camera permission was denied. Allow camera access in your browser settings and try again." } });
    expect(html).toContain("Camera Access Needed");
    expect(html).toContain("TRY AGAIN");
    expect(html).not.toContain("NotAllowedError");
  });

  it("always offers positioning and tutorial fallback controls", () => {
    expect(render("positioning")).toContain("CONTINUE ANYWAY");
    for (const stage of ["tutorial-stand", "tutorial-arms", "tutorial-step"] as const) {
      expect(render(stage)).toContain("CONTINUE ANYWAY");
    }
  });

  it("presents exactly the three tutorial movements in order", () => {
    expect(render("tutorial-stand")).toContain("1 of 3 — Stand in the Centre");
    expect(render("tutorial-arms")).toContain("2 of 3 — Raise Your Arms");
    expect(render("tutorial-step")).toContain("3 of 3 — Step to the Side");
  });

  it("reserves START PROGRAMME for the Ready screen", () => {
    expect(render("tutorial-step")).not.toContain("START PROGRAMME");
    expect(render("ready")).toContain("START PROGRAMME");
  });

  it("uses concise distance-readable instruction copy", () => {
    expect(render("positioning")).toContain("Step back until your whole body is visible.");
    expect(render("ready")).toContain("Nine exercises. Follow each video");
    expect(render("prepare-space")).toContain("Stable device");
    expect(render("prepare-space")).toContain("Clear the area");
  });
});
