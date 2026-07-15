'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Play, Pause, Maximize, Minimize, SkipForward, SkipBack, X } from 'lucide-react';

interface SecureYouTubePlayerProps {
  videoUrl: string;
  title?: string;
  onClose?: () => void;
}

/**
 * Xavfsiz YouTube player - youtube-nocookie.com orqali
 * Faqat play/pause, 10s olga/orqaga va fullscreen
 * Reklama, boshqa video taklifi, YouTube ga o'tish yo'q
 * 
 * Agar YouTube IFrame API 3 soniyada yuklanmasa, 
 * native controls bilan fallback iframe ko'rsatiladi.
 */
export default function SecureYouTubePlayer({ videoUrl, title, onClose }: SecureYouTubePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [apiReady, setApiReady] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // YouTube IFrame API with fallback timeout
  useEffect(() => {
    if (!videoId) return;

    // If already in fallback mode, don't try API
    if (useFallback) return;

    let cancelled = false;

    const initPlayer = () => {
      if (cancelled) return;
      if ((window as any).YT && (window as any).YT.Player) {
        // Clear timeout since API loaded
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        try {
          playerRef.current = new (window as any).YT.Player(`yt-player-${videoId}`, {
            events: {
              onReady: () => {
                if (!cancelled) {
                  setApiReady(true);
                }
              },
              onStateChange: (event: any) => {
                if (!cancelled) {
                  setIsPlaying(event.data === 1);
                }
              },
            },
          });
        } catch (err) {
          console.warn('YouTube player init failed, using fallback:', err);
          if (!cancelled) {
            setUseFallback(true);
          }
        }
      }
    };

    // Set a 3-second timeout for API load
    timeoutRef.current = setTimeout(() => {
      if (!cancelled && !apiReady) {
        console.warn('YouTube IFrame API did not load in 3 seconds, using fallback');
        setUseFallback(true);
      }
    }, 3000);

    // Load YouTube IFrame API if not already loaded
    if (!(window as any).YT) {
      const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
      if (!existingScript) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      }

      // Set up the global callback
      const prevCallback = (window as any).onYouTubeIframeAPIReady;
      (window as any).onYouTubeIframeAPIReady = () => {
        if (prevCallback) prevCallback();
        // Give iframe time to render
        setTimeout(initPlayer, 300);
      };
    } else if ((window as any).YT.Player) {
      // API already loaded, wait for iframe to render then init
      setTimeout(initPlayer, 300);
    }

    return () => {
      cancelled = true;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (playerRef.current?.destroy) {
        try {
          playerRef.current.destroy();
        } catch {
          // Ignore destroy errors
        }
      }
    };
  }, [videoId, useFallback]);

  const togglePlay = useCallback(() => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  }, [isPlaying]);

  const seekForward = useCallback(() => {
    if (!playerRef.current) return;
    const currentTime = playerRef.current.getCurrentTime();
    playerRef.current.seekTo(currentTime + 10, true);
  }, []);

  const seekBackward = useCallback(() => {
    if (!playerRef.current) return;
    const currentTime = playerRef.current.getCurrentTime();
    playerRef.current.seekTo(Math.max(0, currentTime - 10), true);
  }, []);

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

  // Fallback mode: show iframe with native YouTube controls
  if (useFallback) {
    const fallbackUrl = `https://www.youtube-nocookie.com/embed/${videoId}?modestbranding=1&rel=0&controls=1&showinfo=0&iv_load_policy=3&cc_load_policy=0`;

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
        )}

        {/* YouTube iframe with native controls */}
        <iframe
          src={fallbackUrl}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?enablejsapi=1&modestbranding=1&rel=0&controls=0&showinfo=0&disablekb=0&fs=0&iv_load_policy=3&cc_load_policy=0&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`;

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
      )}

      {/* YouTube iframe */}
      <iframe
        id={`yt-player-${videoId}`}
        ref={iframeRef}
        src={embedUrl}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen={false}
        referrerPolicy="no-referrer"
        sandbox="allow-scripts allow-same-origin"
      />

      {/* Custom controls overlay */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent p-4">
        <div className="flex items-center justify-center gap-4">
          {/* Seek backward */}
          <button
            onClick={seekBackward}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            title="-10 soniya"
          >
            <SkipBack size={20} className="text-white" />
          </button>

          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className="p-3 rounded-full bg-white/30 hover:bg-white/40 transition-colors"
          >
            {isPlaying ? (
              <Pause size={24} className="text-white" />
            ) : (
              <Play size={24} className="text-white ml-0.5" />
            )}
          </button>

          {/* Seek forward */}
          <button
            onClick={seekForward}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            title="+10 soniya"
          >
            <SkipForward size={20} className="text-white" />
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors ml-4"
            title="Kattalashtirish"
          >
            {isFullscreen ? (
              <Minimize size={20} className="text-white" />
            ) : (
              <Maximize size={20} className="text-white" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
