import React from 'react';
import { X, ExternalLink, Play, Clock, Sparkles } from 'lucide-react';
import { Video } from '../types';

interface VideoPlayerModalProps {
  video: Video | null;
  isOpen: boolean;
  onClose: () => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({ video, isOpen, onClose }) => {
  if (!isOpen || !video) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl max-w-3xl w-full flex flex-col border border-stone-200 relative overflow-hidden text-stone-900">
        {/* Top Header */}
        <div className="p-4 sm:p-5 flex items-center justify-between border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-2 pr-4">
            <span className="bg-stone-100 text-stone-700 text-xs font-medium px-2.5 py-0.5 rounded-md border border-stone-200">
              {video.category}
            </span>
            <span className="text-xs text-stone-600 font-medium tabular-nums flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-emerald-800" strokeWidth={1.75} />
              {video.duration}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 text-stone-500 hover:text-stone-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* Video Player Container */}
        <div className="relative w-full aspect-video bg-stone-900 border-b border-stone-200 flex items-center justify-center">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1&rel=0&modestbranding=1`}
            title={video.title}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>

        {/* Video Information Body */}
        <div className="p-5 sm:p-6 bg-white space-y-3">
          <h2 className="text-base sm:text-lg font-semibold text-stone-900 tracking-tight leading-snug">
            {video.title}
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            {video.description}
          </p>

          <div className="pt-3 flex items-center justify-between flex-wrap gap-3 border-t border-stone-200 text-xs text-stone-500">
            <span>Pemateri / Sumber: <strong className="font-semibold text-stone-900">{video.author || 'Tim Keperawatan Holistik'}</strong></span>
            <a
              href={video.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-emerald-800 hover:text-emerald-950 font-medium transition-colors"
            >
              <span>Buka di YouTube</span>
              <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.75} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
