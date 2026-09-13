'use client';

import React from 'react';
import { Play, Pause, RotateCcw, Monitor, Video } from 'lucide-react';
import { AspectRatio } from '@/types/route';

interface TimelineControlsProps {
  isPlaying: boolean;
  currentProgress: number; // 0.0 to 1.0
  durationSeconds: number;
  aspectRatio: AspectRatio;
  onPlayToggle: () => void;
  onReset: () => void;
  onProgressChange: (progress: number) => void;
  onDurationChange: (duration: number) => void;
  onAspectRatioChange: (aspectRatio: AspectRatio) => void;
  onExportClick: () => void;
}

export const TimelineControls: React.FC<TimelineControlsProps> = ({
  isPlaying,
  currentProgress,
  durationSeconds,
  aspectRatio,
  onPlayToggle,
  onReset,
  onProgressChange,
  onDurationChange,
  onAspectRatioChange,
  onExportClick,
}) => {
  const currentTime = (currentProgress * durationSeconds).toFixed(1);
  const totalTime = durationSeconds.toFixed(1);

  return (
    <div className="bg-white/90 backdrop-blur-md border border-[#dcd4c6] rounded-2xl p-4 shadow-xl flex flex-col gap-3">
      {/* Top row: Playback Buttons, Scrubber & Time */}
      <div className="flex items-center gap-4">
        {/* Play/Pause Button */}
        <button
          onClick={onPlayToggle}
          className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#EB5E28] to-[#c2593f] hover:from-[#c2593f] hover:to-[#EB5E28] text-[#252422] flex items-center justify-center shadow-lg shadow-[#EB5E28]/20 transition-all transform active:scale-95"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
        </button>

        {/* Reset Button */}
        <button
          onClick={onReset}
          className="p-2.5 rounded-xl bg-[#ede5d6] hover:bg-[#dcd4c6] text-[#403D39] hover:text-[#252422] transition-all border border-[#e8e1d5]"
          title="Reset to Start"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Scrubber Bar */}
        <div className="flex-1 flex flex-col gap-1">
          <div className="relative flex items-center">
            <input
              type="range"
              min="0"
              max="1"
              step="0.001"
              value={currentProgress}
              onChange={(e) => onProgressChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-[#ede5d6] rounded-lg appearance-none cursor-pointer accent-[#EB5E28] hover:accent-[#EB5E28]"
            />
          </div>
          <div className="flex justify-between text-xs font-mono text-[#736d65]">
            <span>{currentTime}s</span>
            <span>{totalTime}s</span>
          </div>
        </div>

        {/* Export Video Button */}
        <button
          onClick={onExportClick}
          className="px-5 py-2.5 bg-gradient-to-r from-[#EB5E28] to-[#c2593f] hover:from-[#c2593f] hover:to-[#EB5E28] text-[#252422] font-semibold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all transform active:scale-95 whitespace-nowrap"
        >
          <Video className="w-4 h-4" />
          <span>Export Video</span>
        </button>
      </div>

      {/* Bottom row: Aspect Ratio & Duration Settings */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[#dcd4c6] text-xs text-[#736d65]">
        {/* Aspect Ratio: 16:9 YouTube Landscape only */}
        <div className="flex items-center gap-2">
          <span className="font-medium text-[#736d65]">Format:</span>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EB5E28]/12 text-[#EB5E28] border border-[#EB5E28]/40 font-semibold text-xs shadow-sm">
            <Monitor className="w-3.5 h-3.5 text-[#EB5E28]" />
            <span>16:9 YouTube</span>
          </div>
        </div>

        {/* Video Duration Selector */}
        <div className="flex items-center gap-2">
          <span className="font-medium text-[#736d65]">Video Duration:</span>
          <div className="flex items-center gap-1.5">
            {[5, 8, 12, 16].map((sec) => (
              <button
                key={sec}
                onClick={() => onDurationChange(sec)}
                className={`px-2.5 py-1 rounded-md font-mono text-xs transition-colors ${
                  durationSeconds === sec
                    ? 'bg-[#EB5E28]/12 text-[#EB5E28] border border-[#EB5E28]/50'
                    : 'bg-[#FFFCF2] text-[#736d65] hover:text-[#252422] border border-[#dcd4c6]'
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
