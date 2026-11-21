import React, { useState, useMemo } from 'react';
import {
  User,
  Phone,
  Mail,
  MapPin,
  FileBadge,
  CalendarCheck,
  ShieldCheck,
  Stethoscope,
  HeartHandshake,
  Edit3,
  Save,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertTriangle,
  AlertCircle,
  Lock,
  Users,
  UserPlus,
  LogIn,
  LogOut,
  ClipboardList,
  Activity,
  HeartPulse,
  ChevronRight,
  Printer,
  X
} from 'lucide-react';
import { UserProfile, Appointment, ActiveTab, ClinicalProgressNote } from '../types';
import { formatIndonesianDate, filterUserAppointments, filterProgressNotesForUser } from '../utils/storage';

interface ProfileViewProps {
  user: UserProfile;
  onUpdateUser: (updated: UserProfile) => void;
  appointments: Appointment[];
  progressNotes?: ClinicalProgressNote[];
  setActiveTab: (tab: ActiveTab) => void;
  onOpenSafety: () => void;
  isAdmin: boolean;
  onRequestNakesAccess: () => void;
  onExitNakesMode: () => void;
  onOpenPatientAuth?: (reason?: string) => void;
  onLogoutPatient?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  onUpdateUser,
  appointments,
  progressNotes = [],
  setActiveTab,
  onOpenSafety,
  isAdmin,
  onRequestNakesAccess,
  onExitNakesMode,
  onOpenPatientAuth,
  onLogoutPatient
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [email, setEmail] = useState(user.email);
  const [address, setAddress] = useState(user.address);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [selectedNoteDetail, setSelectedNoteDetail] = useState<ClinicalProgressNote | null>(null);

  const isGuestUser = Boolean(user.isGuest || !user.email);

  const userAppointments = filterUserAppointments(appointments, user);
  const completedAppointments = userAppointments.filter((a) => a.status === 'Selesai');
  const activeAppointments = userAppointments.filter(
    (a) => a.status === 'Terjadwal' || a.status === 'Menunggu'
  );

  // Real-time synchronization of progress notes for this active patient
  const userProgressNotes = useMemo(() => {
    return filterProgressNotesForUser(progressNotes, user, userAppointments);
  }, [progressNotes, user, userAppointments]);

  const handlePrintNote = () => {
    window.print();
  };

  const handleEditClick = () => {
    if (isGuestUser) {
      if (onOpenPatientAuth) {
        onOpenPatientAuth('Silakan masuk (login) atau daftar akun pasien terlebih dahulu untuk mengedit dan memperbarui data profil.');
      }
      return;
    }
    setIsEditing(!isEditing);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuestUser) {
      if (onOpenPatientAuth) {
        onOpenPatientAuth('Silakan masuk (login) atau daftar akun pasien terlebih dahulu untuk menyimpan perubahan profil.');
      }
      return;
    }
    const updated: UserProfile = {
      ...user,
      name,
      phone,
      email,
      address
    };
    onUpdateUser(updated);
    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="bg-stone-50 space-y-6 pb-12">
      {/* Top Profile Card */}
      <div className="bg-white text-stone-900 rounded-xl p-6 sm:p-8 border border-stone-200">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          <div className="w-16 h-16 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center font-semibold text-2xl shrink-0">
            {user.name.charAt(0)}
          </div>

          <div className="flex-1 space-y-1.5">
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-stone-900">
                {user.name}
              </h1>
              {isGuestUser ? (
                <span className="bg-amber-50 text-amber-900 text-[11px] font-medium px-2.5 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
                  <Lock className="w-3 h-3" strokeWidth={1.75} />
                  <span>Mode Tamu (Belum Login)</span>
                </span>
              ) : (
                <span className="bg-emerald-50 text-emerald-800 text-[11px] font-medium px-2.5 py-0.5 rounded-md border border-emerald-200">
                  Pasien Terverifikasi
                </span>
              )}
            </div>

            <p className="text-xs text-stone-500 font-mono tabular-nums">
              No. Pasien: <strong className="text-stone-900">{user.patientNumber}</strong>
            </p>

