'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Play, Pause, Maximize, Minimize, X,
  RotateCcw, RotateCw, Volume2, VolumeX,
} from 'lucide-react';

interface SecureYouTubePlayerProps {
  videoUrl: string;
  title?: string;
  onClose?: () => void;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

/**
 * Xavfsiz YouTube Player — YouTube IFrame API bilan
 * Custom kontroller: play/pause, skip forward/backward, fullscreen
 * Kanal nomi, reklamalar va boshqa videolar ko'rinmaydi
 * Error 153 muammosi hal qilingan (origin parametri)
 */
export default function SecureYouTubePlayer({ videoUrl, title, onClose }: SecureYouTubePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const playerDivRef = useRef<HTMLDivElement>(null);
  const timeUpdateRef = useRef<NodeJS.Timeout | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const playerIdRef = useRef(`yt-player-${Math.random().toString(36).slice(2, 9)}`);

  // Extract YouTube video ID
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

  // Load YouTube IFrame API
  useEffect(() => {
    if (!videoId) return;

    const loadAPI = () => {
      if (window.YT && window.YT.Player) {
        initPlayer();
        return;
      }

      // Check if script already loading
      if (document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const checkReady = setInterval(() => {
          if (window.YT && window.YT.Player) {
            clearInterval(checkReady);
            initPlayer();
          }
        }, 100);
        return;
      }

      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      document.head.appendChild(tag);

      window.onYouTubeIframeAPIReady = () => {
        initPlayer();
      };
    };

    loadAPI();

    return () => {
      if (timeUpdateRef.current) clearInterval(timeUpdateRef.current);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {}
      }
    };
  }, [videoId]);

