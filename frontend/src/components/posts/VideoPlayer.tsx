"use client";

import { useRef, useState, useEffect } from "react";

interface VideoPlayerProps {
  src: string;
  poster?: string;
}

const SPEEDS = [0.5, 1, 1.5, 2];

export function VideoPlayer({ src, poster }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [speed, setSpeed] = useState(1);
  const [isVertical, setIsVertical] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleMetadata = () => {
      if (video.videoWidth && video.videoHeight) {
        setIsVertical(video.videoHeight > video.videoWidth);
      }
    };

    video.addEventListener("loadedmetadata", handleMetadata);
    return () => video.removeEventListener("loadedmetadata", handleMetadata);
  }, [src]);

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    if (videoRef.current) {
      videoRef.current.playbackRate = newSpeed;
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-full ${
          isVertical ? "max-w-sm mx-auto" : ""
        } bg-black rounded-lg overflow-hidden`}
        style={isVertical ? { aspectRatio: "9/16" } : { aspectRatio: "16/9" }}
      >
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          controls
          className="h-full w-full object-contain"
          preload="metadata"
        />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs font-medium text-slate-500">Speed:</span>
        {SPEEDS.map((s) => (
          <button
            key={s}
            onClick={() => handleSpeedChange(s)}
            className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
              speed === s
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
}
