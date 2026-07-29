'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import {
  PlayIcon,
  PauseIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
} from '@heroicons/react/24/solid';
import { usePlayerStore } from '@/store/playerStore';

interface VideoPlayerProps {
  streamUrl: string;
  onPlay?: () => void;
  onPause?: () => void;
  onSeek?: (time: number) => void;
  onRateChange?: (rate: number) => void;
}

export default function VideoPlayer({
  streamUrl,
  onPlay,
  onPause,
  onSeek,
  onRateChange,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    state,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    isFullscreen,
    setState,
    setCurrentTime,
    setDuration,
    setVolume,
    toggleMute,
    toggleFullscreen,
  } = usePlayerStore();

  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    let hls: Hls | null = null;

    if (Hls.isSupported() && streamUrl.endsWith('.m3u8')) {
      hls = new Hls({ enableWorker: true });
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
    } else {
      video.src = streamUrl;
    }

    return () => {
      if (hls) hls.destroy();
    };
  }, [streamUrl]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
      setState('playing');
      onPlay?.();
    } else {
      video.pause();
      setState('paused');
      onPause?.();
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
      onSeek?.(time);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = val;
      setVolume(val);
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (state === 'playing') setShowControls(false);
    }, 3000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative aspect-video w-full bg-black rounded-3xl overflow-hidden group neo-card"
    >
      <video
        ref={videoRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onClick={togglePlay}
        className="w-full h-full object-contain cursor-pointer"
      />

      {/* Controls Overlay */}
      <div
        className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 flex flex-col justify-between p-6 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div />

        {/* Bottom Control Bar */}
        <div className="space-y-4">
          {/* Progress Bar */}
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeekChange}
            className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-blue-electric"
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={togglePlay} className="text-white hover:text-blue-ice transition-colors">
                {state === 'playing' ? (
                  <PauseIcon className="w-8 h-8" />
                ) : (
                  <PlayIcon className="w-8 h-8" />
                )}
              </button>

              <div className="flex items-center gap-2">
                <button onClick={toggleMute} className="text-white hover:text-blue-ice">
                  {isMuted || volume === 0 ? (
                    <SpeakerXMarkIcon className="w-6 h-6" />
                  ) : (
                    <SpeakerWaveIcon className="w-6 h-6" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1 bg-white/20 rounded accent-blue-electric"
                />
              </div>

              <span className="text-xs text-text-secondary font-mono">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  if (!document.fullscreenElement) {
                    containerRef.current?.requestFullscreen();
                    toggleFullscreen();
                  } else {
                    document.exitFullscreen();
                    toggleFullscreen();
                  }
                }}
                className="text-white hover:text-blue-ice"
              >
                {isFullscreen ? (
                  <ArrowsPointingInIcon className="w-6 h-6" />
                ) : (
                  <ArrowsPointingOutIcon className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
