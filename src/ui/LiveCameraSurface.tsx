import type { RefObject } from "react";

interface LiveCameraSurfaceProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  active: boolean;
  label?: string;
  className?: string;
}

export function LiveCameraSurface({ videoRef, canvasRef, active, label = "Live participant camera", className = "" }: LiveCameraSurfaceProps) {
  return (
    <div className={`camera-preview participant-camera-surface ${active ? "camera-preview--active" : ""} ${className}`.trim()}>
      <video ref={videoRef} autoPlay muted playsInline aria-label={label} />
      <canvas ref={canvasRef} className="pose-overlay" aria-hidden="true" />
      {!active && <div className="camera-placeholder"><span>Participant camera</span><small>Start the camera to continue</small></div>}
    </div>
  );
}