  const initPlayer = () => {
    if (!videoId || !window.YT) return;

    try {
      playerRef.current = new window.YT.Player(playerIdRef.current, {
        videoId,
        host: 'https://www.youtube-nocookie.com',
        playerVars: {
          autoplay: 0,
          controls: 0,        // Our custom controls
          disablekb: 1,       // Disable keyboard (we handle it)
          fs: 0,              // No fullscreen button (we have our own)
          iv_load_policy: 3,  // No annotations
          modestbranding: 1,  // Minimal branding
          rel: 0,             // No related videos
          showinfo: 0,        // No video info
          cc_load_policy: 0,  // No captions
          playsinline: 1,
          origin: typeof window !== 'undefined' ? window.location.origin : '',
        },
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange,
          onError: onPlayerError,
        },
      });
    } catch (e) {
      setError('Video playerni yuklashda xatolik');
    }
  };

  const onPlayerReady = (event: any) => {
    setIsReady(true);
    setDuration(event.target.getDuration());

    // Start time tracking
    timeUpdateRef.current = setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime) {
        setCurrentTime(playerRef.current.getCurrentTime());
      }
    }, 500);
  };

  const onPlayerStateChange = (event: any) => {
    switch (event.data) {
      case window.YT.PlayerState.PLAYING:
        setIsPlaying(true);
        break;
      case window.YT.PlayerState.PAUSED:
      case window.YT.PlayerState.ENDED:
        setIsPlaying(false);
        break;
    }
  };

  const onPlayerError = (event: any) => {
    const errorCode = event.data;
    switch (errorCode) {
      case 2:
        setError('Video URL noto\'g\'ri');
        break;
      case 5:
        setError('HTML5 player xatosi');
        break;
      case 100:
        setError('Video topilmadi yoki o\'chirilgan');
        break;
      case 101:
      case 150:
        setError('Bu video saytda ko\'rishga ruxsat bermagan');
        break;
      default:
        setError('Video yuklanmadi');
    }
  };

  // Controls
  const togglePlay = useCallback(() => {
    if (!playerRef.current || !isReady) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  }, [isPlaying, isReady]);

  const skip = useCallback((seconds: number) => {
    if (!playerRef.current || !isReady) return;
    const newTime = Math.max(0, Math.min(currentTime + seconds, duration));
    playerRef.current.seekTo(newTime, true);
    setCurrentTime(newTime);
  }, [currentTime, duration, isReady]);

  const toggleMute = useCallback(() => {
    if (!playerRef.current || !isReady) return;
    if (isMuted) {
      playerRef.current.unMute();
    } else {
      playerRef.current.mute();
    }
    setIsMuted(!isMuted);
  }, [isMuted, isReady]);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {}
  }, []);

  const seekTo = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!playerRef.current || !isReady || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    playerRef.current.seekTo(newTime, true);
    setCurrentTime(newTime);
  }, [duration, isReady]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Auto-hide controls
  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying]);

  // Format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!videoId) {
    return (
      <div className="p-6 text-center text-text-secondary bg-gray-50 rounded-xl">
        <p>Video URL noto&apos;g&apos;ri formatda</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center bg-red-50 rounded-xl border border-red-200">
        <p className="text-red-600 font-medium mb-2">Video xatosi</p>
        <p className="text-sm text-red-500">{error}</p>
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-3 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
        >
          YouTube&apos;da ko&apos;rish
        </a>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative bg-black rounded-xl overflow-hidden select-none ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'w-full aspect-video'
      }`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* YouTube Player container */}
      <div className="w-full h-full pointer-events-none">
        <div id={playerIdRef.current} ref={playerDivRef} className="w-full h-full" />
      </div>

      {/* Clickable overlay for play/pause */}
      <div
        className="absolute inset-0 z-10 cursor-pointer"
        onClick={togglePlay}
      />

      {/* Loading state */}
      {!isReady && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Controls overlay */}
      <div
        className={`absolute inset-0 z-20 pointer-events-none transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Top bar: title + close */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-4 pointer-events-auto">
          <div className="flex items-center justify-between">
            <span className="text-white text-sm font-medium truncate max-w-[80%]">
              {title || 'Videoyechim'}
            </span>
            <div className="flex items-center gap-2">
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
                >
                  <X size={18} className="text-white" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Center: Play/Pause + Skip buttons */}
        <div className="absolute inset-0 flex items-center justify-center gap-6 pointer-events-auto">
          {/* Rewind buttons */}
          <button
            onClick={(e) => { e.stopPropagation(); skip(-60); }}
            className="p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors text-white/80 hover:text-white"
            title="-60s"
          >
            <span className="text-xs font-bold">60</span>
            <RotateCcw size={16} className="inline ml-0.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); skip(-30); }}
            className="p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors text-white/80 hover:text-white"
            title="-30s"
          >
            <span className="text-xs font-bold">30</span>
            <RotateCcw size={16} className="inline ml-0.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); skip(-10); }}
            className="p-2.5 rounded-full bg-black/40 hover:bg-black/60 transition-colors text-white/80 hover:text-white"
            title="-10s"
          >
            <span className="text-xs font-bold">10</span>
            <RotateCcw size={18} className="inline ml-0.5" />
          </button>

          {/* Play/Pause */}
          <button
            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            className="p-4 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-colors"
          >
            {isPlaying ? (
              <Pause size={32} className="text-white" fill="white" />
            ) : (
              <Play size={32} className="text-white" fill="white" />
            )}
          </button>

          {/* Forward buttons */}
          <button
            onClick={(e) => { e.stopPropagation(); skip(10); }}
            className="p-2.5 rounded-full bg-black/40 hover:bg-black/60 transition-colors text-white/80 hover:text-white"
            title="+10s"
          >
            <RotateCw size={18} className="inline mr-0.5" />
            <span className="text-xs font-bold">10</span>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); skip(30); }}
            className="p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors text-white/80 hover:text-white"
            title="+30s"
          >
            <RotateCw size={16} className="inline mr-0.5" />
            <span className="text-xs font-bold">30</span>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); skip(60); }}
            className="p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors text-white/80 hover:text-white"
            title="+60s"
          >
            <RotateCw size={16} className="inline mr-0.5" />
            <span className="text-xs font-bold">60</span>
          </button>
        </div>

        {/* Bottom bar: progress + controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pointer-events-auto">
          {/* Progress bar */}
          <div
            className="w-full h-1.5 bg-white/30 rounded-full cursor-pointer mb-3 group hover:h-2.5 transition-all"
            onClick={seekTo}
          >
            <div
              className="h-full bg-primary-500 rounded-full relative"
              style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" />
            </div>
          </div>

          {/* Controls row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Play/Pause small */}
              <button onClick={togglePlay} className="text-white hover:text-primary-300 transition-colors">
                {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
              </button>

              {/* Volume */}
              <button onClick={toggleMute} className="text-white hover:text-primary-300 transition-colors">
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>

              {/* Time */}
              <span className="text-white/80 text-xs font-mono">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleFullscreen}
                className="text-white hover:text-primary-300 transition-colors"
                title={isFullscreen ? 'Kichiklashtirish' : 'Kattalashtirish'}
              >
                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
