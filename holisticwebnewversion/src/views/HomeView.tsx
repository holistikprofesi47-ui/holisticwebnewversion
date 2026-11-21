import React from 'react';
import {
  Sparkles,
  CalendarPlus,
  PlayCircle,
  ShieldCheck,
  Clock,
  ArrowRight,
  HeartHandshake,
  Activity,
  Footprints,
  Droplets,
  ShieldAlert,
  Wind,
  CalendarCheck,
  Video as VideoIcon,
  ChevronRight,
  Stethoscope
} from 'lucide-react';
import { Therapy, ActiveTab, Appointment } from '../types';
import { formatIndonesianDate } from '../utils/storage';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

interface HomeViewProps {
  therapies: Therapy[];
  onOpenDetail: (therapy: Therapy) => void;
  onOpenBooking: (therapy?: Therapy) => void;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenSafety: () => void;
  upcomingAppointments: Appointment[];
}

export const HomeView = ({
  therapies,
  onOpenDetail,
  onOpenBooking,
  setActiveTab,
  onOpenSafety,
  upcomingAppointments
}: HomeViewProps) => {
  // Map icon names to Lucide components
  const getTherapyIcon = (id: string) => {
    switch (id) {
      case 'head-massage':
        return <Sparkles className="w-5 h-5 text-emerald-800" strokeWidth={1.75} />;
      case 'back-massage':
        return <Activity className="w-5 h-5 text-emerald-800" strokeWidth={1.75} />;
      case 'foot-massage':
        return <Footprints className="w-5 h-5 text-emerald-800" strokeWidth={1.75} />;
      case 'foot-spa':
        return <Droplets className="w-5 h-5 text-emerald-800" strokeWidth={1.75} />;
      case 'dry-cupping':
        return <ShieldAlert className="w-5 h-5 text-emerald-800" strokeWidth={1.75} />;
      case 'tai-chi':
        return <Wind className="w-5 h-5 text-emerald-800" strokeWidth={1.75} />;
      case 'yoga':
        return <HeartHandshake className="w-5 h-5 text-emerald-800" strokeWidth={1.75} />;
      default:
        return <Sparkles className="w-5 h-5 text-emerald-800" strokeWidth={1.75} />;
    }
  };

  const nextAppointment = upcomingAppointments.find(
    (a) => a.status === 'Terjadwal' || a.status === 'Menunggu'
  );

  return (
    // @ts-ignore -- suppress missing react/jsx-runtime typings for this JSX expression
    <div className="bg-stone-50 space-y-8 pb-12">
      {/* HERO SECTION */}
      <section className="rounded-xl bg-white p-6 sm:p-8 border border-stone-200">
        <div className="max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 bg-emerald-50 px-3 py-1 rounded-lg text-xs font-medium text-emerald-800 border border-emerald-200/70">
            <HeartHandshake className="w-4 h-4 text-emerald-800" strokeWidth={1.75} />
            <span>Klinik Keperawatan Komplementer UNDIP & Bergas</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-stone-900 leading-snug">
            Layanan Keperawatan Holistik Terpadu
          </h1>

          <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
            Pendampingan terapi komplementer berbasis bukti ilmiah untuk mendukung pemulihan, relaksasi, dan keseimbangan fisik bersama perawat profesional.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onOpenBooking()}
              className="bg-emerald-800 hover:bg-emerald-900 text-white font-medium rounded-lg px-5 py-2.5 flex items-center gap-2 transition-colors cursor-pointer text-sm"
            >
              <CalendarPlus className="w-4 h-4 text-white" strokeWidth={1.75} />
              <span>Buat Janji / Booking Terapi</span>
            </button>

            <button
              onClick={() => setActiveTab('videos')}
              className="bg-white hover:bg-stone-50 text-stone-700 font-medium px-4 py-2.5 rounded-lg border border-stone-200 flex items-center gap-2 transition-colors cursor-pointer text-sm"
            >
              <PlayCircle className="w-4 h-4 text-emerald-800" strokeWidth={1.75} />
              <span>Video Edukasi</span>
            </button>
          </div>
        </div>
      </section>

      {/* ACTIVE SCHEDULE REMINDER BANNER (If any) */}
      {nextAppointment && (
        <div className="bg-white border border-stone-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="bg-emerald-50 text-emerald-800 rounded-lg p-2.5 flex items-center justify-center shrink-0">
              <CalendarCheck className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <span className="text-[11px] font-medium text-emerald-800 uppercase tracking-wider bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-md">
                Jadwal Terdaftar
              </span>
              <h3 className="font-semibold tracking-tight text-stone-900 text-sm sm:text-base mt-1 tabular-nums">
                {nextAppointment.therapyName} — {nextAppointment.dayName}, {formatIndonesianDate(nextAppointment.date)} ({nextAppointment.timeSlot.includes('WIB') ? nextAppointment.timeSlot : `${nextAppointment.timeSlot} WIB`})
              </h3>
              <p className="text-xs text-stone-500 truncate max-w-md mt-0.5">
                Lokasi: {nextAppointment.locationName}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('appointments')}
            className="text-xs font-medium text-stone-700 bg-stone-50 hover:bg-stone-100 border border-stone-200 px-3.5 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <span>Detail Jadwal</span>
            <ChevronRight className="w-4 h-4 text-stone-500" strokeWidth={1.75} />
          </button>
        </div>
      )}

      {/* 9 MAIN MENU CARDS GRID */}
      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-stone-900 tracking-tight">
              Daftar Layanan Terapi & Edukasi
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
              Tujuh modalitas terapi keperawatan komplementer, materi edukasi, dan reservasi klinik.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('therapies')}
            className="text-xs font-medium text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer"
          >
            <span>Lihat Semua</span>
            <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1 to 7: Holistic Therapies */}
          {therapies.map((therapy) => (
            <div
              key={therapy.id}
              className="bg-white rounded-xl border border-stone-200 hover:border-emerald-700/40 transition-colors flex flex-col overflow-hidden"
            >
              {/* Image & Tag */}
              <div className="relative h-40 w-full overflow-hidden bg-stone-100 border-b border-stone-200">
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
                <div className="absolute bottom-3 left-3 bg-emerald-50 text-emerald-800 rounded-lg p-2 border border-emerald-200/80 flex items-center justify-center">
                  {getTherapyIcon(therapy.id)}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between gap-1.5">
                    <h3 className="font-semibold tracking-tight text-stone-900 text-base">
                      {therapy.name}
                    </h3>
                  </div>
                  <p className="text-xs text-stone-600 mt-1 line-clamp-2 leading-relaxed">
                    {therapy.description}
                  </p>
                  {therapy.scheduleNote && (
                    <div className="mt-2.5 text-[11px] text-stone-600 bg-stone-50 px-2.5 py-1.5 rounded-lg border border-stone-200 font-medium flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-800 shrink-0" strokeWidth={1.75} />
                      <span>Jadwal Khusus: Jumat & Sabtu</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={() => onOpenDetail(therapy)}
                    className="flex-1 bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-medium py-2 px-3 rounded-lg transition-colors border border-stone-200 cursor-pointer text-center"
                  >
                    Detail Layanan
                  </button>
                  <button
                    onClick={() => onOpenBooking(therapy)}
                    className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-medium py-2 px-3.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                    title="Jadwalkan Tindakan"
                  >
                    <CalendarPlus className="w-4 h-4" strokeWidth={1.75} />
                    <span>Reservasi</span>
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* 8. Menu Card: Video Pembelajaran */}
          <div
            onClick={() => setActiveTab('videos')}
            className="bg-white rounded-xl p-5 border border-stone-200 hover:border-emerald-700/40 transition-colors flex flex-col justify-between cursor-pointer"
          >
            <div className="space-y-3">
              <div className="w-9 h-9 bg-emerald-50 text-emerald-800 rounded-lg p-2 flex items-center justify-center">
                <VideoIcon className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div>
                <span className="text-[11px] uppercase font-medium tracking-wider text-stone-500">
                  Materi Klinis
                </span>
                <h3 className="text-base font-semibold tracking-tight text-stone-900 mt-0.5">
                  Video Panduan Terapi
                </h3>
                <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                  Pelajari prosedur teknik foot massage, head massage, back massage, dry cupping, dan latihan pernapasan.
                </p>
              </div>
            </div>

            <div className="pt-5 flex items-center justify-between text-xs font-medium text-emerald-800">
              <span>Buka Galeri Video</span>
              <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
            </div>
          </div>

          {/* 9. Menu Card: Jadwal Tindakan */}
          <div
            onClick={() => onOpenBooking()}
            className="bg-white rounded-xl p-5 border border-stone-200 hover:border-emerald-700/40 transition-colors flex flex-col justify-between cursor-pointer"
          >
            <div className="space-y-3">
              <div className="w-9 h-9 bg-emerald-50 text-emerald-800 rounded-lg p-2 flex items-center justify-center">
                <CalendarPlus className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div>
                <span className="text-[11px] uppercase font-medium tracking-wider text-stone-500">
                  Pendaftaran Pasien
                </span>
                <h3 className="text-base font-semibold tracking-tight text-stone-900 mt-0.5">
                  Reservasi Jadwal Klinik
                </h3>
                <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                  Pilih layanan terapi, lokasi klinik praktik (UNDIP atau Bergas), beserta sesi waktu kunjungan Anda.
                </p>
              </div>
            </div>

            <div className="pt-5 flex items-center justify-between text-xs font-medium text-emerald-800">
              <span>Buat Janji Kunjungan</span>
              <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
            </div>
          </div>
        </div>
      </section>

      {/* SAFETY & EDUCATION CALLOUT */}
      <section className="bg-white rounded-xl p-6 border border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div className="flex items-start gap-3.5">
          <div className="bg-emerald-50 text-emerald-800 rounded-lg p-2.5 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="font-semibold tracking-tight text-stone-900 text-base">
              Panduan Keselamatan & Skrining Klinis
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-xl leading-relaxed">
              Tinjau indikasi, kontraindikasi, dan persiapan pasien sebelum menjalani tindakan keperawatan komplementer.
            </p>
          </div>
        </div>
        <button
          onClick={onOpenSafety}
          className="w-full sm:w-auto bg-emerald-800 hover:bg-emerald-900 text-white text-xs sm:text-sm font-medium px-5 py-2.5 rounded-lg transition-colors shrink-0 cursor-pointer"
        >
          Baca Panduan Keselamatan
        </button>
      </section>
    </div>
  );
};
