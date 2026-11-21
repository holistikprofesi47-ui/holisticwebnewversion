import React, { useState, useMemo } from 'react';
import {
  CalendarDays,
  Building2,
  TrendingUp,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  Activity,
  ArrowUpRight,
  Radio,
  CalendarCheck,
  MapPin
} from 'lucide-react';
import { Appointment, LocationItem } from '../types';
import { formatIndonesianDate, getIndonesianDayName, getStoredLocations } from '../utils/storage';
import { GENERATE_TIME_SLOTS } from '../data/mockData';

interface AdminOccupancySummaryCardProps {
  appointments: Appointment[];
  locations?: LocationItem[];
  onFilterLocation?: (locationName: string) => void;
  onFilterStatus?: (status: string) => void;
}

export const AdminOccupancySummaryCard: React.FC<AdminOccupancySummaryCardProps> = ({
  appointments,
  locations: propLocations,
  onFilterLocation,
  onFilterStatus
}) => {
  const locations = useMemo(() => propLocations || getStoredLocations(), [propLocations]);

  // Default tanggal ringkasan: Hari Ini
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const isToday = selectedDate === todayStr;

  // Janji temu aktif pada tanggal yang dipilih (mengabaikan yang berstatus 'Dibatalkan' untuk okupansi)
  const dateAppointments = useMemo(() => {
    return appointments.filter((app) => (app.date || '').split('T')[0] === selectedDate);
  }, [appointments, selectedDate]);

  // Breakdown status janji temu tanggal terpilih
  const dateStats = useMemo(() => {
    const total = dateAppointments.length;
    const active = dateAppointments.filter((a) => a.status !== 'Dibatalkan').length;
    const waiting = dateAppointments.filter((a) => a.status === 'Menunggu').length;
    const scheduled = dateAppointments.filter((a) => a.status === 'Terjadwal').length;
    const completed = dateAppointments.filter((a) => a.status === 'Selesai').length;
    const cancelled = dateAppointments.filter((a) => a.status === 'Dibatalkan').length;

    return { total, active, waiting, scheduled, completed, cancelled };
  }, [dateAppointments]);

  // Statistik Okupansi per Lokasi pada tanggal terpilih
  const locationOccupancy = useMemo(() => {
    return locations.map((loc) => {
      // Dapatkan seluruh slot waktu yang beroperasi di lokasi ini
      const slots = GENERATE_TIME_SLOTS(loc.id || loc.name);
      const capacity = slots.length;

      // Cari janji temu aktif di lokasi ini pada tanggal terpilih
      const locApps = dateAppointments.filter((app) => {
        if (app.status === 'Dibatalkan') return false;

        const matchId = app.locationId && loc.id && app.locationId === loc.id;
        const appLocName = (app.locationName || '').trim().toLowerCase();
        const locName = loc.name.trim().toLowerCase();
        const matchName =
          appLocName === locName ||
          appLocName.includes(locName) ||
          locName.includes(appLocName);

        return Boolean(matchId || matchName);
      });

      // Hitung sesi unik yang terisi (1 orang per sesi)
      const bookedSlotSet = new Set<string>();
      locApps.forEach((a) => {
        const clean = (a.timeSlot || '').replace(/\s*WIB/gi, '').trim();
        if (clean) bookedSlotSet.add(clean);
      });

      const bookedCount = bookedSlotSet.size;
      const availableCount = Math.max(0, capacity - bookedCount);
      const percentage = capacity > 0 ? Math.round((bookedCount / capacity) * 100) : 0;

      // Status okupansi
      let statusBadge = {
        label: 'Tersedia Banyak',
        color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        barColor: 'bg-emerald-600',
        textColor: 'text-emerald-700'
      };

      if (percentage >= 100) {
        statusBadge = {
          label: 'Penuh (100%)',
          color: 'bg-rose-100 text-rose-800 border-rose-300',
          barColor: 'bg-rose-600',
          textColor: 'text-rose-700'
        };
      } else if (percentage >= 75) {
        statusBadge = {
          label: 'Hampir Penuh',
          color: 'bg-amber-100 text-amber-900 border-amber-300',
          barColor: 'bg-amber-500',
          textColor: 'text-amber-800'
        };
      } else if (percentage >= 40) {
        statusBadge = {
          label: 'Moderat',
          color: 'bg-teal-50 text-teal-800 border-teal-200',
          barColor: 'bg-teal-600',
          textColor: 'text-teal-700'
        };
      }

      return {
        ...loc,
        capacity,
        bookedCount,
        availableCount,
        percentage,
        statusBadge,
        appointments: locApps
      };
    });
  }, [locations, dateAppointments]);

  // Total kapasitas dan okupansi keseluruhan klinik pada tanggal terpilih
  const totalCapacity = useMemo(() => {
    return locationOccupancy.reduce((acc, curr) => acc + curr.capacity, 0);
  }, [locationOccupancy]);

  const totalBooked = useMemo(() => {
    return locationOccupancy.reduce((acc, curr) => acc + curr.bookedCount, 0);
  }, [locationOccupancy]);

  const overallPercentage = totalCapacity > 0 ? Math.round((totalBooked / totalCapacity) * 100) : 0;

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-5 sm:p-6 space-y-5">
      {/* Top Header Card with Real-time Badge & Date Picker */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-800" strokeWidth={1.75} />
              Operasional Klinik Real-Time
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-700"></span>
              Sinkronisasi Aktif
            </span>
          </div>

          <h2 className="text-base sm:text-lg font-semibold tracking-tight text-stone-900 mt-1.5 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-800" strokeWidth={1.75} />
            <span>Ringkasan Jadwal & Okupansi Lokasi</span>
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Pantau rasio keterisian kapasitas perawat holistik di setiap unit klinik secara langsung.
          </p>
        </div>

        {/* Date Selector & Reset to Today */}
        <div className="flex items-center gap-2 bg-stone-50 p-1.5 rounded-lg border border-stone-200 self-start md:self-auto shrink-0">
          <CalendarDays className="w-4 h-4 text-stone-500 ml-1.5" strokeWidth={1.75} />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-800 focus:outline-none focus:border-emerald-800 cursor-pointer tabular-nums"
          />
          {!isToday && (
            <button
              onClick={() => setSelectedDate(todayStr)}
              className="bg-emerald-800 hover:bg-emerald-900 text-white font-medium text-[11px] px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              Hari Ini
            </button>
          )}
          <span className="text-[11px] font-medium text-stone-600 px-2 hidden sm:inline-block">
            {getIndonesianDayName(selectedDate)}, {formatIndonesianDate(selectedDate)}
          </span>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Total Janji Temu Hari/Tanggal Ini */}
        <div className="bg-stone-50/70 border border-stone-200 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-medium uppercase tracking-wider text-stone-500 block">
                {isToday ? 'Janji Temu Hari Ini' : 'Janji Temu Terjadwal'}
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-stone-900 tabular-nums">
                  {dateStats.active}
                </span>
                <span className="text-xs text-stone-500">pasien</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-white border border-stone-200 text-emerald-800 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" strokeWidth={1.75} />
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-stone-200 flex items-center justify-between text-[11px] text-stone-600">
            <span>Menunggu: <strong className="tabular-nums font-semibold text-stone-900">{dateStats.waiting}</strong></span>
            <span className="text-stone-300">•</span>
            <span>Terjadwal: <strong className="tabular-nums font-semibold text-stone-900">{dateStats.scheduled}</strong></span>
          </div>
        </div>

        {/* KPI 2: Total Okupansi Seluruh Unit */}
        <div className="bg-stone-50/70 border border-stone-200 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-medium uppercase tracking-wider text-stone-500 block">
                Tingkat Okupansi Total
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-stone-900 tabular-nums">
                  {overallPercentage}%
                </span>
                <span className="text-xs text-stone-500">kapasitas</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-white border border-stone-200 text-stone-700 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" strokeWidth={1.75} />
            </div>
          </div>

          <div className="mt-3">
            <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  overallPercentage >= 80 ? 'bg-rose-700' : overallPercentage >= 50 ? 'bg-amber-600' : 'bg-emerald-800'
                }`}
                style={{ width: `${Math.min(100, overallPercentage)}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-stone-500 mt-1.5">
              <span><strong className="tabular-nums font-semibold text-stone-900">{totalBooked}</strong> terisi</span>
              <span><strong className="tabular-nums font-semibold text-stone-900">{totalCapacity - totalBooked}</strong> kosong</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Selesai Dilayani */}
        <div className="bg-stone-50/70 border border-stone-200 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-medium uppercase tracking-wider text-stone-500 block">
                Tindakan Selesai
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-stone-900 tabular-nums">
                  {dateStats.completed}
                </span>
                <span className="text-xs text-stone-500">tindakan</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-white border border-stone-200 text-emerald-800 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" strokeWidth={1.75} />
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-stone-200 flex items-center justify-between text-[11px] text-stone-600">
            <span>Dibatalkan: <strong className="tabular-nums font-semibold text-stone-900">{dateStats.cancelled}</strong></span>
            {onFilterStatus && (
              <button
                onClick={() => onFilterStatus('Selesai')}
                className="text-emerald-800 hover:text-emerald-950 font-medium hover:underline cursor-pointer flex items-center gap-0.5"
              >
                <span>Lihat</span>
                <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.75} />
              </button>
            )}
          </div>
        </div>

        {/* KPI 4: Sisa Kapasitas Klinik */}
        <div className="bg-stone-50/70 border border-stone-200 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-medium uppercase tracking-wider text-stone-500 block">
                Slot Tersedia (Sisa)
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-stone-900 tabular-nums">
                  {Math.max(0, totalCapacity - totalBooked)}
                </span>
                <span className="text-xs text-stone-500">dari <strong className="tabular-nums font-semibold text-stone-900">{totalCapacity}</strong> slot</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-white border border-stone-200 text-stone-700 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" strokeWidth={1.75} />
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-stone-200 text-[11px] text-stone-500">
            Total <strong className="tabular-nums font-semibold text-stone-900">{locations.length}</strong> Unit Lokasi Pelayanan
          </div>
        </div>
      </div>

      {/* Real-time Location Occupancy Cards */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-emerald-800" strokeWidth={1.75} />
            Statistik Okupansi per Lokasi Layanan
          </h3>
          <span className="text-[11px] text-stone-500 hidden sm:inline-block">
            Maks. 1 Pasien per Sesi Tindakan
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {locationOccupancy.map((loc) => {
            return (
              <div
                key={loc.id}
                className="bg-white border border-stone-200 rounded-xl p-4 hover:border-stone-300 transition-colors flex flex-col justify-between space-y-3"
              >
                <div>
                  {/* Location Title & Badges */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-emerald-800 shrink-0" strokeWidth={1.75} />
                        <h4 className="font-semibold text-stone-900 text-xs sm:text-sm truncate" title={loc.name}>
                          {loc.name}
                        </h4>
                      </div>
                      <span className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5 tabular-nums">
                        <Clock className="w-3.5 h-3.5 text-stone-400" strokeWidth={1.75} />
                        Jam: {loc.operatingHoursText || '08.00 – 15.30 WIB'}
                      </span>
                    </div>

                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded-md border whitespace-nowrap shrink-0 ${
                        loc.percentage >= 100
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : loc.percentage >= 75
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}
                    >
                      {loc.statusBadge.label}
                    </span>
                  </div>

                  {/* Occupancy Rate Number */}
                  <div className="mt-3 flex items-baseline justify-between">
                    <div>
                      <span className="text-2xl font-semibold tracking-tight text-stone-900 tabular-nums">
                        {loc.percentage}%
                      </span>
                      <span className="text-[11px] text-stone-500 ml-1">okupansi</span>
                    </div>
                    <div className="text-right text-xs text-stone-600">
                      <span className="tabular-nums font-semibold text-stone-900">{loc.bookedCount}</span>
                      <span className="text-stone-400 tabular-nums"> / {loc.capacity} sesi</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden mt-2">
                    <div
                      className={`h-full transition-all duration-500 ${
                        loc.percentage >= 100
                          ? 'bg-rose-700'
                          : loc.percentage >= 75
                            ? 'bg-amber-600'
                            : 'bg-emerald-800'
                      }`}
                      style={{ width: `${Math.min(100, loc.percentage)}%` }}
                    />
                  </div>
                </div>

                {/* Card Footer: Detail & Quick Filter Button */}
                <div className="pt-2.5 border-t border-stone-200 flex items-center justify-between text-[11px]">
                  <span className="text-stone-600">
                    Sisa: <strong className={`tabular-nums font-semibold ${loc.availableCount === 0 ? 'text-rose-700' : 'text-stone-900'}`}>{loc.availableCount}</strong> slot kosong
                  </span>

                  {onFilterLocation && (
                    <button
                      onClick={() => onFilterLocation(loc.name)}
                      className="text-emerald-800 hover:text-emerald-950 font-medium flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <span>Lihat Jadwal</span>
                      <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