            <div className="flex flex-wrap justify-center sm:justify-start gap-4 pt-1.5 text-xs text-stone-600">
              <span className="flex items-center gap-1.5 tabular-nums">
                <Phone className="w-4 h-4 text-emerald-800" strokeWidth={1.75} />
                {user.phone || 'Nomor HP belum diisi'}
              </span>
              <span className="flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-emerald-800" strokeWidth={1.75} />
                {user.email || 'Email belum diatur (Mode Tamu)'}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <button
              onClick={handleEditClick}
              className={`border text-xs font-medium px-3.5 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                isGuestUser
                  ? 'bg-amber-50 hover:bg-amber-100/80 text-amber-900 border-amber-200'
                  : 'bg-white hover:bg-stone-50 text-stone-700 border-stone-200'
              }`}
              title={isGuestUser ? 'Masuk akun untuk mengedit data' : 'Edit data profil'}
            >
              {isGuestUser ? (
                <Lock className="w-4 h-4 text-amber-700" strokeWidth={1.75} />
              ) : (
                <Edit3 className="w-4 h-4 text-emerald-800" strokeWidth={1.75} />
              )}
              <span>{isEditing && !isGuestUser ? 'Batal' : isGuestUser ? 'Edit Data (Perlu Login)' : 'Edit Data'}</span>
            </button>

