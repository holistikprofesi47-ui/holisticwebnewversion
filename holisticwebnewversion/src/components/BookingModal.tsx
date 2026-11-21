import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  CheckCircle2,
  Clock,
  MapPin,
  User,
  Phone,
  Mail,
  FileText,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  CalendarCheck2,
  QrCode,
  Check,
  ShieldCheck
} from 'lucide-react';
import { Therapy, LocationItem, Appointment, UserProfile, ClinicConfig } from '../types';
import {
  GENERATE_TIME_SLOTS,
  isBreakTimeSlot,
  isClinicClosedOnDay,
  isDipocareLocation,
  isYogaOrTaichiTherapy,
  validateTherapyDayAndLocation
} from '../data/mockData';
import { generateBookingCode, getIndonesianDayName, formatIndonesianDate } from '../utils/storage';
import { appendAppointmentToSheet } from '../services/googleSheets';
import { appendPatientRegistrationToEndpoint } from '../services/patientRegistrationEndpoint';
import { saveAppointmentToFirestore } from '../services/firebaseFirestore';
import { saveAppointmentToRTDB } from '../services/firebaseRealtime';
import { safeStorage } from '../utils/storage';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  therapies: Therapy[];
  locations: LocationItem[];
  preSelectedTherapy?: Therapy | null;
  existingAppointments: Appointment[];
  currentUser: UserProfile;
  accessToken?: string | null;
  googleUser?: any | null;
  onAuthSuccess?: (user: any, token: string) => void;
  onBookingSuccess: (appointment: Appointment) => void;
  onGoToMyAppointments: () => void;
  onRequestAuth?: () => void;
  // Konfigurasi operasional per klinik (Fitur Buka/Tutup)
  clinicConfigs?: ClinicConfig[];
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  therapies,
  locations,
  preSelectedTherapy,
  existingAppointments,
  currentUser,
  accessToken,
  onBookingSuccess,
  onGoToMyAppointments,
  onRequestAuth,
  clinicConfigs = []
}) => {
  // Steps: 1. Terapi, 2. Lokasi, 3. Tanggal & Jam, 4. Data Pasien, 5. Ringkasan Konfirmasi, 6. Berhasil
  const [step, setStep] = useState<number>(1);

  // Form selections
  const [selectedTherapyId, setSelectedTherapyId] = useState<string>('');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');

  // User form data
  const [patientName, setPatientName] = useState<string>('');
  const [patientNumber, setPatientNumber] = useState<string>('');
  const [patientGender, setPatientGender] = useState<UserProfile['gender'] | ''>('');
  const [patientPhone, setPatientPhone] = useState<string>('');
  const [patientEmail, setPatientEmail] = useState<string>('');
  const [maritalStatus, setMaritalStatus] = useState<UserProfile['maritalStatus'] | ''>('');
  const [occupation, setOccupation] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Validation error state
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [registrationSyncStatus, setRegistrationSyncStatus] = useState<
    'idle' | 'sending' | 'sent-unverified' | 'failed'
  >('idle');

  // Created appointment result
  const [createdAppointment, setCreatedAppointment] = useState<Appointment | null>(null);

  // Initialize or reset when opened
  useEffect(() => {
    if (isOpen) {
      if (preSelectedTherapy) {
        setSelectedTherapyId(preSelectedTherapy.id);
        setStep(2);
      } else {
        setSelectedTherapyId(therapies[0]?.id || '');
        setStep(1);
      }
      setSelectedLocationId(locations[0]?.id || 'undip-nursing');

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (tomorrow.getDay() === 0) {
        tomorrow.setDate(tomorrow.getDate() + 1);
      }
      const dateStr = tomorrow.toISOString().split('T')[0];
      setSelectedDate(dateStr);
      setSelectedTimeSlot('');

      setPatientName(currentUser.name || '');
      setPatientNumber(currentUser.patientNumber || '');
      setPatientGender(currentUser.gender || '');
      setPatientPhone(currentUser.phone || '');
      setPatientEmail(currentUser.email || '');
      setMaritalStatus(currentUser.maritalStatus || '');
      setOccupation(currentUser.occupation || '');
      setNotes('');
      setErrorMessage('');
      setRegistrationSyncStatus('idle');
      setCreatedAppointment(null);
    }
  }, [isOpen, preSelectedTherapy, therapies, locations, currentUser]);

  // Helper normalisasi string jam (menghapus "WIB" dan spasi)
  const normalizeTimeSlot = (timeStr?: string): string => {
    if (!timeStr) return '';
    return timeStr.replace(/\s*WIB/gi, '').trim();
  };

  const selectedTherapy = therapies.find(t => t.id === selectedTherapyId);
  const selectedLocation = locations.find(l => l.id === selectedLocationId);

  // Ambil config klinik yang sedang dipilih (1 lookup dari array — tanpa Firestore read tambahan)
  const activeClinicConfig = useMemo(() => {
    if (!selectedLocationId || clinicConfigs.length === 0) return null;
    return clinicConfigs.find((c) => c.locationId === selectedLocationId) ?? null;
  }, [selectedLocationId, clinicConfigs]);

  // Apakah klinik sedang tutup total?
  const isClinicClosed = activeClinicConfig ? !activeClinicConfig.isClinicOpen : false;
  // Apakah booking online sedang ditutup sementara?
  const isOnlineBookingClosed = activeClinicConfig ? !activeClinicConfig.isOnlineBookingOpen : false;

  // Slot waktu tindakan dinamis sesuai jam operasional lokasi:
  // - Departemen Ilmu Keperawatan & SMPIT Cahaya Ummat: 08.00 - 15.30 WIB
  // - Dipocare Universitas Diponegoro: 08.00 - 20.30 WIB
  const allTimeSlots = useMemo(() => {
    return GENERATE_TIME_SLOTS(selectedLocationId || selectedLocation?.name);
  }, [selectedLocationId, selectedLocation]);

  // Map slot yang sudah dipesan (hanya dapat dipilih oleh 1 orang per sesi tindakan)
  const bookedSlotsMap = useMemo(() => {
    if (!selectedDate) return new Map<string, Appointment>();
    const booked = new Map<string, Appointment>();
    const cleanDate = selectedDate.split('T')[0].trim();

    existingAppointments.forEach((app) => {
      // Abaikan reservasi yang dibatalkan
      if (app.status === 'Dibatalkan') return;

      const appDate = (app.date || '').split('T')[0].trim();
      if (appDate !== cleanDate) return;

      // Cek apakah lokasi sama
      const isSameLocation =
        !selectedLocationId ||
        app.locationId === selectedLocationId ||
        (selectedLocation &&
          app.locationName &&
          (app.locationName.trim().toLowerCase() === selectedLocation.name.trim().toLowerCase() ||
            app.locationName.toLowerCase().includes(selectedLocation.name.toLowerCase()) ||
            selectedLocation.name.toLowerCase().includes(app.locationName.toLowerCase()))) ||
        (!app.locationId && !app.locationName);

      if (isSameLocation) {
        const cleanSlot = normalizeTimeSlot(app.timeSlot);
        if (cleanSlot) {
          booked.set(cleanSlot, app);
        }
      }
    });

    return booked;
  }, [selectedDate, selectedLocationId, selectedLocation, existingAppointments]);

  // Jika tanggal atau lokasi berubah dan jam terpilih ternyata sudah penuh atau di luar jam operasional lokasi, reset pilihan jam
  useEffect(() => {
    if (selectedTimeSlot) {
      const clean = normalizeTimeSlot(selectedTimeSlot);
      if (bookedSlotsMap.has(clean) || !allTimeSlots.includes(clean)) {
        setSelectedTimeSlot('');
      }
    }
  }, [selectedDate, selectedLocationId, bookedSlotsMap, selectedTimeSlot, allTimeSlots]);

  const selectedDayOfWeek = useMemo(() => {
    if (!selectedDate) return null;
    const d = new Date(selectedDate + 'T00:00:00');
    return d.getDay();
  }, [selectedDate]);

  const isSunday = useMemo(() => {
    return selectedDayOfWeek === 0;
  }, [selectedDayOfWeek]);

  // Status libur operasional klinik pada hari terpilih (Minggu di semua klinik, Sabtu di Dept Keperawatan)
  const clinicClosedDayInfo = useMemo(() => {
    return isClinicClosedOnDay(selectedDayOfWeek, selectedLocationId || selectedLocation?.name);
  }, [selectedDayOfWeek, selectedLocationId, selectedLocation]);

  // Validasi hari khusus untuk terapi Yoga & Tai Chi per lokasi klinik
  const therapyDayValidation = useMemo(() => {
    if (!selectedTherapy) return { isValid: true };
    return validateTherapyDayAndLocation(
      selectedTherapy.id || selectedTherapy.name,
      selectedLocationId || selectedLocation?.name,
      selectedDayOfWeek
    );
  }, [selectedTherapy, selectedLocationId, selectedLocation, selectedDayOfWeek]);

  const isInvalidDayForTherapy = !therapyDayValidation.isValid;
  const isDayClosed = clinicClosedDayInfo.isClosed;

  // Sinkronisasi dua arah: jika terapi, lokasi, atau tanggal berganti dan tanggal tidak valid, reset jam & pasang warning
  useEffect(() => {
    // Jika terapi adalah Yoga/Tai Chi dan lokasi sedang terpilih Dipocare, reset lokasi ke lokasi pertama yang valid
    if (
      selectedTherapy &&
      isYogaOrTaichiTherapy(selectedTherapy.id || selectedTherapy.name) &&
      isDipocareLocation(selectedLocationId || selectedLocation?.name)
    ) {
      const validLoc = locations.find((l) => !isDipocareLocation(l.id || l.name));
      if (validLoc) {
        setSelectedLocationId(validLoc.id);
      }
    }

    if (selectedDate && selectedDayOfWeek !== null) {
      const closedCheck = isClinicClosedOnDay(selectedDayOfWeek, selectedLocationId || selectedLocation?.name);
      if (closedCheck.isClosed) {
        setSelectedTimeSlot('');
        if (step === 3) {
          setErrorMessage(closedCheck.reason || 'Klinik tidak beroperasi pada hari tersebut.');
        }
        return;
      }

      if (selectedTherapy) {
        const therapyCheck = validateTherapyDayAndLocation(
          selectedTherapy.id || selectedTherapy.name,
          selectedLocationId || selectedLocation?.name,
          selectedDayOfWeek
        );
        if (!therapyCheck.isValid) {
          setSelectedTimeSlot('');
          if (step === 3) {
            setErrorMessage(therapyCheck.message || 'Hari tidak sesuai untuk sesi terapi ini.');
          }
          return;
        }
      }
    }
  }, [selectedTherapyId, selectedLocationId, selectedDate, selectedDayOfWeek, step, selectedTherapy, selectedLocation, locations]);

  const handleNextStep = () => {
    setErrorMessage('');

    if (step === 1) {
      if (!selectedTherapyId) {
        setErrorMessage('Silakan pilih salah satu terapi holistik terlebih dahulu.');
        return;
      }
      if (
        selectedTherapy &&
        isYogaOrTaichiTherapy(selectedTherapy.id || selectedTherapy.name) &&
        isDipocareLocation(selectedLocationId || selectedLocation?.name)
      ) {
        const validLoc = locations.find((l) => !isDipocareLocation(l.id || l.name));
        if (validLoc) {
          setSelectedLocationId(validLoc.id);
        }
      }
      setStep(2);
    } else if (step === 2) {
      if (!selectedLocationId) {
        setErrorMessage('Silakan pilih lokasi tindakan layanan.');
        return;
      }
      // Blokir jika terapi Yoga/Tai Chi dipasangkan dengan klinik Dipocare
      if (
        selectedTherapy &&
        isYogaOrTaichiTherapy(selectedTherapy.id || selectedTherapy.name) &&
        isDipocareLocation(selectedLocationId || selectedLocation?.name)
      ) {
        setErrorMessage('Layanan terapi Yoga dan Tai Chi tidak tersedia di klinik Dipocare Universitas Diponegoro. Silakan pilih lokasi lain.');
        return;
      }
      // Fitur 1: Blokir jika klinik yang dipilih sedang tutup total
      if (isClinicClosed) {
        const msg = activeClinicConfig?.clinicClosedMessage
          ? `Klinik ini sedang tutup: ${activeClinicConfig.clinicClosedMessage}`
          : 'Klinik yang Anda pilih sedang tutup. Silakan pilih lokasi lain atau coba lagi nanti.';
        setErrorMessage(msg);
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (!selectedDate) {
        setErrorMessage('Silakan pilih tanggal tindakan.');
        return;
      }
      if (clinicClosedDayInfo.isClosed) {
        setErrorMessage(clinicClosedDayInfo.reason || 'Layanan tidak beroperasi pada hari tersebut.');
        return;
      }
      if (isInvalidDayForTherapy && selectedTherapy) {
        setErrorMessage(therapyDayValidation.message || `Sesi terapi ${selectedTherapy.name} tidak tersedia pada hari yang dipilih.`);
        return;
      }
      // Fitur 2: Blokir jika booking online ditutup sementara
      if (isOnlineBookingClosed) {
        const msg = activeClinicConfig?.onlineBookingClosedMessage
          ? `Booking online ditutup sementara: ${activeClinicConfig.onlineBookingClosedMessage}`
          : 'Akses booking online untuk klinik ini sedang ditutup sementara oleh admin. Silakan datang langsung (walk-in) atau hubungi klinik.';
        setErrorMessage(msg);
        return;
      }
      if (!selectedTimeSlot) {
        setErrorMessage('Silakan pilih slot waktu tindakan yang masih tersedia.');
        return;
      }
      const cleanSlot = normalizeTimeSlot(selectedTimeSlot);
      if (!allTimeSlots.includes(cleanSlot)) {
        const opText = selectedLocation?.operatingHoursText || (selectedLocationId === 'undip-dipocare' ? '08.30 – 20.30 WIB' : '08.00 – 15.30 WIB');
        setErrorMessage(`Slot waktu ${cleanSlot} WIB berada di luar jam operasional ${selectedLocation?.name || 'lokasi'} (${opText}). Silakan pilih slot yang tersedia.`);
        return;
      }
      if (bookedSlotsMap.has(cleanSlot)) {
        setErrorMessage(`Slot waktu ${cleanSlot} WIB pada tanggal ini sudah dipesan oleh pasien lain. Sesi ini terbatas hanya dapat dipilih oleh 1 orang.`);
        return;
      }
      setStep(4);
    } else if (step === 4) {
      if (!patientName.trim()) {
        setErrorMessage('Nama lengkap pasien wajib diisi.');
        return;
      }
      if (!patientGender) {
        setErrorMessage('Jenis kelamin pasien wajib dipilih.');
        return;
      }
      if (!patientPhone.trim()) {
        setErrorMessage('Nomor telepon / WhatsApp wajib diisi.');
        return;
      }
      if (!maritalStatus) {
        setErrorMessage('Status perkawinan pasien wajib dipilih.');
        return;
      }
      if (!occupation.trim()) {
        setErrorMessage('Pekerjaan pasien wajib diisi.');
        return;
      }
      setStep(5);
    }
  };

  const handleConfirmBooking = async () => {
    if (!selectedTherapy || !selectedLocation) return;

    if (clinicClosedDayInfo.isClosed) {
      setErrorMessage(clinicClosedDayInfo.reason || 'Klinik tidak beroperasi pada hari tersebut.');
      setStep(3);
      return;
    }

    if (isInvalidDayForTherapy) {
      setErrorMessage(therapyDayValidation.message || 'Hari tidak sesuai untuk sesi terapi ini.');
      setStep(3);
      return;
    }

    const cleanTime = normalizeTimeSlot(selectedTimeSlot);
    if (!cleanTime) {
      setErrorMessage('Silakan pilih slot waktu tindakan terlebih dahulu.');
      setStep(3);
      return;
    }

    if (!allTimeSlots.includes(cleanTime)) {
      const opText = selectedLocation.operatingHoursText || (selectedLocation.id === 'undip-dipocare' ? '08.30 – 20.30 WIB' : '08.00 – 15.30 WIB');
      setErrorMessage(`Slot jam ${cleanTime} WIB di luar jam operasional ${selectedLocation.name} (${opText}).`);
      setStep(3);
      return;
    }

    // 1. Guard lokal: memastikan slot belum terisi
    if (bookedSlotsMap.has(cleanTime)) {
      setErrorMessage(`Maaf, slot waktu ${cleanTime} WIB pada tanggal ini sudah dipesan oleh pasien lain. Sesi ini terbatas hanya untuk 1 orang.`);
      setStep(3);
      return;
    }

    try {
      const dayName = getIndonesianDayName(selectedDate);
      const formattedTime = `${cleanTime} WIB`;

      const newAppointment: Appointment = {
        id: 'app-' + Date.now(),
        bookingCode: generateBookingCode(),
        userId: currentUser.id || 'user-guest',
        userName: patientName.trim(),
        userEmail: (patientEmail.trim() || currentUser.email || '').toLowerCase(),
        userPhone: patientPhone.trim(),
        patientNumber: patientNumber.trim() || 'HNC-PASIEN-' + Math.floor(100000 + Math.random() * 900000),
        dateOfBirth: currentUser.dateOfBirth || '',
        gender: patientGender || undefined,
        maritalStatus: maritalStatus || undefined,
        occupation: occupation.trim(),
        therapyId: selectedTherapy.id,
        therapyName: selectedTherapy.name,
        locationId: selectedLocation.id,
        locationName: selectedLocation.name,
        date: selectedDate,
        dayName: dayName,
        timeSlot: cleanTime,
        notes: notes.trim(),
        status: 'Menunggu',
        createdAt: new Date().toISOString()
      };

      setCreatedAppointment(newAppointment);

      // Simpan data ke Firebase Firestore & Realtime Database (holistik-dcd95)
      try {
        await saveAppointmentToFirestore(newAppointment);
        await saveAppointmentToRTDB(newAppointment);
      } catch (fbErr) {
        console.warn('Firebase save notice:', fbErr);
      }

      // Jalankan handler sukses & pindah ke layar e-Tiket (Step 6)
      if (typeof onBookingSuccess === 'function') {
        onBookingSuccess(newAppointment);
      }

      setStep(6);

      setRegistrationSyncStatus('sending');
      try {
        await appendPatientRegistrationToEndpoint(newAppointment);
        setRegistrationSyncStatus('sent-unverified');
      } catch (syncErr) {
        console.error('Gagal mengirim pendaftaran ke spreadsheet:', syncErr);
        setRegistrationSyncStatus('failed');
      }

      // Sync ke Google Spreadsheet jika token tersedia
      const activeToken = accessToken || safeStorage.get('hnc_google_access_token');
      if (activeToken) {
        try {
          await appendAppointmentToSheet(activeToken, newAppointment);
        } catch (syncErr) {
          console.warn('Sync sheet error:', syncErr);
        }
      }
    } catch (err: any) {
      console.error('Error confirming booking:', err);
      setErrorMessage('Terjadi kesalahan saat mengonfirmasi pendaftaran. Silakan coba lagi.');
    }
  };

  if (!isOpen) return null;

  if (currentUser.isGuest || !currentUser.email) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-sm">
        <div className="bg-white rounded-xl max-w-md w-full p-6 text-center border border-stone-200 space-y-4">
          <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/80 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <div>
            <span className="text-[11px] uppercase font-medium tracking-wider bg-stone-100 text-stone-700 px-2.5 py-0.5 rounded-md border border-stone-200">
              Autentikasi Diperlukan
            </span>
            <h3 className="text-base font-semibold tracking-tight text-stone-900 mt-2">
              Masuk atau Daftar Akun Pasien
            </h3>
            <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">
              Untuk menjaga privasi riwayat kesehatan, kepemilikan tiket jadwal, dan keamanan data rekam medis, pemesanan jadwal terapi dilakukan melalui akun pasien terdaftar.
            </p>
          </div>
          <div className="flex gap-2.5 pt-2">
            <button
              onClick={onClose}
              className="flex-1 bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 font-medium text-xs py-2.5 rounded-lg transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              onClick={() => {
                onClose();
                if (onRequestAuth) onRequestAuth();
              }}
              className="flex-2 bg-emerald-800 hover:bg-emerald-900 text-white font-medium text-xs py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <User className="w-4 h-4 text-white" strokeWidth={1.75} />
              <span>Masuk / Daftar Akun</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-xl max-w-xl w-full max-h-[92vh] flex flex-col border border-stone-200 relative overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 bg-white text-stone-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200/70 text-emerald-800 flex items-center justify-center shrink-0">
              <CalendarCheck2 className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight text-stone-900">
                Reservasi Jadwal Terapi
              </h2>
              <p className="text-xs text-stone-500">
                Layanan Keperawatan Holistik (Senin – Sabtu, {selectedLocation?.operatingHoursText || '08.00–20.30 WIB'})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white hover:bg-stone-100 text-stone-500 hover:text-stone-800 border border-stone-200 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* Step Indicator */}
        {step <= 5 && (
          <div className="px-6 py-2.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between text-[11px] font-medium text-stone-500">
            <span className={step >= 1 ? 'text-emerald-800 font-semibold' : ''}>1. Terapi</span>
            <span className="text-stone-300">/</span>
            <span className={step >= 2 ? 'text-emerald-800 font-semibold' : ''}>2. Lokasi</span>
            <span className="text-stone-300">/</span>
            <span className={step >= 3 ? 'text-emerald-800 font-semibold' : ''}>3. Waktu</span>
            <span className="text-stone-300">/</span>
            <span className={step >= 4 ? 'text-emerald-800 font-semibold' : ''}>4. Data</span>
            <span className="text-stone-300">/</span>
            <span className={step >= 5 ? 'text-emerald-800 font-semibold' : ''}>5. Konfirmasi</span>
          </div>
        )}

        {/* Modal Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 text-sm text-stone-700 space-y-4">
          {errorMessage && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5 text-amber-900 text-xs">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" strokeWidth={1.75} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: Pilih Terapi */}
          {step === 1 && (
            <div className="space-y-3">
              <h3 className="font-semibold tracking-tight text-stone-900 text-sm">
                Langkah 1: Pilih Layanan Terapi
              </h3>
              <div className="grid gap-2.5">
                {therapies.map((therapy) => {
                  const isBlockedForDipocare =
                    isDipocareLocation(selectedLocationId || selectedLocation?.name) &&
                    isYogaOrTaichiTherapy(therapy.id || therapy.name);

                  return (
                    <div
                      key={therapy.id}
                      onClick={() => {
                        if (!isBlockedForDipocare) {
                          setSelectedTherapyId(therapy.id);
                          setErrorMessage('');
                        }
                      }}
                      className={`p-3.5 rounded-xl border transition-colors flex items-center gap-3 ${
                        isBlockedForDipocare
                          ? 'border-stone-200 bg-stone-50 opacity-60 cursor-not-allowed'
                          : selectedTherapyId === therapy.id
                          ? 'border-emerald-800 bg-emerald-50/60 text-emerald-950 cursor-pointer'
                          : 'border-stone-200 hover:border-emerald-700/50 bg-white cursor-pointer'
                      }`}
                    >
                      <img
                        src={therapy.image}
                        alt={therapy.name}
                        className="w-14 h-14 rounded-lg object-cover shrink-0 border border-stone-200"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-semibold tracking-tight text-stone-900 text-sm truncate">
                              {therapy.name}
                            </h4>
                            {therapy.scheduleNote && (
                              <span className="text-[10px] bg-amber-50 text-amber-900 border border-amber-200 font-medium px-2 py-0.5 rounded-md">
                                Jumat & Sabtu
                              </span>
                            )}
                            {isBlockedForDipocare && (
                              <span className="text-[10px] bg-stone-100 text-stone-600 border border-stone-200 font-medium px-2 py-0.5 rounded-md">
                                Tidak tersedia di Dipocare
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md font-medium tabular-nums">
                            {therapy.durationText}
                          </span>
                        </div>
                        <p className="text-xs text-stone-500 line-clamp-1 mt-0.5">{therapy.tagline}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                        isBlockedForDipocare
                          ? 'border-stone-300 bg-stone-100'
                          : selectedTherapyId === therapy.id ? 'bg-emerald-800 border-emerald-800 text-white' : 'border-stone-300 bg-white'
                      }`}>
                        {!isBlockedForDipocare && selectedTherapyId === therapy.id && <Check className="w-3.5 h-3.5" strokeWidth={1.75} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: Pilih Lokasi */}
          {step === 2 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold tracking-tight text-stone-900 text-sm">
                  Langkah 2: Pilih Lokasi Klinik
                </h3>
                {selectedTherapy && (
                  <span className="text-xs text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md font-medium border border-emerald-200 tabular-nums">
                    {selectedTherapy.name} ({selectedTherapy.durationText})
                  </span>
                )}
              </div>

              <div className="grid gap-3">
                {locations.map((loc) => {
                  const locConfig = clinicConfigs.find((c) => c.locationId === loc.id);
                  const locClosed = locConfig ? !locConfig.isClinicOpen : false;
                  const locBookingClosed = locConfig ? !locConfig.isOnlineBookingOpen : false;
                  const locBlockedForTherapy =
                    isDipocareLocation(loc.id || loc.name) &&
                    isYogaOrTaichiTherapy(selectedTherapy?.id || selectedTherapy?.name);
                  const isDisabled = locClosed || locBlockedForTherapy;

                  return (
                    <div
                      key={loc.id}
                      onClick={() => { if (!isDisabled) setSelectedLocationId(loc.id); }}
                      className={`p-4 rounded-xl border transition-colors flex items-start gap-3 ${
                        isDisabled
                          ? 'border-stone-200 bg-stone-50 opacity-60 cursor-not-allowed'
                          : selectedLocationId === loc.id
                          ? 'border-emerald-800 bg-emerald-50/60 text-emerald-950 cursor-pointer'
                          : 'border-stone-200 hover:border-emerald-700/50 bg-white cursor-pointer'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isDisabled
                          ? 'bg-stone-200 text-stone-400'
                          : selectedLocationId === loc.id ? 'bg-emerald-800 text-white' : 'bg-stone-100 text-stone-600'
                      }`}>
                        <MapPin className="w-4 h-4" strokeWidth={1.75} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <h4 className="font-semibold tracking-tight text-stone-900 text-sm leading-snug">
                            {loc.name}
                          </h4>
                          {loc.operatingHoursText && (
                            <span className="text-[11px] font-medium tabular-nums px-2 py-0.5 rounded-md border bg-stone-50 text-stone-700 border-stone-200 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-emerald-800" strokeWidth={1.75} />
                              {loc.operatingHoursText}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-stone-600 mt-1 leading-relaxed">{loc.address}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {loc.buildingRoom && (
                            <span className="text-[11px] text-emerald-800 font-medium">
                              Lokasi : {loc.buildingRoom}
                            </span>
                          )}
                          {loc.id === 'undip-dipocare' ? (
                            <span className="text-[11px] bg-stone-100 text-stone-700 font-medium tabular-nums px-2 py-0.5 rounded-md border border-stone-200">
                              Jam Kerja: 08.30 – 20.30 WIB
                            </span>
                          ) : loc.id === 'undip-nursing' ? (
                            <span className="text-[11px] bg-amber-50 text-amber-900 font-medium px-2 py-0.5 rounded-md border border-amber-200">
                              Senin – Jumat (Sabtu & Minggu Libur)
                            </span>
                          ) : (
                            <span className="text-[11px] bg-stone-100 text-stone-600 font-medium tabular-nums px-2 py-0.5 rounded-md border border-stone-200">
                              Akses Sesi: 08.00 – 15.30 WIB
                            </span>
                          )}
                        </div>

                        {/* Catatan khusus hari terapi Yoga & Tai Chi per lokasi */}
                        {selectedTherapy && isYogaOrTaichiTherapy(selectedTherapy.id || selectedTherapy.name) && (
                          <div className="mt-2">
                            {isDipocareLocation(loc.id || loc.name) ? (
                              <span className="text-[11px] bg-stone-100 text-stone-700 border border-stone-200 font-medium px-2.5 py-1 rounded-md inline-flex items-center gap-1.5">
                                Layanan terapi {selectedTherapy.name} tidak tersedia di lokasi ini
                              </span>
                            ) : loc.id === 'undip-nursing' ? (
                              <span className="text-[11px] bg-amber-50 text-amber-900 border border-amber-200 font-medium px-2.5 py-1 rounded-md inline-flex items-center gap-1.5">
                                Khusus {selectedTherapy.name}: Hanya tersedia hari Jumat
                              </span>
                            ) : (
                              <span className="text-[11px] bg-emerald-50 text-emerald-900 border border-emerald-200 font-medium px-2.5 py-1 rounded-md inline-flex items-center gap-1.5">
                                Khusus {selectedTherapy.name}: Tersedia hari Jumat & Sabtu
                              </span>
                            )}
                          </div>
                        )}

                        {/* Banner status tutup klinik */}
                        {locClosed && (
                          <div className="mt-2 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-900 font-medium">
                            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" strokeWidth={1.75} />
                            <span>
                              Klinik Sedang Tutup
                              {locConfig?.clinicClosedMessage ? ` — ${locConfig.clinicClosedMessage}` : ''}
                            </span>
                          </div>
                        )}

                        {/* Banner booking online ditutup (hanya jika klinik masih buka) */}
                        {!locClosed && locBookingClosed && (
                          <div className="mt-2 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-900 font-medium">
                            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" strokeWidth={1.75} />
                            <span>
                              Booking online ditutup sementara
                              {locConfig?.onlineBookingClosedMessage ? ` — ${locConfig.onlineBookingClosedMessage}` : ''}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-1 ${
                        isDisabled
                          ? 'border-stone-300 bg-stone-100'
                          : selectedLocationId === loc.id ? 'bg-emerald-800 border-emerald-800 text-white' : 'border-stone-300 bg-white'
                      }`}>
                        {!isDisabled && selectedLocationId === loc.id && <Check className="w-3.5 h-3.5" strokeWidth={1.75} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: Pilih Tanggal & Jam */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="font-semibold tracking-tight text-stone-900 text-sm">
                  Langkah 3: Pilih Tanggal & Slot Jam
                </h3>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {selectedLocation && (
                    <span className="text-[11px] px-2.5 py-0.5 rounded-md font-medium tabular-nums border bg-stone-50 text-stone-700 border-stone-200 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-emerald-800" strokeWidth={1.75} />
                      {selectedLocation.operatingHoursText || (selectedLocation.id === 'undip-dipocare' ? '08.30 – 20.30 WIB' : '08.00 – 15.30 WIB')}
                    </span>
                  )}
                  {selectedTherapy && (
                    <span className="text-xs text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md font-medium border border-emerald-200">
                      {selectedTherapy.name}
                    </span>
                  )}
                </div>
              </div>

              {/* Fitur 2: Banner booking online ditutup */}
              {isOnlineBookingClosed && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-2.5 text-amber-900 text-xs">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" strokeWidth={1.75} />
                  <div className="leading-relaxed">
                    <span className="font-semibold block text-amber-950">Booking Online Ditutup Sementara</span>
                    {activeClinicConfig?.onlineBookingClosedMessage
                      ? activeClinicConfig.onlineBookingClosedMessage
                      : 'Akses booking online untuk klinik ini sedang ditutup sementara oleh admin. Silakan datang langsung (walk-in) atau hubungi klinik untuk informasi lebih lanjut.'
                    }
                  </div>
                </div>
              )}

              {/* Date Input */}
              <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-2">
                <label className="text-xs font-medium text-stone-700 block">
                  Pilih Tanggal Tindakan ({selectedLocationId === 'undip-nursing' ? 'Senin – Jumat' : 'Senin – Sabtu'})
                </label>
                <div className="flex items-center gap-2.5">
                  <input
                    type="date"
                    value={selectedDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setErrorMessage('');
                    }}
                    className={`w-full bg-white border rounded-lg px-3.5 py-2 text-sm font-medium tabular-nums text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800 ${
                      isInvalidDayForTherapy || isDayClosed ? 'border-amber-400' : 'border-stone-200'
                    }`}
                  />
                  <div className="shrink-0 text-right">
                    <span className={`text-xs font-medium px-3 py-2 rounded-lg border block ${
                      isInvalidDayForTherapy || isDayClosed
                        ? 'text-amber-900 bg-amber-50 border-amber-200'
                        : selectedDate
                        ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                        : 'text-stone-600 bg-stone-100 border-stone-200'
                    }`}>
                      {selectedDate ? getIndonesianDayName(selectedDate) : 'Hari'}
                    </span>
                  </div>
                </div>

                {/* Warning libur hari klinik (Sabtu di Dept Keperawatan / Minggu) */}
                {clinicClosedDayInfo.isClosed && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-2 mt-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" strokeWidth={1.75} />
                    <span>{clinicClosedDayInfo.reason}</span>
                  </div>
                )}

                {/* Warning hari khusus terapi Yoga & Tai Chi */}
                {!clinicClosedDayInfo.isClosed && isInvalidDayForTherapy && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-2 mt-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" strokeWidth={1.75} />
                    <span>{therapyDayValidation.message}</span>
                  </div>
                )}
              </div>

              {/* Kebijakan Kuota 1 Pasien per Sesi Tindakan */}
              <div className="bg-stone-100 border border-stone-200 rounded-xl p-3.5 flex items-start gap-2.5 text-stone-700 text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5" strokeWidth={1.75} />
                <div className="leading-relaxed">
                  <span className="font-semibold block text-stone-900">
                    Kuota Sesi: 1 Pasien per Slot Jam
                  </span>
                  Setiap slot waktu bersifat eksklusif untuk 1 pasien. Slot yang sudah terisi bertanda <strong className="text-stone-800">Penuh (1/1)</strong> dan tidak dapat dipilih.
                </div>
              </div>

              {/* Time Slots Grid */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-stone-700 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-emerald-800" strokeWidth={1.75} />
                    <span>Pilih Jam Tindakan ({selectedLocation?.operatingHoursText || (selectedLocationId === 'undip-dipocare' ? '08.30 – 20.30 WIB' : '08.00 – 15.30 WIB')})</span>
                  </label>
                  <span className="text-[11px] font-medium tabular-nums text-stone-500">
                    {Math.max(0, allTimeSlots.length - bookedSlotsMap.size)} dari {allTimeSlots.length} sesi tersedia
                  </span>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-56 overflow-y-auto p-2 border border-stone-200 rounded-xl bg-stone-50">
                  {allTimeSlots.map((slot) => {
                    const cleanSlot = normalizeTimeSlot(slot);
                    const isBooked = bookedSlotsMap.has(cleanSlot);
                    const isSelected = selectedTimeSlot ? normalizeTimeSlot(selectedTimeSlot) === cleanSlot : false;
                    const isSlotDisabled = isBooked || isDayClosed || isInvalidDayForTherapy;

                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={isSlotDisabled}
                        title={
                          isDayClosed
                            ? (clinicClosedDayInfo.reason || 'Klinik libur pada hari ini')
                            : isInvalidDayForTherapy
                            ? (therapyDayValidation.message || 'Hari tidak tersedia untuk terapi ini')
                            : isBooked
                            ? `Slot jam ${slot} WIB sudah dipesan (Penuh: 1/1 Orang)`
                            : `Pilih slot jam ${slot} WIB (Tersedia)`
                        }
                        onClick={() => {
                          if (isSlotDisabled) return;
                          setSelectedTimeSlot(slot);
                          setErrorMessage('');
                        }}
                        className={`py-2 px-1 text-xs rounded-lg tabular-nums font-medium transition-colors text-center flex flex-col items-center justify-center relative border ${
                          isDayClosed || isInvalidDayForTherapy
                            ? 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed'
                            : isBooked
                            ? 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed'
                            : isSelected
                            ? 'bg-emerald-800 text-white border-emerald-800 cursor-pointer'
                            : 'bg-white text-stone-800 border-stone-200 hover:border-emerald-700 cursor-pointer'
                        }`}
                      >
                        <span className={`text-xs leading-tight ${isBooked ? 'line-through text-stone-400' : ''}`}>
                          {slot}
                        </span>
                        {isBooked ? (
                          <span className="text-[9px] font-medium text-stone-400 block mt-0.5 leading-none">
                            Penuh (1/1)
                          </span>
                        ) : isSelected ? (
                          <span className="text-[9px] font-medium text-emerald-100 block mt-0.5 leading-none">
                            Terpilih
                          </span>
                        ) : (
                          <span className="text-[9px] font-normal text-stone-500 block mt-0.5 leading-none">
                            Tersedia
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Legend Keterangan Slot */}
                <div className="flex items-center justify-between text-[11px] text-stone-500 pt-2.5 px-1 flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-white border border-stone-300 inline-block"></span>
                    <span>Tersedia</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-800 inline-block"></span>
                    <span className="font-medium text-emerald-800">Terpilih</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-stone-200 border border-stone-300 inline-block"></span>
                    <span className="text-stone-500">Penuh / Nonaktif</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Isi Data Pasien */}
          {step === 4 && (
            <div className="space-y-3.5">
              <h3 className="font-semibold tracking-tight text-stone-900 text-sm">
                Langkah 4: Lengkapi Identitas Pasien
              </h3>

              <div>
                <label className="text-xs font-medium text-stone-700 block mb-1">
                  Nama Lengkap Pasien *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-2.5" strokeWidth={1.75} />
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="Contoh: Bpk. Hendra Pratama"
                    className="w-full bg-white border border-stone-200 rounded-lg pl-10 pr-4 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-stone-700 block mb-1">
                  Jenis Kelamin *
                </label>
                <select
                  required
                  value={patientGender}
                  onChange={(e) =>
                    setPatientGender(e.target.value as UserProfile['gender'] | '')
                  }
                  className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800"
                >
                  <option value="">Pilih jenis kelamin</option>
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-stone-700 block mb-1">
                  Nomor Telepon / WhatsApp Aktif *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-2.5" strokeWidth={1.75} />
                  <input
                    type="tel"
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    placeholder="0812-3456-7890"
                    className="w-full bg-white border border-stone-200 rounded-lg pl-10 pr-4 py-2 text-sm text-stone-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-stone-700 block mb-1">
                  Email Pasien
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-2.5" strokeWidth={1.75} />
                  <input
                    type="email"
                    value={patientEmail}
                    onChange={(e) => setPatientEmail(e.target.value)}
                    placeholder="contoh: pasien@gmail.com"
                    className="w-full bg-white border border-stone-200 rounded-lg pl-10 pr-4 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-stone-700 block mb-1">
                    Status Perkawinan *
                  </label>
                  <select
                    required
                    value={maritalStatus}
                    onChange={(e) => setMaritalStatus(e.target.value as UserProfile['maritalStatus'] | '')}
                    className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800"
                  >
                    <option value="">Pilih status</option>
                    <option value="Sudah menikah">Menikah</option>
                    <option value="Belum menikah">Belum Menikah</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-700 block mb-1">
                    Pekerjaan Pasien *
                  </label>
                  <input
                    type="text"
                    required
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    placeholder="Mahasiswa, Guru, Wiraswasta"
                    className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-stone-700 block mb-1">
                  Catatan Tambahan (Opsional)
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-stone-400 absolute left-3.5 top-2.5" strokeWidth={1.75} />
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Tuliskan keluhan atau preferensi lainnya..."
                    className="w-full bg-white border border-stone-200 rounded-lg pl-10 pr-4 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800 resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Ringkasan / DETAIL JADWAL */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="text-center pb-1">
                <span className="text-[11px] font-medium text-emerald-800 uppercase tracking-wider bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                  Konfirmasi Reservasi
                </span>
                <h3 className="text-base font-semibold tracking-tight text-stone-900 mt-2">
                  Rincian Jadwal Tindakan
                </h3>
                <p className="text-xs text-stone-500">
                  Periksa kembali rincian jadwal sebelum menyimpan reservasi.
                </p>
              </div>

              <div className="bg-stone-50 rounded-xl p-4 sm:p-5 border border-stone-200 space-y-3 text-xs sm:text-sm">
                <div className="flex justify-between border-b border-stone-200 pb-2">
                  <span className="text-stone-500">Nama Pasien</span>
                  <span className="font-semibold text-stone-900 text-right">{patientName}</span>
                </div>
                <div className="flex justify-between border-b border-stone-200 pb-2">
                  <span className="text-stone-500">Nomor Telepon</span>
                  <span className="font-semibold text-stone-900 tabular-nums text-right">{patientPhone}</span>
                </div>
                <div className="flex justify-between border-b border-stone-200 pb-2">
                  <span className="text-stone-500">Pilihan Terapi</span>
                  <span className="font-semibold text-emerald-800 text-right">
                    {selectedTherapy?.name} ({selectedTherapy?.durationText})
                  </span>
                </div>
                <div className="flex justify-between border-b border-stone-200 pb-2">
                  <span className="text-stone-500">Lokasi Tindakan</span>
                  <span className="font-medium text-stone-900 text-right max-w-[65%]">
                    {selectedLocation?.name}
                  </span>
                </div>
                <div className="flex justify-between border-b border-stone-200 pb-2">
                  <span className="text-stone-500">Hari & Tanggal</span>
                  <span className="font-semibold text-stone-900 tabular-nums text-right">
                    {getIndonesianDayName(selectedDate)}, {formatIndonesianDate(selectedDate)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Jam Tindakan</span>
                  <span className="font-semibold text-emerald-800 tabular-nums text-right bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                    {selectedTimeSlot.includes('WIB') ? selectedTimeSlot : `${selectedTimeSlot} WIB`}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: Jadwal Berhasil Dibuat */}
          {step === 6 && createdAppointment && (
            <div className="text-center py-3 space-y-4">
              <div className="w-12 h-12 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" strokeWidth={1.75} />
              </div>

              <div>
                <h3 className="text-lg font-semibold tracking-tight text-stone-900">
                  Reservasi Jadwal Berhasil Dibuat
                </h3>
                <p className="text-xs text-stone-600 mt-1">
                  Jadwal Anda telah tercatat dan menunggu pelayanan tenaga kesehatan.
                </p>
              </div>

              {registrationSyncStatus !== 'idle' && (
                <p
                  role="status"
                  className={`rounded-lg px-3 py-2 text-xs border ${
                    registrationSyncStatus === 'failed'
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-stone-100 border-stone-200 text-stone-600'
                  }`}
                >
                  {registrationSyncStatus === 'sending' &&
                    'Menyinkronkan data pendaftaran...'}
                  {registrationSyncStatus === 'sent-unverified' &&
                    'Permintaan sinkronisasi terkirim.'}
                  {registrationSyncStatus === 'failed' &&
                    'Jadwal tetap tersimpan di sistem.'}
                </p>
              )}

              {/* Booking Card */}
              <div className="bg-stone-50 text-stone-900 rounded-xl p-5 border border-stone-200 text-left">
                <div className="flex justify-between items-start border-b border-stone-200 pb-3 mb-3">
                  <div>
                    <span className="text-[10px] text-stone-500 font-medium tracking-wider uppercase">
                      Kode Booking
                    </span>
                    <p className="text-lg font-semibold text-emerald-800 tracking-wide tabular-nums mt-0.5">
                      {createdAppointment.bookingCode}
                    </p>
                  </div>
                  <div className="w-9 h-9 bg-emerald-50 border border-emerald-200/70 rounded-lg flex items-center justify-center text-emerald-800">
                    <QrCode className="w-5 h-5" strokeWidth={1.75} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-stone-500 text-[10px] block">Terapi</span>
                    <span className="font-semibold text-stone-900 text-sm">{createdAppointment.therapyName}</span>
                  </div>
                  <div>
                    <span className="text-stone-500 text-[10px] block">Waktu</span>
                    <span className="font-semibold text-stone-900 text-sm tabular-nums">
                      {createdAppointment.dayName}, {createdAppointment.timeSlot.includes('WIB') ? createdAppointment.timeSlot : `${createdAppointment.timeSlot} WIB`}
                    </span>
                  </div>
                  <div className="col-span-2 pt-1">
                    <span className="text-stone-500 text-[10px] block">Lokasi</span>
                    <span className="font-medium text-stone-700 text-xs">
                      {createdAppointment.locationName}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => {
                    onClose();
                    onGoToMyAppointments();
                  }}
                  className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <CalendarCheck2 className="w-4 h-4" strokeWidth={1.75} />
                  <span>Lihat Jadwal Saya</span>
                </button>

                <button
                  onClick={onClose}
                  className="w-full bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 font-medium py-2.5 px-4 rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Selesai & Kembali ke Beranda
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        {step <= 5 && (
          <div className="p-4 sm:p-5 border-t border-stone-200 bg-stone-50 flex items-center justify-between gap-3">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => {
                  setErrorMessage('');
                  setStep(step - 1);
                }}
                className="flex items-center gap-1.5 text-stone-600 hover:text-stone-900 text-xs sm:text-sm font-medium px-3 py-2 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
                <span>Kembali</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="text-stone-600 hover:text-stone-900 text-xs sm:text-sm font-medium px-3 py-2 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
            )}

            {step < 5 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs sm:text-sm font-medium px-5 py-2.5 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
              >
                <span>Lanjutkan</span>
                <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConfirmBooking}
                className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs sm:text-sm font-medium px-5 py-2.5 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" strokeWidth={1.75} />
                <span>Konfirmasi Jadwal</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
