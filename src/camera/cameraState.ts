export type CameraStatus =
  | "idle"
  | "requesting"
  | "active"
  | "stopped"
  | "error";

export interface CameraState {
  status: CameraStatus;
  message: string;
}

export type CameraAction =
  | { type: "request" }
  | { type: "started" }
  | { type: "stopped" }
  | { type: "failed"; message: string };

export const initialCameraState: CameraState = {
  status: "idle",
  message: "Camera is off.",
};

export function cameraStateReducer(
  state: CameraState,
  action: CameraAction,
): CameraState {
  switch (action.type) {
    case "request":
      return {
        status: "requesting",
        message: "Waiting for camera permission…",
      };
    case "started":
      return {
        status: "active",
        message: "Camera is on. Video stays in this browser and is not recorded.",
      };
    case "stopped":
      return {
        status: "stopped",
        message: "Camera has been stopped.",
      };
    case "failed":
      return { status: "error", message: action.message };
    default:
      return state;
  }
}

export function getCameraErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    switch (error.name) {
      case "NotAllowedError":
      case "SecurityError":
        return "Camera permission was denied. Allow camera access in your browser settings and try again.";
      case "NotFoundError":
      case "DevicesNotFoundError":
        return "No camera was found. Connect a camera and try again.";
      case "NotReadableError":
      case "TrackStartError":
        return "The camera could not be started. It may already be in use by another application.";
      case "OverconstrainedError":
      case "ConstraintNotSatisfiedError":
        return "The camera cannot provide the requested video settings.";
    }
  }

  return "The camera could not be started. Check browser permission and try again.";
}