            {onOpenPatientAuth && (
              <button
                onClick={() => onOpenPatientAuth?.()}
                className="bg-emerald-800 hover:bg-emerald-900 text-white font-medium text-xs px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Users className="w-4 h-4" strokeWidth={1.75} />
                <span>{isGuestUser ? 'Masuk / Daftar' : 'Ganti Akun'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Guest Notice Banner */}
      {isGuestUser && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" strokeWidth={1.75} />
            <div>
              <h4 className="font-semibold text-amber-950">Anda Sedang Menggunakan Akun Tamu</h4>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Pengubahan data profil dinonaktifkan untuk akun tamu. Masuk atau daftarkan akun pasien agar data rekam medis Anda tersimpan dan dapat diedit.
              </p>
            </div>
          </div>
          {onOpenPatientAuth && (
            <button
              onClick={() => onOpenPatientAuth('Silakan masuk atau daftar akun pasien terlebih dahulu untuk mengedit dan menyimpan rekam medis.')}
              className="shrink-0 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-medium px-3.5 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <LogIn className="w-4 h-4" strokeWidth={1.75} />
              <span>Masuk Sekarang</span>
            </button>
          )}
        </div>
      )}

      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-800 shrink-0" strokeWidth={1.75} />
          <span>Profil berhasil diperbarui dan tersimpan.</span>
        </div>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-stone-200 text-center">
          <span className="text-xl sm:text-2xl font-semibold text-emerald-800 tabular-nums">
            {completedAppointments.length}
          </span>
          <p className="text-[11px] text-stone-500 font-medium mt-0.5">Sesi Selesai</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-stone-200 text-center">
          <span className="text-xl sm:text-2xl font-semibold text-stone-900 tabular-nums">
            {activeAppointments.length}
          </span>
          <p className="text-[11px] text-stone-500 font-medium mt-0.5">Jadwal Aktif</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-stone-200 text-center">
          <span className="text-xl sm:text-2xl font-semibold text-stone-900 tabular-nums">
            {appointments.length}
          </span>
          <p className="text-[11px] text-stone-500 font-medium mt-0.5">Total Reservasi</p>
        </div>
      </div>

      {/* Profile Edit Form / View */}
      {isEditing && !isGuestUser ? (
        <form onSubmit={handleSave} className="bg-white rounded-xl p-6 border border-stone-200 space-y-4">
          <h3 className="font-semibold tracking-tight text-stone-900 text-sm flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-emerald-800" strokeWidth={1.75} />
            Edit Data Pasien
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-medium text-stone-700 block mb-1">Nama Lengkap</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white border border-stone-200 rounded-lg p-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800"
                required
              />
            </div>
            <div>
              <label className="font-medium text-stone-700 block mb-1">Nomor Telepon / WhatsApp</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-white border border-stone-200 rounded-lg p-2.5 text-stone-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800"
                required
              />
            </div>
            <div>
              <label className="font-medium text-stone-700 block mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border border-stone-200 rounded-lg p-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800"
              />
            </div>
            <div>
              <label className="font-medium text-stone-700 block mb-1">Alamat Domisili</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-white border border-stone-200 rounded-lg p-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 rounded-lg text-xs font-medium text-stone-600 bg-white hover:bg-stone-50 border border-stone-200 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-xs font-medium text-white bg-emerald-800 hover:bg-emerald-900 flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" strokeWidth={1.75} />
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-white rounded-xl p-6 border border-stone-200 space-y-4 text-xs sm:text-sm">
          <h3 className="font-semibold tracking-tight text-stone-900 text-sm flex items-center gap-2">
            <FileBadge className="w-4 h-4 text-emerald-800" strokeWidth={1.75} />
            Informasi Rekam Pasien
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-stone-700">
            <div className="p-3.5 bg-stone-50 rounded-lg border border-stone-200">
              <span className="text-[10px] text-stone-500 block font-medium uppercase">Nomor Pasien / ID Rekam Medis</span>
              <span className="font-mono font-semibold text-stone-900 tabular-nums">{user.patientNumber || '-'}</span>
            </div>
            <div className="p-3.5 bg-stone-50 rounded-lg border border-stone-200">
              <span className="text-[10px] text-stone-500 block font-medium uppercase">Nomor Telepon / WhatsApp</span>
              <span className="font-medium text-stone-900 tabular-nums">{user.phone || '-'}</span>
            </div>
            <div className="p-3.5 bg-stone-50 rounded-lg border border-stone-200">
              <span className="text-[10px] text-stone-500 block font-medium uppercase">Email Terdaftar</span>
              <span className="font-medium text-stone-900">{user.email || 'Mode Tamu (Belum Login)'}</span>
            </div>
            <div className="p-3.5 bg-stone-50 rounded-lg border border-stone-200">
              <span className="text-[10px] text-stone-500 block font-medium uppercase">Alamat Domisili</span>
              <span className="font-medium text-stone-900">
                {isGuestUser ? (user.address || 'Belum Diisi / Silakan Login') : (user.address || 'Semarang')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Catatan Perkembangan Kontrol Pasien (Dari Nakes) */}
      <div className="bg-white rounded-xl p-6 border border-stone-200 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-800 flex items-center justify-center">
              <ClipboardList className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold tracking-tight text-stone-900 text-sm tabular-nums">
                  Catatan Perkembangan & Tindak Lanjut Medis ({userProgressNotes.length})
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-700"></span>
                  Tersinkronisasi
                </span>
              </div>
              <p className="text-[11px] text-stone-500">
                Dokumentasi asuhan keperawatan holistik, asesmen fisik, intervensi, dan evaluasi berkala dari perawat
              </p>
            </div>
          </div>
        </div>

        {userProgressNotes.length === 0 ? (
          <div className="p-6 rounded-xl bg-stone-50 border border-stone-200 text-center space-y-2">
            <div className="w-10 h-10 rounded-lg bg-stone-200/70 text-stone-500 flex items-center justify-center mx-auto">
              <ClipboardList className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <p className="text-xs font-semibold text-stone-800">Belum Ada Catatan Perkembangan Tersimpan</p>
            <p className="text-[11px] text-stone-500 max-w-md mx-auto">
              Ketika Anda menjalani sesi terapi di klinik, tenaga kesehatan akan mendokumentasikan evaluasi tanda vital, respon terapi, serta rekomendasi pemulihan Anda.
            </p>
            {isGuestUser && onOpenPatientAuth && (
              <button
                onClick={() => onOpenPatientAuth('Masuk ke akun Anda untuk melihat riwayat lengkap rekam medis Anda.')}
                className="mt-2 text-xs font-medium text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
              >
                Sudah pernah periksa? Masuk Akun Pasien di sini
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {userProgressNotes.map((note) => (
              <div
                key={note.id}
                className="p-4 rounded-xl border border-stone-200 bg-stone-50 hover:border-emerald-700/40 transition-colors space-y-3 cursor-pointer"
                onClick={() => setSelectedNoteDetail(note)}
              >
                <div className="flex items-start justify-between gap-2 border-b border-stone-200 pb-2.5">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-stone-900 text-xs sm:text-sm">{note.therapyName}</span>
                      {note.bookingCode && (
                        <span className="font-mono text-[10px] font-medium tabular-nums bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md">
                          {note.bookingCode}
                        </span>
                      )}
                      <span className="text-[10px] font-mono font-medium tabular-nums text-stone-500 bg-white border border-stone-200 px-1.5 py-0.5 rounded-md">
                        {note.patientNumber}
                      </span>
                    </div>
                    <span className="text-[11px] text-stone-500 flex items-center gap-1.5 mt-1 tabular-nums">
                      <CalendarCheck className="w-3.5 h-3.5 text-emerald-800" strokeWidth={1.75} />
                      {formatIndonesianDate(note.visitDate)}
                    </span>
                  </div>
                  <span className="text-[11px] text-emerald-800 bg-white border border-stone-200 font-medium px-2.5 py-1 rounded-lg flex items-center gap-1 shrink-0">
                    Lihat Evaluasi <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.75} />
                  </span>
                </div>

                {note.vitalSigns && (
                  <div className="flex items-center gap-2 flex-wrap text-[11px] text-stone-600 bg-white p-2 rounded-lg border border-stone-200 tabular-nums">
                    <span className="font-semibold text-stone-500 text-[10px] uppercase">Tanda Vital:</span>
                    <span className="bg-stone-50 border border-stone-200 px-2 py-0.5 rounded-md font-medium">TD: {note.vitalSigns.bloodPressure || '-'}</span>
                    <span className="bg-stone-50 border border-stone-200 px-2 py-0.5 rounded-md font-medium">Nadi: {note.vitalSigns.pulseRate || '-'}</span>
                    <span className="bg-stone-50 border border-stone-200 px-2 py-0.5 rounded-md font-medium">Nyeri: {note.vitalSigns.painScale !== undefined ? `${note.vitalSigns.painScale}/10` : '-'}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-white rounded-lg border border-stone-200">
                    <span className="text-[10px] font-semibold text-stone-500 uppercase block">Keluhan Saat Kunjungan:</span>
                    <p className="text-stone-700 line-clamp-2 mt-0.5">{note.chiefComplaint}</p>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-stone-200">
                    <span className="text-[10px] font-semibold text-emerald-800 uppercase block">Tindak Lanjut & Anjuran:</span>
                    <p className="text-stone-700 line-clamp-2 mt-0.5">{note.progressFollowUp}</p>
                  </div>
                </div>

                <div className="text-[11px] text-stone-500 flex items-center justify-between pt-1 border-t border-stone-200">
                  <span>Nakes Penanggung Jawab: <strong className="text-stone-800">{note.nurseName}</strong></span>
                  <span className="text-emerald-800 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-800" strokeWidth={1.75} />
                    Tervalidasi Klinis
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Detail Catatan untuk Pasien */}
      {selectedNoteDetail && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3.5 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-5 border border-stone-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-800 flex items-center justify-center">
                  <Stethoscope className="w-5 h-5" strokeWidth={1.75} />
                </div>
                <div>
                  <h4 className="font-semibold tracking-tight text-stone-900 text-sm">Catatan Perkembangan Medis Pasien</h4>
                  <p className="text-[11px] text-stone-500 tabular-nums">{formatIndonesianDate(selectedNoteDetail.visitDate)}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedNoteDetail(null)}
                className="w-8 h-8 rounded-lg bg-white hover:bg-stone-100 text-stone-500 hover:text-stone-800 border border-stone-200 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-stone-500 uppercase font-medium block">Tindakan Terapi</span>
                  <span className="font-semibold text-stone-900 text-sm">{selectedNoteDetail.therapyName}</span>
                </div>
                {selectedNoteDetail.bookingCode && (
                  <span className="font-mono text-xs font-medium tabular-nums text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                    {selectedNoteDetail.bookingCode}
                  </span>
                )}
              </div>

              {selectedNoteDetail.vitalSigns && (
                <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 text-stone-900 grid grid-cols-3 gap-2 text-center tabular-nums">
                  <div>
                    <span className="text-[10px] text-stone-500 block">Tekanan Darah</span>
                    <span className="font-semibold">{selectedNoteDetail.vitalSigns.bloodPressure || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 block">Nadi</span>
                    <span className="font-semibold">{selectedNoteDetail.vitalSigns.pulseRate || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 block">Skala Nyeri</span>
                    <span className="font-semibold text-emerald-800">{selectedNoteDetail.vitalSigns.painScale !== undefined ? `${selectedNoteDetail.vitalSigns.painScale}/10` : '-'}</span>
                  </div>
                </div>
              )}

              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 space-y-1">
                <span className="text-[10px] font-semibold text-stone-600 uppercase block">1. Keluhan Utama</span>
                <p className="text-stone-800 leading-relaxed">{selectedNoteDetail.chiefComplaint}</p>
              </div>

              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 space-y-1">
                <span className="text-[10px] font-semibold text-stone-600 uppercase block">2. Hasil Pengkajian Fisik</span>
                <p className="text-stone-800 leading-relaxed">{selectedNoteDetail.assessment}</p>
              </div>

              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 space-y-1">
                <span className="text-[10px] font-semibold text-stone-600 uppercase block">3. Intervensi yang Diberikan</span>
                <p className="text-stone-800 leading-relaxed whitespace-pre-line">{selectedNoteDetail.intervention}</p>
              </div>

              <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-200 space-y-1">
                <span className="text-[10px] font-semibold text-emerald-900 uppercase block">4. Catatan Perkembangan & Tindak Lanjut</span>
                <p className="text-emerald-950 leading-relaxed">{selectedNoteDetail.progressFollowUp}</p>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] pt-2 border-t border-stone-200 gap-2">
              <span className="text-stone-500">Perawat: <strong className="text-stone-800">{selectedNoteDetail.nurseName}</strong></span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintNote}
                  className="px-3 py-1.5 bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 font-medium rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-emerald-800" strokeWidth={1.75} />
                  <span>Cetak</span>
                </button>
                <button
                  onClick={() => setSelectedNoteDetail(null)}
                  className="px-4 py-1.5 bg-emerald-800 text-white font-medium rounded-lg hover:bg-emerald-900 text-xs cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Settings & Navigation Menu */}
      <div className="bg-white rounded-xl p-5 border border-stone-200 space-y-2">
        <h3 className="font-semibold text-stone-500 text-xs uppercase tracking-wider mb-2 px-1">
          Pusat Bantuan & Pengaturan
        </h3>

        {onOpenPatientAuth && (
          <button
            onClick={() => onOpenPatientAuth()}
            className="w-full flex items-center justify-between p-3 rounded-lg hover:border-emerald-700/40 border border-stone-200 bg-stone-50 transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-800 flex items-center justify-center">
                <Users className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div>
                <h4 className="font-semibold text-stone-900 text-xs sm:text-sm">Manajemen Akun Pasien</h4>
                <p className="text-[11px] text-stone-500">Masuk, daftar akun baru, atau ganti profil pasien keluarga</p>
              </div>
            </div>
            <span className="text-xs text-emerald-800 font-medium bg-white border border-stone-200 px-2.5 py-1 rounded-md">
              Kelola Akun
            </span>
          </button>
        )}

        <button
          onClick={onOpenSafety}
          className="w-full flex items-center justify-between p-3 rounded-lg border border-transparent hover:border-stone-200 hover:bg-stone-50 transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-800 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <h4 className="font-semibold text-stone-900 text-xs sm:text-sm">Panduan Keselamatan Terapi</h4>
              <p className="text-[11px] text-stone-500">Prinsip keamanan, indikasi & kontraindikasi medis</p>
            </div>
          </div>
          <span className="text-xs text-emerald-800 font-medium">Buka</span>
        </button>

        <button
          onClick={() => setActiveTab('appointments')}
          className="w-full flex items-center justify-between p-3 rounded-lg border border-transparent hover:border-stone-200 hover:bg-stone-50 transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-800 flex items-center justify-center">
              <CalendarCheck className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <h4 className="font-semibold text-stone-900 text-xs sm:text-sm">Riwayat Jadwal Terapi</h4>
              <p className="text-[11px] text-stone-500">Lihat semua tiket dan status konfirmasi</p>
            </div>
          </div>
          <span className="text-xs text-emerald-800 font-medium">Lihat</span>
        </button>

        {/* Switcher to Admin / Tenaga Kesehatan mode */}
        <div className="pt-2 border-t border-stone-200 space-y-2">
          <button
            onClick={() => {
              if (isAdmin) {
                onExitNakesMode();
              } else {
                onRequestNakesAccess();
              }
            }}
            className="w-full flex items-center justify-between p-3 rounded-lg bg-stone-50 hover:bg-stone-100 border border-stone-200 transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-800 flex items-center justify-center">
                <Stethoscope className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div>
                <h4 className="font-semibold text-stone-900 text-xs sm:text-sm">
                  {isAdmin ? 'Mode Tenaga Kesehatan (Aktif)' : 'Beralih ke Dashboard Nakes'}
                </h4>
                <p className="text-[11px] text-stone-500">
                  {isAdmin ? 'Klik untuk keluar dari akun Nakes' : 'Khusus perawat & staf pengelola klinik'}
                </p>
              </div>
            </div>
            <span className="text-xs font-medium bg-emerald-800 text-white px-2.5 py-1 rounded-md">
              {isAdmin ? 'Keluar Mode Nakes' : 'Akses Nakes'}
            </span>
          </button>

          {/* Log Out button for patient session */}
          {!user.isGuest && onLogoutPatient && (
            <button
              onClick={onLogoutPatient}
              className="w-full flex items-center justify-between p-3 rounded-lg bg-stone-50 hover:bg-stone-100 border border-stone-200 transition-colors cursor-pointer text-left text-stone-800"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-stone-200/70 text-stone-700 flex items-center justify-center">
                  <LogOut className="w-5 h-5" strokeWidth={1.75} />
                </div>
                <div>
                  <h4 className="font-semibold text-stone-900 text-xs sm:text-sm">Keluar dari Akun Ini (Log Out)</h4>
                  <p className="text-[11px] text-stone-500">Hapus sesi aktif dan amankan rekam medis di perangkat</p>
                </div>
              </div>
              <span className="text-xs font-medium bg-white border border-stone-200 text-stone-700 px-2.5 py-1 rounded-md">
                Keluar
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

