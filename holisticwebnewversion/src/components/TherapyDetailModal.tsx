import React from 'react';
import { X, Clock, CheckCircle, AlertOctagon, HelpCircle, ShieldCheck, CalendarPlus, HeartHandshake, ListOrdered, AlertTriangle } from 'lucide-react';
import { Therapy } from '../types';

interface TherapyDetailModalProps {
  therapy: Therapy | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectSchedule: (therapy: Therapy) => void;
}

export const TherapyDetailModal: React.FC<TherapyDetailModalProps> = ({
  therapy,
  isOpen,
  onClose,
  onSelectSchedule
}) => {
  if (!isOpen || !therapy) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[92vh] flex flex-col border border-stone-200 relative overflow-hidden">
        {/* Header Hero Image */}
        <div className="relative h-44 sm:h-52 w-full bg-stone-100 border-b border-stone-200 shrink-0">
          <img
            src={therapy.image}
            alt={therapy.name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 w-8 h-8 rounded-lg bg-white/95 hover:bg-white text-stone-700 border border-stone-200 flex items-center justify-center transition-colors cursor-pointer z-10"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>

          {/* Badges on image */}
          <div className="absolute bottom-3 left-4 right-4 flex items-center gap-2 flex-wrap">
            <span className="bg-white/95 text-emerald-800 border border-stone-200 text-[11px] font-medium px-2.5 py-0.5 rounded-md uppercase tracking-wider">
              Terapi Komplementer
            </span>
            <span className="bg-white/95 text-stone-800 border border-stone-200 text-xs font-medium tabular-nums px-2.5 py-0.5 rounded-md flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-emerald-800" strokeWidth={1.75} />
              Durasi: {therapy.durationText}
            </span>
            {therapy.scheduleNote && (
              <span className="bg-amber-50 text-amber-900 border border-amber-200 font-medium text-xs px-2.5 py-0.5 rounded-md flex items-center gap-1">
                Khusus Jumat & Sabtu
              </span>
            )}
          </div>
        </div>

        {/* Title bar */}
        <div className="px-5 sm:px-6 pt-4 pb-3 border-b border-stone-200 bg-white">
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-stone-900">
            {therapy.name}
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            {therapy.tagline}
          </p>
        </div>

        {/* Modal Content Scrollable */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-stone-700 text-sm">
          {/* Schedule availability banner for Tai Chi & Yoga */}
          {therapy.scheduleNote && (
            <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl flex items-start gap-3 text-amber-900">
              <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" strokeWidth={1.75} />
              <div className="space-y-0.5">
                <h4 className="text-xs font-semibold text-amber-950 uppercase tracking-wide">
                  Jadwal Pelaksanaan Sesi Terapi
                </h4>
                <p className="text-xs leading-relaxed text-amber-900">
                  Pelaksanaan sesi <strong>{therapy.name}</strong> tersedia pada hari <strong>Jumat dan Sabtu</strong> (khusus Dept. Keperawatan hanya hari Jumat; tidak tersedia di Dipocare).
                </p>
              </div>
            </div>
          )}

          {/* Special warning if any (e.g. Dry Cupping) */}
          {therapy.specialWarning && (
            <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl flex gap-3 text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" strokeWidth={1.75} />
              <p className="text-xs leading-relaxed font-medium">
                {therapy.specialWarning}
              </p>
            </div>
          )}

          {/* Pengertian (Definition) */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-emerald-800" strokeWidth={1.75} />
              Pengertian Terapi
            </h3>
            <p className="text-stone-600 text-xs sm:text-sm leading-relaxed bg-stone-50 p-4 rounded-xl border border-stone-200">
              {therapy.definition}
            </p>
          </div>

          {/* Tujuan & Manfaat (Benefits) */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-800" strokeWidth={1.75} />
              Tujuan & Manfaat Terapi
            </h3>
            <div className="grid gap-2 sm:grid-cols-1">
              {therapy.benefits.map((benefit, idx) => (
                <div key={idx} className="flex items-start gap-2.5 bg-stone-50 p-3 rounded-lg border border-stone-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-800 mt-1.5 shrink-0" />
                  <span className="text-xs sm:text-sm text-stone-800 leading-snug">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Indikasi Umum */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
              <HeartHandshake className="w-4 h-4 text-emerald-800" strokeWidth={1.75} />
              Indikasi Umum
            </h3>
            <ul className="grid gap-2 sm:grid-cols-2">
              {therapy.indications.map((ind, idx) => (
                <li key={idx} className="bg-stone-50 p-3 rounded-lg border border-stone-200 text-xs text-stone-700 flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-800 mt-1.5 shrink-0" />
                  <span>{ind}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Teknik / Langkah Terapi if available */}
          {therapy.techniquesOrSteps && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                <ListOrdered className="w-4 h-4 text-emerald-800" strokeWidth={1.75} />
                Alur & Teknik Tindakan
              </h3>
              <div className="space-y-2">
                {therapy.techniquesOrSteps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3 bg-stone-50 p-3 rounded-lg border border-stone-200">
                    <span className="w-5 h-5 rounded-md bg-emerald-800 text-white flex items-center justify-center shrink-0 text-xs font-medium tabular-nums">
                      {idx + 1}
                    </span>
                    <span className="text-xs sm:text-sm text-stone-700">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hal yang Perlu Diperhatikan (Precautions) */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-800" strokeWidth={1.75} />
              Hal yang Perlu Diperhatikan
            </h3>
            <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 space-y-2">
              {therapy.precautions.map((prec, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-amber-950">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-700 mt-1.5 shrink-0" />
                  <span>{prec}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Kontraindikasi / Peringatan (Contraindications) */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
              <AlertOctagon className="w-4 h-4 text-stone-700" strokeWidth={1.75} />
              Kontraindikasi & Peringatan Medis
            </h3>
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-2">
              {therapy.contraindications.map((contra, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-stone-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-stone-500 mt-1.5 shrink-0" />
                  <span>{contra}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Safe Non-claiming Educational Note */}
          <p className="text-[11px] text-stone-500 text-center px-4">
            Terapi ini merupakan bagian dari asuhan keperawatan komplementer untuk mendukung kenyamanan dan proses pemulihan alami tubuh.
          </p>
        </div>

        {/* Modal Footer with "Pilih Jadwal" CTA */}
        <div className="p-4 sm:p-5 border-t border-stone-200 bg-stone-50 flex items-center justify-between gap-4">
          <button
            onClick={onClose}
            className="text-stone-600 hover:text-stone-900 bg-white hover:bg-stone-100 border border-stone-200 text-xs sm:text-sm font-medium px-4 py-2.5 rounded-lg transition-colors cursor-pointer"
          >
            Tutup
          </button>
          <button
            onClick={() => {
              onClose();
              onSelectSchedule(therapy);
            }}
            className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs sm:text-sm font-medium px-5 py-2.5 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
          >
            <CalendarPlus className="w-4 h-4" strokeWidth={1.75} />
            <span>Pilih Jadwal Tindakan</span>
          </button>
        </div>
      </div>
    </div>
  );
};
