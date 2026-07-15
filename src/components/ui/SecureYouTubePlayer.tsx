'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Maximize, Minimize, X } from 'lucide-react';

interface SecureYouTubePlayerProps {
  videoUrl: string;
  title?: string;
  onClose?: () => void;
}

/**
 * Xavfsiz YouTube player - youtube-nocookie.com orqali
 * Native YouTube controls bilan ishlaydi (modestbranding)
 * Reklama va boshqa video takliflari minimallashtirilgan
 */
export default function SecureYouTubePlayer({ videoUrl, title, onClose }: SecureYouTubePlayerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Extract YouTube video ID from various URL formats
  const getVideoId = (url: string): string | null => {
    if (!url) return null;
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /youtube-nocookie\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const videoId = getVideoId(videoUrl);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (!videoId) {
    return (
      <div className="p-4 text-center text-text-secondary bg-gray-50 rounded-xl">
        Video URL noto&apos;g&apos;ri formatda
      </div>
    );
  }

  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?modestbranding=1&rel=0&controls=1&showinfo=0&iv_load_policy=3&cc_load_policy=0`;

  return (
    <div
      ref={containerRef}
      className={`relative bg-black rounded-xl overflow-hidden ${isFullscreen ? 'w-screen h-screen' : 'w-full aspect-video'}`}
    >
      {/* Title bar */}
      {title && (
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-3">
          <div className="flex items-center justify-between">
            <span className="text-white text-sm font-medium truncate">{title}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleFullscreen}
                className="p-1 rounded-full hover:bg-white/20 transition-colors"
                title="Kattalashtirish"
              >
                {isFullscreen ? (
                  <Minimize size={18} className="text-white" />
                ) : (
                  <Maximize size={18} className="text-white" />
                )}
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-1 rounded-full hover:bg-white/20 transition-colors"
                >
                  <X size={18} className="text-white" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Title bar without title - just controls */}
      {!title && onClose && (
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-3">
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={toggleFullscreen}
              className="p-1 rounded-full hover:bg-white/20 transition-colors"
              title="Kattalashtirish"
            >
              {isFullscreen ? (
                <Minimize size={18} className="text-white" />
              ) : (
                <Maximize size={18} className="text-white" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-white/20 transition-colors"
            >
              <X size={18} className="text-white" />
            </button>
          </div>
        </div>
      )}

      {/* YouTube iframe with native controls */}
      <iframe
        src={embedUrl}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
