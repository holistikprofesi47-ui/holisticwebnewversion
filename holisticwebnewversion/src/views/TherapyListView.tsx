import React, { useState, useMemo } from 'react';
import { Search, Sparkles, Clock, ArrowRight, CalendarPlus, ShieldAlert, HeartHandshake, Info } from 'lucide-react';
import { Therapy, TherapyCategory } from '../types';

interface TherapyListViewProps {
  therapies: Therapy[];
  onOpenDetail: (therapy: Therapy) => void;
  onOpenBooking: (therapy: Therapy) => void;
}

export const TherapyListView: React.FC<TherapyListViewProps> = ({
  therapies,
  onOpenDetail,
  onOpenBooking
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'Semua Terapi' },
    { id: 'massage', label: 'Massage & Pijat' },
    { id: 'cupping', label: 'Dry Cupping (Bekam)' },
    { id: 'spa', label: 'Foot Spa' },
    { id: 'exercise', label: 'Olah Tubuh & Pikiran (Tai Chi / Yoga)' }
  ];

  const filteredTherapies = useMemo(() => {
    return therapies.filter((t) => {
      const matchesSearch =
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.benefits.some(b => b.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory =
        selectedCategory === 'all' || t.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [therapies, searchQuery, selectedCategory]);

  return (
    <div className="bg-stone-50 space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-white text-stone-900 p-6 sm:p-8 rounded-xl border border-stone-200">
        <div className="max-w-xl space-y-2">
          <span className="inline-block text-xs font-medium uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1 rounded-md border border-emerald-200/70">
            Edukasi & Layanan Klinis
          </span>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-stone-900">
            Katalog Terapi Holistik
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            Pelajari pengertian, manfaat, indikasi, serta kontraindikasi setiap tindakan keperawatan komplementer sebelum menjadwalkan sesi kunjungan.
          </p>
        </div>
      </div>

      {/* Search & Category Filter */}
      <div className="space-y-3">
        {/* Search Box */}
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" strokeWidth={1.75} />
          <input
            type="text"
            placeholder="Cari nama terapi, keluhan, atau manfaat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-stone-200 rounded-lg pl-10 pr-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border ${
                selectedCategory === cat.id
                  ? 'bg-emerald-800 text-white border-emerald-800'
                  : 'bg-white text-stone-600 hover:bg-stone-50 border-stone-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Therapy Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTherapies.map((therapy) => (
          <div
            key={therapy.id}
            className="bg-white rounded-xl border border-stone-200 hover:border-emerald-700/40 transition-colors overflow-hidden flex flex-col"
          >
            <div className="relative h-44 w-full bg-stone-100 border-b border-stone-200">
              <img
                src={therapy.image}
                alt={therapy.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-3 right-3 flex items-center gap-1.5 flex-wrap justify-end">
                {therapy.scheduleNote && (
                  <span className="bg-white/95 text-stone-800 border border-stone-200 text-[11px] font-medium px-2.5 py-0.5 rounded-md">
                    Jumat & Sabtu
                  </span>
                )}
                <div className="bg-white/95 text-stone-800 border border-stone-200 text-xs font-medium tabular-nums px-2.5 py-0.5 rounded-md flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-800" strokeWidth={1.75} />
                  {therapy.durationText}
                </div>
              </div>
            </div>

            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div>
                  <h3 className="text-base font-semibold tracking-tight text-stone-900">
                    {therapy.name}
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5 line-clamp-1">{therapy.tagline}</p>
                </div>

                <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                  {therapy.description}
                </p>

                {/* Schedule info for Friday & Saturday only */}
                {therapy.scheduleNote && (
                  <div className="text-xs text-amber-900 bg-amber-50 p-2.5 rounded-lg border border-amber-200 flex items-center gap-2 font-medium">
                    <Clock className="w-4 h-4 text-amber-700 shrink-0" strokeWidth={1.75} />
                    <span>Jadwal Sesi: Khusus Hari Jumat & Sabtu</span>
                  </div>
                )}

                {/* Key Benefits Preview */}
                <div className="bg-stone-50 p-3 rounded-lg border border-stone-200 space-y-1.5">
                  <span className="text-[11px] font-semibold text-stone-700 uppercase tracking-wide block">
                    Manfaat Utama
                  </span>
                  <ul className="text-xs text-stone-600 space-y-1">
                    {therapy.benefits.slice(0, 2).map((b, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-800 mt-1.5 shrink-0" />
                        <span className="line-clamp-1">{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {therapy.specialWarning && (
                  <div className="text-[11px] text-amber-900 bg-amber-50 p-2.5 rounded-lg border border-amber-200 flex items-center gap-2 font-medium">
                    <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" strokeWidth={1.75} />
                    <span className="line-clamp-1">Tindakan dilakukan oleh perawat terlatih</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-2.5">
                <button
                  onClick={() => onOpenDetail(therapy)}
                  className="flex-1 bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-medium py-2.5 px-3 rounded-lg transition-colors border border-stone-200 text-center cursor-pointer"
                >
                  Detail Layanan
                </button>
                <button
                  onClick={() => onOpenBooking(therapy)}
                  className="flex-1 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-medium py-2.5 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CalendarPlus className="w-4 h-4" strokeWidth={1.75} />
                  <span>Pilih Jadwal</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredTherapies.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-stone-200 p-6">
          <p className="text-stone-500 text-sm">Tidak ditemukan layanan terapi dengan kata kunci tersebut.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
            }}
            className="mt-3 text-xs text-emerald-800 font-medium underline cursor-pointer"
          >
            Reset Filter Pencarian
          </button>
        </div>
      )}
    </div>
  );
};
