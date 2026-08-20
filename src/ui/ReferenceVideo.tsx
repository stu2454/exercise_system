import { useEffect, useRef, useState } from "react";
import { referenceVideoFilename, referenceVideoMimeType } from "../exercise/videoAssets";
import { publicAssetUrl } from "../app/basePath";

interface ReferenceVideoProps {
  src?: string;
  title: string;
  active?: boolean;
  loop?: boolean;
  muted?: boolean;
  showControls?: boolean;
  participantFriendly?: boolean;
}

function mediaErrorMessage(error: MediaError | null): string {
  if (!error) return "The browser reported an unknown playback error.";
  const labels: Record<number, string> = {
    1: "playback was aborted",
    2: "a network error interrupted loading",
    3: "the video could not be decoded",
    4: "the video source or codec is not supported",
  };
  return `${labels[error.code] ?? "unknown media error"} (MediaError ${error.code}).`;
}

export function ReferenceVideo({
  src,
  title,
  active = false,
  loop = false,
  muted = false,
  showControls = true,
  participantFriendly = false,
}: ReferenceVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const filename = referenceVideoFilename(src);

  useEffect(() => {
    setError(null);
    if (!src || !filename) {
      setWarning(null);
      return;
    }
    const mimeType = referenceVideoMimeType(src);
    const support = mimeType ? videoRef.current?.canPlayType(mimeType) : "";
    setWarning(
      support === ""
        ? `${filename}: this browser reports no native ${mimeType ?? "video"} support. The file codec may not play.`
        : null,
    );
  }, [filename, src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!active) {
      video.pause();
      return;
    }
    void video.play().catch((playbackError: unknown) => {
      const detail = playbackError instanceof Error ? playbackError.message : "Playback was rejected.";
      setError(`${filename ?? "Reference video"}: ${detail}`);
    });
  }, [active, filename, src]);

  if (!src || !filename) {
    return <p className="video-message video-message--error">No valid reference video is configured.</p>;
  }

  return (
    <div className="reference-video">
      <video
        ref={videoRef}
        autoPlay={active}
        controls={showControls}
        loop={loop}
        muted={muted}
        playsInline
        preload="metadata"
        src={publicAssetUrl(src)}
        aria-label={`${title} reference demonstration`}
        onCanPlay={(event) => {
          setError(null);
          if (active) {
            void event.currentTarget.play().catch((playbackError: unknown) => {
              const detail = playbackError instanceof Error ? playbackError.message : "Playback was rejected.";
              setError(`${filename}: ${detail}`);
            });
          }
        }}
        onError={(event) => setError(`${filename}: ${mediaErrorMessage(event.currentTarget.error)}`)}
      >
        Your browser does not support native video playback.
      </video>
      {warning && <p className="video-message video-message--warning">{participantFriendly ? "This demonstration video may not be supported by your browser." : warning}</p>}
      {error && <p className="video-message video-message--error" role="alert">{participantFriendly ? "The demonstration video could not be played. You can continue with the exercise." : error}</p>}
    </div>
  );
}
