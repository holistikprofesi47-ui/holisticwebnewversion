import React, { useState, useMemo } from 'react';
import { Play, Clock, Search, Video as VideoIcon, Sparkles, ExternalLink } from 'lucide-react';
import { Video } from '../types';

interface VideoListViewProps {
  videos: Video[];
  onSelectVideo: (video: Video) => void;
}

export const VideoListView: React.FC<VideoListViewProps> = ({ videos, onSelectVideo }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories = [
    'Semua',
    'Massage',
    'Cupping',
    'Akupresur',
    'Relaksasi',
    'Mind-body therapy'
  ];

  const filteredVideos = useMemo(() => {
    return videos.filter((v) => {
      const matchesCat =
        selectedCategory === 'Semua' || v.category === selectedCategory;
      const matchesSearch =
        v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [videos, selectedCategory, searchQuery]);

  return (
    <div className="bg-stone-50 space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white text-stone-900 p-6 sm:p-8 rounded-xl border border-stone-200">
        <div className="max-w-xl space-y-2">
          <span className="inline-block text-xs font-medium uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1 rounded-md border border-emerald-200/70">
            Media Audio-Visual
          </span>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-stone-900">
            Video Pembelajaran Terapi Holistik
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            Tonton demonstrasi prosedur klinis, teknik pemijatan, bekam kering aman, dan akupresur oleh tim keperawatan terlatih.
          </p>
        </div>
      </div>

      {/* Search & Category Tabs */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" strokeWidth={1.75} />
          <input
            type="text"
            placeholder="Cari video edukasi terapi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-stone-200 rounded-lg pl-10 pr-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border ${
                selectedCategory === cat
                  ? 'bg-emerald-800 text-white border-emerald-800'
                  : 'bg-white text-stone-600 hover:bg-stone-50 border-stone-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Video Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVideos.map((video) => (
          <div
            key={video.id}
            className="bg-white rounded-xl border border-stone-200 overflow-hidden hover:border-emerald-700/40 transition-colors flex flex-col group"
          >
            {/* Thumbnail with Play Overlay */}
            <div
              onClick={() => onSelectVideo(video)}
              className="relative aspect-video w-full bg-stone-100 border-b border-stone-200 overflow-hidden cursor-pointer"
            >
              <img
                src={video.thumbnail}
                alt={video.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-stone-900/15 group-hover:bg-stone-900/25 transition-colors flex items-center justify-center">
                <div className="w-11 h-11 rounded-full bg-white/95 text-emerald-800 border border-stone-200 flex items-center justify-center group-hover:bg-emerald-800 group-hover:text-white group-hover:border-emerald-800 transition-colors">
                  <Play className="w-4 h-4 ml-0.5" fill="currentColor" strokeWidth={1.75} />
                </div>
              </div>

              <div className="absolute top-3 left-3 bg-white/95 text-stone-700 border border-stone-200 text-[11px] font-medium px-2.5 py-0.5 rounded-md">
                {video.category}
              </div>

              <div className="absolute bottom-3 right-3 bg-white/95 text-stone-800 border border-stone-200 text-[11px] font-mono font-medium tabular-nums px-2 py-0.5 rounded-md flex items-center gap-1">
                <Clock className="w-3 h-3 text-emerald-800" strokeWidth={1.75} />
                {video.duration}
              </div>
            </div>

            {/* Video Content */}
            <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
              <div>
                <h3
                  onClick={() => onSelectVideo(video)}
                  className="font-semibold tracking-tight text-stone-900 text-sm sm:text-base leading-snug group-hover:text-emerald-800 transition-colors cursor-pointer line-clamp-2"
                >
                  {video.title}
                </h3>
                <p className="text-xs text-stone-600 mt-1 line-clamp-2 leading-relaxed">
                  {video.description}
                </p>
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-stone-200">
                <span className="text-[11px] text-stone-500 truncate max-w-[140px]">
                  {video.author || 'Edukasi Holistik'}
                </span>

                <button
                  onClick={() => onSelectVideo(video)}
                  className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-medium py-1.5 px-3 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" strokeWidth={1.75} />
                  <span>Tonton Video</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredVideos.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-stone-200 p-6">
          <p className="text-stone-500 text-sm">Tidak ditemukan video pada kategori ini.</p>
        </div>
      )}
    </div>
  );
};
