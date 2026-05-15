"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileCode,
  Camera,
  X,
} from "lucide-react";
import { VideoPlayer } from "@/components/posts/VideoPlayer";
import type { MediaFile } from "@/lib/types";
import { useI18n } from "@/lib/i18n";

interface MediaViewerProps {
  mediaFiles: MediaFile[];
  mhtmlPath?: string | null;
  screenshotPath?: string | null;
}

export function MediaViewer({
  mediaFiles,
  mhtmlPath,
  screenshotPath,
}: MediaViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const { t } = useI18n();

  const images = mediaFiles.filter(
    (f) => f.mime_type?.startsWith("image/") || f.media_type === "image"
  );
  const videos = mediaFiles.filter(
    (f) => f.mime_type?.startsWith("video/") || f.media_type === "video"
  );

  const currentImage = images[currentIndex] ?? null;

  const prevImage = () =>
    setCurrentIndex((i) => (i > 0 ? i - 1 : images.length - 1));
  const nextImage = () =>
    setCurrentIndex((i) => (i < images.length - 1 ? i + 1 : 0));

  const fileUrl = (path: string | null) =>
    path ? `/api/files/${path}` : null;

  return (
    <div className="space-y-6">
      {/* Image Carousel */}
      {images.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-2">{t("images")}</h3>
          <div className="relative bg-slate-100 rounded-lg overflow-hidden">
            {currentImage && (
              <img
                src={fileUrl(currentImage.file_path) ?? currentImage.original_url}
                alt=""
                className="w-full object-contain max-h-96 cursor-pointer"
                onClick={() => setLightboxOpen(true)}
              />
            )}
            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70 transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70 transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentIndex(idx)}
                      className={`h-2 w-2 rounded-full transition-colors ${
                        idx === currentIndex ? "bg-white" : "bg-white/50"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Videos */}
      {videos.map((video) => (
        <div key={video.id}>
          <h3 className="text-sm font-semibold text-slate-700 mb-2">{t("video")}</h3>
          <VideoPlayer
            src={fileUrl(video.file_path) ?? video.original_url}
            poster={
              fileUrl(video.file_path) ?? undefined
            }
          />
        </div>
      ))}

      {/* Download buttons */}
      <div className="flex flex-wrap gap-2">
        {mhtmlPath && (
          <a
            href={fileUrl(mhtmlPath) ?? "#"}
            download
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <FileCode size={14} />
            {t("mhtmlArchive")}
          </a>
        )}
        {screenshotPath && (
          <a
            href={fileUrl(screenshotPath) ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Camera size={14} />
            {t("screenshot")}
          </a>
        )}
        {mediaFiles.map((f) =>
          f.file_path ? (
            <a
              key={f.id}
              href={fileUrl(f.file_path) ?? "#"}
              download
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Download size={14} />
              {f.media_type}
            </a>
          ) : null
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && currentImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-slate-300"
            onClick={() => setLightboxOpen(false)}
          >
            <X size={24} />
          </button>
          <img
            src={
              fileUrl(currentImage.file_path) ?? currentImage.original_url
            }
            alt=""
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
