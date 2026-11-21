/** @jsxRuntime classic */
import React, { useState, useMemo } from 'react';
import {
  CalendarClock,
  Clock,
  MapPin,
  CalendarPlus,
  QrCode,
  AlertCircle,
  CheckCircle2,
  CalendarX2,
  ChevronRight,
  Eye,
  Filter,
  User,
  Users,
  ClipboardList,
  HeartPulse,
  Activity,
  FileText,
  Stethoscope,
  X,
  Printer
} from 'lucide-react';
import { Appointment, AppointmentStatus, UserProfile, ClinicalProgressNote } from '../types';
import { formatIndonesianDate, filterUserAppointments, filterProgressNotesForUser } from '../utils/storage';

interface MyAppointmentsViewProps {
  appointments: Appointment[];
  currentUser: UserProfile;
  progressNotes?: ClinicalProgressNote[];
  onOpenBooking: () => void;
  onViewDetail: (appointment: Appointment) => void;
  onCancelAppointment: (id: string, reason: string) => void;
  onOpenPatientAuth?: () => void;
}

export const MyAppointmentsView: React.FC<MyAppointmentsViewProps> = ({
  appointments,
  currentUser,
  progressNotes = [],
  onOpenBooking,
  onViewDetail,
  onCancelAppointment,
  onOpenPatientAuth
}: MyAppointmentsViewProps) => {
  const [activeSubTab, setActiveSubTab] = useState<'appointments' | 'progressNotes'>('appointments');
  const [selectedStatus, setSelectedStatus] = useState<string>('Semua');
  const [selectedNoteForModal, setSelectedNoteForModal] = useState<ClinicalProgressNote | null>(null);

  const statusFilters = ['Semua', 'Terjadwal', 'Menunggu', 'Selesai', 'Dibatalkan'];

  // Scope appointments strictly to current active patient
  const userScopedAppointments = useMemo(() => {
    return filterUserAppointments(appointments, currentUser);
  }, [appointments, currentUser]);

  const filteredAppointments = useMemo(() => {
    return userScopedAppointments.filter((app: Appointment) => {
      if (selectedStatus === 'Semua') return true;
      return app.status === selectedStatus;
    });
  }, [userScopedAppointments, selectedStatus]);

  // Synchronized clinical progress notes from Nakes for this active patient
  const userProgressNotes = useMemo(() => {
    return filterProgressNotesForUser(progressNotes, currentUser, userScopedAppointments);
  }, [progressNotes, currentUser, userScopedAppointments]);

  const getStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case 'Terjadwal':
        return (
          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-medium px-2.5 py-0.5 rounded-md flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-700"></span>
            Terjadwal
          </span>
        );
      case 'Menunggu':
        return (
          <span className="bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-medium px-2.5 py-0.5 rounded-md flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
            Menunggu
          </span>
        );
      case 'Selesai':
        return (
          <span className="bg-stone-100 text-stone-800 border border-stone-300 text-[11px] font-medium px-2.5 py-0.5 rounded-md flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-800"></span>
            Selesai
          </span>
        );
      case 'Dibatalkan':
        return (
          <span className="bg-stone-100 text-stone-500 border border-stone-200 text-[11px] font-medium px-2.5 py-0.5 rounded-md flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-stone-400"></span>
            Dibatalkan
          </span>
        );
    }
  };

  return (
    <div className="bg-stone-50 space-y-5 pb-12">
      {/* Top Banner */}
      <div className="bg-white text-stone-900 p-6 sm:p-8 rounded-xl border border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="inline-block text-xs font-medium uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1 rounded-md border border-emerald-200/70">
            Jadwal Saya & Riwayat Medis
          </span>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-stone-900 mt-2">
            Riwayat & Reservasi Terapi
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Kelola jadwal tindakan keperawatan holistik, pantau status reservasi, dan evaluasi rekam medis dari perawat.
          </p>
        </div>
        <button
          onClick={onOpenBooking}
          className="bg-emerald-800 hover:bg-emerald-900 text-white font-medium px-4 py-2.5 rounded-lg transition-colors flex items-center gap-2 text-xs sm:text-sm shrink-0 cursor-pointer"
        >
          <CalendarPlus className="w-4 h-4" strokeWidth={1.75} />
          <span>Tambah Jadwal</span>
        </button>
      </div>

      {/* Patient Profile Scope Box */}
      <div className="bg-white rounded-xl p-4 border border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-800 flex items-center justify-center font-semibold text-sm shrink-0">
            {currentUser.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-stone-900">{currentUser.name}</span>
              <span className="text-[11px] font-mono font-medium tabular-nums text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                {currentUser.patientNumber}
              </span>
            </div>
            <p className="text-[11px] text-stone-500 mt-0.5 tabular-nums">
              Email: {currentUser.email || '-'} • Reservasi: {userScopedAppointments.length} jadwal • Catatan Perawat: {userProgressNotes.length} rekam medis
            </p>
          </div>
        </div>

        {onOpenPatientAuth && (
          <button
            onClick={onOpenPatientAuth}
            className="w-full sm:w-auto bg-stone-50 hover:bg-stone-100 text-stone-700 font-medium px-3.5 py-2 rounded-lg border border-stone-200 transition-colors cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
          >
            <Users className="w-4 h-4 text-emerald-800" strokeWidth={1.75} />
            <span>Ganti / Masuk Akun Pasien</span>
          </button>
        )}
      </div>

      {/* Primary Sub-Tabs: Jadwal Tindakan vs Rekam Medis Nakes */}
      <div className="flex items-center gap-2 border-b border-stone-200">
        <button
          onClick={() => setActiveSubTab('appointments')}
          className={`px-4 py-2.5 font-medium text-xs sm:text-sm rounded-t-lg transition-colors cursor-pointer flex items-center gap-2 border-b-2 ${
            activeSubTab === 'appointments'
              ? 'bg-white text-emerald-800 border-emerald-800'
              : 'text-stone-500 hover:text-stone-800 border-transparent'
          }`}
        >
          <CalendarClock className="w-4 h-4 text-emerald-800" strokeWidth={1.75} />
          <span className="tabular-nums">Jadwal Reservasi ({userScopedAppointments.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('progressNotes')}
          className={`px-4 py-2.5 font-medium text-xs sm:text-sm rounded-t-lg transition-colors cursor-pointer flex items-center gap-2 border-b-2 ${
            activeSubTab === 'progressNotes'
              ? 'bg-white text-emerald-800 border-emerald-800'
              : 'text-stone-500 hover:text-stone-800 border-transparent'
          }`}
        >
          <ClipboardList className="w-4 h-4 text-emerald-800" strokeWidth={1.75} />
          <span className="tabular-nums">Catatan Perkembangan Saya ({userProgressNotes.length})</span>
          {userProgressNotes.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-emerald-700"></span>
          )}
        </button>
      </div>

      {/* VIEW 1: JADWAL RESERVASI */}
      {activeSubTab === 'appointments' && (
        <div className="space-y-4">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {statusFilters.map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border ${
                  selectedStatus === st
                    ? 'bg-emerald-800 text-white border-emerald-800'
                    : 'bg-white text-stone-600 hover:bg-stone-50 border-stone-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Appointment Cards List */}
          <div className="space-y-3">
            {filteredAppointments.map((app) => {
              const matchedNote = userProgressNotes.find(
                (n: ClinicalProgressNote) => n.bookingCode === app.bookingCode || n.appointmentId === app.id
              );

              return (
                <div
                  key={app.id}
                  className="bg-white rounded-xl border border-stone-200 hover:border-emerald-700/40 transition-colors p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-medium tabular-nums text-stone-600 bg-stone-100 px-2.5 py-0.5 rounded-md border border-stone-200">
                        {app.bookingCode}
                      </span>
                      {getStatusBadge(app.status)}

                      {matchedNote && (
                        <button
                          onClick={() => setSelectedNoteForModal(matchedNote)}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-medium px-2.5 py-0.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Buka catatan perkembangan yang dapat dibaca pasien"
                        >
                          <ClipboardList className="w-3.5 h-3.5 text-emerald-800" strokeWidth={1.75} />
                          <span>Catatan Perkembangan Tersedia</span>
                        </button>
                      )}
                    </div>

                    <div>
                      <h3 className="text-base font-semibold tracking-tight text-stone-900">
                        {app.therapyName}
                      </h3>
                      <p className="text-xs text-stone-600 flex items-center gap-1.5 mt-0.5 tabular-nums">
                        <span className="font-medium text-emerald-800">{app.dayName}, {formatIndonesianDate(app.date)}</span>
                        <span>•</span>
                        <span className="bg-stone-100 text-stone-800 font-medium px-2 py-0.5 rounded-md border border-stone-200">
                          {app.timeSlot.includes('WIB') ? app.timeSlot : `${app.timeSlot} WIB`}
                        </span>
                      </p>
                    </div>

                    <p className="text-xs text-stone-500 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" strokeWidth={1.75} />
                      <span className="truncate max-w-md">{app.locationName}</span>
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100 flex-wrap">
                    {matchedNote && (
                      <button
                        onClick={() => setSelectedNoteForModal(matchedNote)}
                        className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-medium py-2 px-3.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Stethoscope className="w-4 h-4" strokeWidth={1.75} />
                        <span>Baca Catatan Perkembangan</span>
                      </button>
                    )}

                    <button
                      onClick={() => onViewDetail(app)}
                      className="bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-medium py-2 px-3.5 rounded-lg border border-stone-200 transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Eye className="w-4 h-4 text-emerald-800" strokeWidth={1.75} />
                      <span>Lihat Detail</span>
                    </button>

                    {app.status !== 'Dibatalkan' && app.status !== 'Selesai' && (
                      <button
                        onClick={() => onViewDetail(app)}
                        className="bg-white hover:bg-stone-50 text-stone-600 border border-stone-200 text-xs font-medium py-2 px-3 rounded-lg transition-colors cursor-pointer"
                      >
                        Batalkan
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredAppointments.length === 0 && (
              <div className="text-center py-14 bg-white rounded-xl border border-stone-200 p-6 space-y-3">
                <div className="w-12 h-12 bg-stone-100 text-stone-500 rounded-lg flex items-center justify-center mx-auto">
                  <CalendarX2 className="w-5 h-5" strokeWidth={1.75} />
                </div>
                <div>
                  <h3 className="font-semibold text-stone-900 text-base">Belum Ada Jadwal</h3>
                  <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                    Pasien <strong>{currentUser.name}</strong> belum memiliki reservasi dengan status "{selectedStatus}".
                  </p>
                </div>
                <button
                  onClick={onOpenBooking}
                  className="mt-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-medium px-4 py-2.5 rounded-lg transition-colors inline-flex items-center gap-2 cursor-pointer"
                >
                  <CalendarPlus className="w-4 h-4" strokeWidth={1.75} />
                  <span>Buat Jadwal Baru</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: CATATAN PERKEMBANGAN DARI PERAWAT */}
      {activeSubTab === 'progressNotes' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-5 border border-stone-200 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-stone-900 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-emerald-800" strokeWidth={1.75} />
                <span>Dokumentasi Asuhan & Rekam Medis Pasien</span>
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Evaluasi tindakan, tanda vital, dan respon terapi yang dicatat oleh perawat penanggung jawab.
              </p>
            </div>
            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium px-3 py-1 rounded-md flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-700"></span>
              Tersinkronisasi
            </span>
          </div>

          {userProgressNotes.length === 0 ? (
            <div className="bg-white rounded-xl p-8 border border-stone-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-lg bg-stone-100 text-stone-500 flex items-center justify-center mx-auto">
                <ClipboardList className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <h3 className="font-semibold text-stone-900 text-sm">Belum Ada Catatan Klinis Tersimpan</h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                Setelah menyelesaikan sesi terapi, perawat akan mendokumentasikan hasil pengkajian fisik, respon terapi, dan instruksi perawatan mandiri di rumah.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {userProgressNotes.map((note: ClinicalProgressNote) => (
                <div
                  key={note.id}
                  onClick={() => setSelectedNoteForModal(note)}
                  className="bg-white rounded-xl border border-stone-200 p-4 sm:p-5 hover:border-emerald-700/40 transition-colors space-y-3 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-2.5">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-stone-900 text-sm">{note.therapyName}</span>
                        {note.bookingCode && (
                          <span className="text-[11px] font-mono font-medium tabular-nums bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md">
                            {note.bookingCode}
                          </span>
                        )}
                        <span className="text-[11px] font-mono tabular-nums text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">
                          {note.patientNumber}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 mt-1 tabular-nums">
                        Tanggal Tindakan: <strong className="text-stone-700">{formatIndonesianDate(note.visitDate)}</strong>
                      </p>
                    </div>

                    <span className="text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1 shrink-0">
                      <span>Buka Rekam Medis</span>
                      <ChevronRight className="w-4 h-4" strokeWidth={1.75} />
                    </span>
                  </div>

                  {note.vitalSigns && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-stone-50 p-2.5 rounded-lg border border-stone-200 tabular-nums">
                      <div>
                        <span className="text-[10px] text-stone-500 block font-medium">Tekanan Darah</span>
                        <span className="font-semibold text-stone-900">{note.vitalSigns.bloodPressure || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-500 block font-medium">Nadi</span>
                        <span className="font-semibold text-stone-900">{note.vitalSigns.pulseRate || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-500 block font-medium">Pernapasan</span>
                        <span className="font-semibold text-stone-900">{note.vitalSigns.respiratoryRate || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-500 block font-medium">Skala Nyeri</span>
                        <span className="font-semibold text-emerald-800">{note.vitalSigns.painScale !== undefined ? `${note.vitalSigns.painScale} / 10` : '-'}</span>
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-stone-700 space-y-1">
                    <p className="line-clamp-2">
                      <strong className="text-stone-900">Keluhan:</strong> {note.chiefComplaint}
                    </p>
                    <p className="line-clamp-2 text-stone-600">
                      <strong className="text-stone-900">Tindak Lanjut & Anjuran Nakes:</strong> {note.progressFollowUp}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
                    <span>Perawat: <strong className="text-stone-800">{note.nurseName}</strong></span>
                    <span className="text-emerald-800 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-800" strokeWidth={1.75} />
                      Tervalidasi
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL DETAIL REKAM MEDIS DARI PERAWAT */}
      {selectedNoteForModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3.5 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-5 border border-stone-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-800 flex items-center justify-center">
                  <Stethoscope className="w-5 h-5" strokeWidth={1.75} />
                </div>
                <div>
                  <h3 className="font-semibold tracking-tight text-stone-900 text-base">Rekam Asuhan Keperawatan</h3>
                  <p className="text-[11px] text-stone-500 font-mono tabular-nums">
                    {selectedNoteForModal.patientNumber} • {formatIndonesianDate(selectedNoteForModal.visitDate)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedNoteForModal(null)}
                className="w-8 h-8 rounded-lg bg-white hover:bg-stone-100 text-stone-500 hover:text-stone-800 border border-stone-200 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </div>

            {/* Vital Signs Box */}
            {selectedNoteForModal.vitalSigns && (
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 space-y-2">
                <h4 className="text-xs font-semibold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                  <HeartPulse className="w-4 h-4 text-emerald-800" strokeWidth={1.75} />
                  <span>Pemeriksaan Tanda Vital (TTV)</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs tabular-nums">
                  <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                    <span className="text-[10px] text-stone-500 block font-medium">Tekanan Darah</span>
                    <span className="font-semibold text-stone-900">{selectedNoteForModal.vitalSigns.bloodPressure || '-'}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                    <span className="text-[10px] text-stone-500 block font-medium">Nadi</span>
                    <span className="font-semibold text-stone-900">{selectedNoteForModal.vitalSigns.pulseRate || '-'}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                    <span className="text-[10px] text-stone-500 block font-medium">Pernapasan</span>
                    <span className="font-semibold text-stone-900">{selectedNoteForModal.vitalSigns.respiratoryRate || '-'}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                    <span className="text-[10px] text-stone-500 block font-medium">Skala Nyeri</span>
                    <span className="font-semibold text-emerald-800">{selectedNoteForModal.vitalSigns.painScale !== undefined ? `${selectedNoteForModal.vitalSigns.painScale} / 10` : '-'}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                <span className="font-semibold text-stone-900 block mb-1">Keluhan Saat Kunjungan:</span>
                <p className="text-stone-700 whitespace-pre-wrap">{selectedNoteForModal.chiefComplaint}</p>
              </div>

              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                <span className="font-semibold text-stone-900 block mb-1">Hasil Pengkajian Klinis (Asesmen):</span>
                <p className="text-stone-700 whitespace-pre-wrap">{selectedNoteForModal.assessment}</p>
              </div>

              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                <span className="font-semibold text-stone-900 block mb-1">Intervensi & Modalitas yang Diberikan:</span>
                <p className="text-stone-700 whitespace-pre-wrap">{selectedNoteForModal.intervention}</p>
              </div>

              <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-200">
                <span className="font-semibold text-emerald-950 block mb-1">Catatan Perkembangan & Tindak Lanjut:</span>
                <p className="text-emerald-900 whitespace-pre-wrap">{selectedNoteForModal.progressFollowUp}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500">
              <div>
                <span>Perawat:</span>
                <p className="font-semibold text-stone-900">{selectedNoteForModal.nurseName}</p>
              </div>
              <button
                onClick={() => window.print()}
                className="bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200 font-medium px-3.5 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4 text-emerald-800" strokeWidth={1.75} />
                <span>Cetak Rekam</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

