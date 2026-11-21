import React, { useState } from 'react';
import { X, Calendar, Clock, MapPin, QrCode, Phone, AlertTriangle, CheckCircle, Trash2, ShieldCheck, User, Mail } from 'lucide-react';
import { Appointment, UserProfile } from '../types';
import { formatIndonesianDate, isAppointmentForUser } from '../utils/storage';

interface AppointmentDetailModalProps {
  appointment: Appointment | null;
  isOpen: boolean;
  onClose: () => void;
  onCancelAppointment: (id: string, reason: string) => void;
  currentUser?: UserProfile;
  isAdmin?: boolean;
}

export const AppointmentDetailModal: React.FC<AppointmentDetailModalProps> = ({
  appointment,
  isOpen,
  onClose,
  onCancelAppointment,
  currentUser,
  isAdmin = false
}) => {
  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('Ada keperluan mendadak');

  if (!isOpen || !appointment) return null;

  // Security & Privacy Barrier: Ensure e-ticket belongs to active patient if not in Nakes/Admin mode
  const isAuthorized = isAdmin || (currentUser && isAppointmentForUser(appointment, currentUser));

  if (!isAuthorized) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-sm">
        <div className="bg-white rounded-xl max-w-sm w-full p-6 text-center border border-stone-200 space-y-4">
          <div className="w-11 h-11 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-base font-semibold tracking-tight text-stone-900">Akses E-Tiket Dibatasi</h3>
            <p className="text-xs text-stone-600 mt-1 leading-relaxed">
              E-tiket ini terdaftar atas akun pasien lain. Silakan beralih atau masuk menggunakan akun yang bersangkutan untuk melihat detail reservasi.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-medium text-xs py-2.5 rounded-lg transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: Appointment['status']) => {
    switch (status) {
      case 'Terjadwal':
        return <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs px-2.5 py-1 rounded-md font-medium">Terjadwal</span>;
      case 'Menunggu':
        return <span className="bg-amber-50 text-amber-900 border border-amber-200 text-xs px-2.5 py-1 rounded-md font-medium">Menunggu Konfirmasi</span>;
      case 'Selesai':
        return <span className="bg-stone-100 text-stone-800 border border-stone-300 text-xs px-2.5 py-1 rounded-md font-medium">Selesai</span>;
      case 'Dibatalkan':
        return <span className="bg-stone-100 text-stone-500 border border-stone-200 text-xs px-2.5 py-1 rounded-md font-medium">Dibatalkan</span>;
    }
  };

  const handleCancel = () => {
    onCancelAppointment(appointment.id, cancelReason);
    setIsConfirmingCancel(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-xl max-w-md w-full border border-stone-200 overflow-hidden text-stone-800">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-white border-b border-stone-200 text-stone-900 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-emerald-800 font-medium uppercase tracking-wider">
              Tiket Pelayanan Keperawatan
            </span>
            <h3 className="text-base sm:text-lg font-semibold tracking-tight text-stone-900 mt-0.5">
              {appointment.therapyName}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white hover:bg-stone-100 text-stone-500 hover:text-stone-800 border border-stone-200 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs sm:text-sm">
          {/* Status & Code */}
          <div className="flex items-center justify-between bg-stone-50 p-3.5 rounded-xl border border-stone-200">
            <div>
              <span className="text-[10px] text-stone-500 uppercase block font-medium">Kode Booking</span>
              <span className="text-base font-semibold text-emerald-800 tracking-wide tabular-nums">
                {appointment.bookingCode}
              </span>
            </div>
            <div>{getStatusBadge(appointment.status)}</div>
          </div>

          {/* Details Table */}
          <div className="space-y-2.5 text-stone-700">
            <div className="flex items-start gap-3 bg-stone-50 p-3 rounded-lg border border-stone-200">
              <Calendar className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5" strokeWidth={1.75} />
              <div>
                <span className="text-[10px] text-stone-500 block font-medium">Hari & Tanggal</span>
                <span className="font-semibold text-stone-900 tabular-nums">
                  {appointment.dayName}, {formatIndonesianDate(appointment.date)}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-stone-50 p-3 rounded-lg border border-stone-200">
              <Clock className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5" strokeWidth={1.75} />
              <div>
                <span className="text-[10px] text-stone-500 block font-medium">Jam Pelayanan</span>
                <span className="font-semibold text-emerald-800 tabular-nums">
                  {appointment.timeSlot.includes('WIB') ? appointment.timeSlot : `${appointment.timeSlot} WIB`}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-stone-50 p-3 rounded-lg border border-stone-200">
              <MapPin className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5" strokeWidth={1.75} />
              <div>
                <span className="text-[10px] text-stone-500 block font-medium">Lokasi Tindakan</span>
                <span className="font-semibold text-stone-900">
                  {appointment.locationName}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-stone-50 p-3 rounded-lg border border-stone-200">
              <User className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5" strokeWidth={1.75} />
              <div>
                <span className="text-[10px] text-stone-500 block font-medium">Nama Pasien & Kontak</span>
                <span className="font-semibold text-stone-900">{appointment.userName}</span>
                <span className="text-stone-500 block text-xs tabular-nums">{appointment.userPhone}</span>
              </div>
            </div>

            {appointment.notes && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <span className="text-[10px] text-amber-800 block font-medium">Catatan / Keluhan:</span>
                <span className="text-xs text-amber-950">{appointment.notes}</span>
              </div>
            )}

            {appointment.cancelledReason && (
              <div className="p-3 bg-stone-100 border border-stone-200 rounded-lg text-stone-700 text-xs">
                <strong>Alasan Pembatalan:</strong> {appointment.cancelledReason}
              </div>
            )}
          </div>

          {/* Cancellation Confirmation View */}
          {isConfirmingCancel ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-amber-900 font-semibold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-700" strokeWidth={1.75} />
                <span>Konfirmasi Pembatalan Jadwal</span>
              </div>
              <p className="text-xs text-amber-900 leading-relaxed">
                Apakah Anda yakin ingin membatalkan jadwal terapi ini? Slot akan dibuka kembali untuk pasien lain.
              </p>
              <div>
                <label className="text-[11px] font-medium text-stone-700 block mb-1">
                  Pilih Alasan:
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full bg-white border border-stone-200 rounded-lg p-2 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800"
                >
                  <option value="Ada keperluan mendadak">Ada keperluan mendadak</option>
                  <option value="Ingin mengganti jadwal / terapi lain">Ingin mengganti jadwal / terapi lain</option>
                  <option value="Kondisi kesehatan sudah membaik">Kondisi kesehatan sudah membaik</option>
                  <option value="Kendala transportasi">Kendala transportasi</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <button
                  onClick={() => setIsConfirmingCancel(false)}
                  className="px-3 py-1.5 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs font-medium rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleCancel}
                  className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium rounded-lg cursor-pointer"
                >
                  Ya, Batalkan Jadwal
                </button>
              </div>
            </div>
          ) : (
            appointment.status !== 'Dibatalkan' && appointment.status !== 'Selesai' && (
              <div className="pt-1">
                <button
                  onClick={() => setIsConfirmingCancel(true)}
                  className="w-full py-2.5 px-4 text-stone-700 hover:bg-stone-100 bg-stone-50 border border-stone-200 font-medium rounded-lg text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 text-stone-500" strokeWidth={1.75} />
                  <span>Batalkan Jadwal Ini</span>
                </button>
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex justify-end">
          <button
            onClick={onClose}
            className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs sm:text-sm font-medium px-5 py-2 rounded-lg transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
