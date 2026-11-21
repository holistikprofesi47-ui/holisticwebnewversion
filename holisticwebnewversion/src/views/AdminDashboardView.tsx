// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
import {
  Stethoscope,
  CalendarCheck,
  Users,
  Video,
  Sparkles,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  Edit2,
  Search,
  Filter,
  Eye,
  Settings,
  AlertCircle,
  FileSpreadsheet,
  Download,
  ClipboardList,
  FileText,
  ToggleLeft,
  ToggleRight,
  UserPlus,
  Store,
  MapPin,
  Phone,
  User,
  Mail,
  Save,
  X
} from 'lucide-react';
import { Appointment, Therapy, Video as VideoType, AppointmentStatus, UserProfile, ClinicalProgressNote, LocationItem, ClinicConfig } from '../types';
import { formatIndonesianDate, generateBookingCode, getIndonesianDayName } from '../utils/storage';
import { exportAppointmentsToCSV } from '../utils/exportCSV';
import { GoogleSheetsCard } from '../components/GoogleSheetsCard';
import { ClinicalProgressNotesManager } from '../components/ClinicalProgressNotesManager';
import { AdminOccupancySummaryCard } from '../components/AdminOccupancySummaryCard';
import PatientClinicalProfileModal from '../components/PatientClinicalProfileModal';
import { getAllUserProfilesFromFirestore, saveClinicConfig, saveAppointmentToFirestore } from '../services/firebaseFirestore';
import { saveAppointmentToRTDB } from '../services/firebaseRealtime';
import { getGenderBadgeClass, getPatientDisplayName } from '../utils/patientDemographics';
import {
  GENERATE_TIME_SLOTS,
  isBreakTimeSlot,
  isClinicClosedOnDay,
  isDipocareLocation,
  isYogaOrTaichiTherapy,
  validateTherapyDayAndLocation
} from '../data/mockData';

interface PatientDirectoryEntry {
  key: string;
  name: string;
  phone: string;
  patientNumber: string;
  appointmentsCount: number;
  lastDate: string;
  profile: Partial<UserProfile>;
  latestAppointment: Appointment | null;
}

interface AdminDashboardViewProps {
  appointments: Appointment[];
  therapies: Therapy[];
  videos: VideoType[];
  progressNotes: ClinicalProgressNote[];
  locations?: LocationItem[];
  clinicConfigs?: ClinicConfig[];
  googleUser: any | null;
  accessToken: string | null;
  onGoogleAuthSuccess: (user: any, token: string) => void;
  onGoogleLogout: () => void;
  onExitNakesMode: () => void;
  onUpdateAppointmentStatus: (id: string, newStatus: AppointmentStatus) => void;
  onDeleteAppointment: (id: string) => void;
  onAddTherapy: (therapy: Therapy) => void;
  onDeleteTherapy: (id: string) => void;
  onAddVideo: (video: VideoType) => void;
  onDeleteVideo: (id: string) => void;
  onAddProgressNote: (note: ClinicalProgressNote) => void | Promise<void>;
  onUpdateProgressNote: (note: ClinicalProgressNote) => void | Promise<void>;
  onDeleteProgressNote: (id: string) => void;
  onAddWalkinAppointment: (appointment: Appointment) => void | Promise<void>;
  onClinicConfigsChange: (configs: ClinicConfig[]) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  appointments,
  therapies,
  videos,
  progressNotes,
  locations,
  clinicConfigs = [],
  googleUser,
  accessToken,
  onGoogleAuthSuccess,
  onGoogleLogout,
  onExitNakesMode,
  onUpdateAppointmentStatus,
  onDeleteAppointment,
  onAddTherapy,
  onDeleteTherapy,
  onAddVideo,
  onDeleteVideo,
  onAddProgressNote,
  onUpdateProgressNote,
  onDeleteProgressNote,
  onAddWalkinAppointment,
  onClinicConfigsChange
}) => {
  const [adminTab, setAdminTab] = useState<'appointments' | 'progressNotes' | 'patients' | 'therapies' | 'videos' | 'clinicSettings'>('appointments');
  const [statusFilter, setStatusFilter] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [patientSearchQuery, setPatientSearchQuery] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [dateFilterType, setDateFilterType] = useState<'therapy' | 'registration'>('therapy');
  const [selectedPatientProfile, setSelectedPatientProfile] = useState<{
    profile: Partial<UserProfile>;
    appointment: Appointment | null;
  } | null>(null);
  const [registeredProfiles, setRegisteredProfiles] = useState<UserProfile[]>([]);
  const [statusUpdateToast, setStatusUpdateToast] = useState<{ code: string; status: string } | null>(null);
  const [appointmentToDelete, setAppointmentToDelete] = useState<Appointment | null>(null);
  const [deleteToast, setDeleteToast] = useState<{ code: string; patientName: string } | null>(null);
  const [csvExportToast, setCsvExportToast] = useState<{ count: number; filename: string } | null>(null);

  // ===== STATE: Clinic Settings (Fitur 1 & 2) =====
  // localConfigs adalah salinan yang dapat diedit sebelum disimpan ke Firestore
  const [localConfigs, setLocalConfigs] = useState<ClinicConfig[]>([]);
  const [clinicSettingsSaving, setClinicSettingsSaving] = useState<string | null>(null); // locationId yang sedang saving
  const [clinicSettingsToast, setClinicSettingsToast] = useState<string | null>(null);

  // Sinkronkan localConfigs saat clinicConfigs dari parent berubah
  useEffect(() => {
    if (clinicConfigs.length > 0) {
      setLocalConfigs(clinicConfigs.map((c) => ({ ...c })));
    } else if (locations && locations.length > 0) {
      // Fallback: buat config default jika belum ada
      setLocalConfigs(
        locations.map((loc) => ({
          locationId: loc.id,
          locationName: loc.name,
          isClinicOpen: true,
          clinicClosedMessage: '',
          isOnlineBookingOpen: true,
          onlineBookingClosedMessage: '',
          updatedAt: new Date().toISOString()
        }))
      );
    }
  }, [clinicConfigs, locations]);

  const handleSaveClinicConfig = async (locationId: string) => {
    const config = localConfigs.find((c) => c.locationId === locationId);
    if (!config) return;
    setClinicSettingsSaving(locationId);
    try {
      await saveClinicConfig(config);
      // Update parent state
      const updatedAll = localConfigs.map((c) => (c.locationId === locationId ? config : c));
      onClinicConfigsChange(updatedAll);
      setClinicSettingsToast(locationId);
      setTimeout(() => setClinicSettingsToast(null), 3000);
    } catch (err) {
      console.error('Gagal menyimpan konfigurasi klinik:', err);
    } finally {
      setClinicSettingsSaving(null);
    }
  };

  const updateLocalConfig = (locationId: string, patch: Partial<ClinicConfig>) => {
    setLocalConfigs((prev) =>
      prev.map((c) => (c.locationId === locationId ? { ...c, ...patch } : c))
    );
  };

  // ===== STATE: Walk-in Modal (Fitur 3) =====
  const [showWalkinModal, setShowWalkinModal] = useState(false);
  const [walkinSaving, setWalkinSaving] = useState(false);
  const [walkinError, setWalkinError] = useState('');
  const [walkinSuccess, setWalkinSuccess] = useState(false);

  // Form fields walk-in
  const [walkinLocationId, setWalkinLocationId] = useState(locations?.[0]?.id || '');
  const [walkinTherapyId, setWalkinTherapyId] = useState(therapies[0]?.id || '');
  const [walkinDate, setWalkinDate] = useState(new Date().toISOString().split('T')[0]);
  const [walkinTimeSlot, setWalkinTimeSlot] = useState('');
  const [walkinPatientName, setWalkinPatientName] = useState('');
  const [walkinPhone, setWalkinPhone] = useState('');
  const [walkinGender, setWalkinGender] = useState<UserProfile['gender'] | ''>('');
  const [walkinMarital, setWalkinMarital] = useState<UserProfile['maritalStatus'] | ''>('');
  const [walkinOccupation, setWalkinOccupation] = useState('');
  const [walkinNotes, setWalkinNotes] = useState('');
  const [walkinAddedBy, setWalkinAddedBy] = useState('');

  // Slot waktu untuk walk-in (sama logikanya dengan BookingModal)
  const walkinAllTimeSlots = useMemo(() => {
    return GENERATE_TIME_SLOTS(walkinLocationId);
  }, [walkinLocationId]);

  const walkinDayOfWeek = useMemo(() => {
    if (!walkinDate) return null;
    return new Date(walkinDate + 'T00:00:00').getDay();
  }, [walkinDate]);

  const walkinClosedInfo = useMemo(() => {
    return isClinicClosedOnDay(walkinDayOfWeek, walkinLocationId);
  }, [walkinDayOfWeek, walkinLocationId]);

  const walkinTherapyValidation = useMemo(() => {
    return validateTherapyDayAndLocation(walkinTherapyId, walkinLocationId, walkinDayOfWeek);
  }, [walkinTherapyId, walkinLocationId, walkinDayOfWeek]);

  // Slot yang sudah terisi pada tanggal & lokasi yang dipilih walk-in
  const walkinBookedSlotsMap = useMemo(() => {
    if (!walkinDate || !walkinLocationId) return new Map<string, boolean>();
    const booked = new Map<string, boolean>();
    appointments.forEach((app) => {
      if (app.status === 'Dibatalkan') return;
      const appDate = (app.date || '').split('T')[0].trim();
      if (appDate !== walkinDate) return;
      if (app.locationId === walkinLocationId || app.locationName === (locations?.find((l) => l.id === walkinLocationId)?.name || '')) {
        const cleanSlot = (app.timeSlot || '').replace(/\s*WIB/gi, '').trim();
        if (cleanSlot) booked.set(cleanSlot, true);
      }
    });
    return booked;
  }, [walkinDate, walkinLocationId, appointments, locations]);

  const resetWalkinForm = () => {
    setWalkinLocationId(locations?.[0]?.id || '');
    setWalkinTherapyId(therapies[0]?.id || '');
    setWalkinDate(new Date().toISOString().split('T')[0]);
    setWalkinTimeSlot('');
    setWalkinPatientName('');
    setWalkinPhone('');
    setWalkinGender('');
    setWalkinMarital('');
    setWalkinOccupation('');
    setWalkinNotes('');
    setWalkinAddedBy('');
    setWalkinError('');
    setWalkinSuccess(false);
  };

  const handleSubmitWalkin = async (e: React.FormEvent) => {
    e.preventDefault();
    setWalkinError('');

    if (!walkinPatientName.trim()) { setWalkinError('Nama pasien wajib diisi.'); return; }
    if (!walkinGender) { setWalkinError('Jenis kelamin pasien wajib dipilih.'); return; }
    if (!walkinPhone.trim()) { setWalkinError('Nomor telepon wajib diisi.'); return; }
    if (!walkinMarital) { setWalkinError('Status perkawinan wajib dipilih.'); return; }
    if (!walkinOccupation.trim()) { setWalkinError('Pekerjaan wajib diisi.'); return; }
    if (!walkinLocationId) { setWalkinError('Lokasi klinik wajib dipilih.'); return; }
    if (!walkinTherapyId) { setWalkinError('Jenis terapi wajib dipilih.'); return; }
    if (!walkinDate) { setWalkinError('Tanggal tindakan wajib diisi.'); return; }

    if (walkinClosedInfo.isClosed) {
      setWalkinError(walkinClosedInfo.reason || 'Klinik tidak beroperasi pada hari tersebut.');
      return;
    }

    if (!walkinTherapyValidation.isValid) {
      setWalkinError(walkinTherapyValidation.message || 'Hari tidak sesuai untuk sesi terapi ini.');
      return;
    }

    if (!walkinTimeSlot) { setWalkinError('Slot waktu tindakan wajib dipilih.'); return; }

    const cleanSlot = walkinTimeSlot.replace(/\s*WIB/gi, '').trim();
    if (walkinBookedSlotsMap.has(cleanSlot)) {
      setWalkinError(`Slot jam ${cleanSlot} WIB sudah terisi. Pilih slot lain.`);
      return;
    }

    const selectedTherapy = therapies.find((t) => t.id === walkinTherapyId);
    const selectedLocation = locations?.find((l) => l.id === walkinLocationId);

    setWalkinSaving(true);
    try {
      const newAppointment: Appointment = {
        id: 'walkin-' + Date.now(),
        bookingCode: generateBookingCode(),
        userId: 'walkin-' + Date.now(),
        userName: walkinPatientName.trim(),
        userPhone: walkinPhone.trim(),
        userEmail: '',
        patientNumber: 'HNC-WI-' + Math.floor(100000 + Math.random() * 900000),
        gender: walkinGender || undefined,
        maritalStatus: walkinMarital || undefined,
        occupation: walkinOccupation.trim(),
        therapyId: walkinTherapyId,
        therapyName: selectedTherapy?.name || walkinTherapyId,
        locationId: walkinLocationId,
        locationName: selectedLocation?.name || walkinLocationId,
        date: walkinDate,
        dayName: getIndonesianDayName(walkinDate),
        timeSlot: cleanSlot,
        notes: walkinNotes.trim(),
        status: 'Terjadwal',
        createdAt: new Date().toISOString(),
        registrationType: 'walk-in',
        walkinAddedBy: walkinAddedBy.trim() || 'Admin/Nakes'
      };

      await onAddWalkinAppointment(newAppointment);
      setWalkinSuccess(true);
      setTimeout(() => {
        setShowWalkinModal(false);
        resetWalkinForm();
      }, 1800);
    } catch (err: any) {
      setWalkinError('Gagal menyimpan data walk-in. Silakan coba lagi.');
      console.error('Walk-in save error:', err);
    } finally {
      setWalkinSaving(false);
    }
  };

  useEffect(() => {
    let active = true;
    getAllUserProfilesFromFirestore()
      .then((profiles) => {
        if (active) setRegisteredProfiles(profiles);
      })
      .catch((error) => console.warn('Patient profile directory load failed:', error));
    return () => {
      active = false;
    };
  }, []);

  const handleStatusChangeWithFeedback = (appId: string, bookingCode: string, newStatus: AppointmentStatus) => {
    onUpdateAppointmentStatus(appId, newStatus);
    setStatusUpdateToast({ code: bookingCode, status: newStatus });
    setTimeout(() => {
      setStatusUpdateToast(null);
    }, 4000);
  };

  const handleConfirmDelete = () => {
    if (!appointmentToDelete) return;
    const { id, bookingCode, userName } = appointmentToDelete;
    onDeleteAppointment(id);
    setAppointmentToDelete(null);
    setDeleteToast({ code: bookingCode, patientName: userName });
    setTimeout(() => {
      setDeleteToast(null);
    }, 4000);
  };

  // Add therapy modal form state
  const [showAddTherapyModal, setShowAddTherapyModal] = useState(false);
  const [newTherapyName, setNewTherapyName] = useState('');
  const [newTherapyTagline, setNewTherapyTagline] = useState('');
  const [newTherapyCategory, setNewTherapyCategory] = useState<'massage' | 'cupping' | 'exercise' | 'spa' | 'mind-body'>('massage');
  const [newTherapyDuration, setNewTherapyDuration] = useState('30 Menit');
  const [newTherapyDesc, setNewTherapyDesc] = useState('');
  const [newTherapyDef, setNewTherapyDef] = useState('');
  const [newTherapyBenefits, setNewTherapyBenefits] = useState('');
  const [newTherapyIndications, setNewTherapyIndications] = useState('');
  const [newTherapyContra, setNewTherapyContra] = useState('');
  const [newTherapyImage, setNewTherapyImage] = useState('https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80');

  // Add video modal form state
  const [showAddVideoModal, setShowAddVideoModal] = useState(false);
  const [newVidTitle, setNewVidTitle] = useState('');
  const [newVidCategory, setNewVidCategory] = useState<'Massage' | 'Cupping' | 'Akupresur' | 'Relaksasi' | 'Mind-body therapy'>('Massage');
  const [newVidYoutubeUrl, setNewVidYoutubeUrl] = useState('');
  const [newVidDuration, setNewVidDuration] = useState('10:00');
  const [newVidDesc, setNewVidDesc] = useState('');
  const [newVidAuthor, setNewVidAuthor] = useState('Tim Keperawatan Holistik');

  // Filtered Appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter((app) => {
      const matchStatus = statusFilter === 'Semua' || app.status === statusFilter;
      const filterableDate = dateFilterType === 'therapy'
        ? app.date?.split('T')[0]
        : app.createdAt?.split('T')[0];
      const matchDate = !dateFilter || filterableDate === dateFilter;
      const matchSearch =
        app.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.therapyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.bookingCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.locationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.patientNumber?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchDate && matchSearch;
    });
  }, [appointments, statusFilter, searchQuery, dateFilter, dateFilterType]);

  const patientsList = useMemo(() => {
    const map = new Map<string, PatientDirectoryEntry>();
    registeredProfiles.forEach((profile) => {
      const key = profile.id || profile.patientNumber || profile.email;
      if (!key) return;
      map.set(key, {
        key,
        name: profile.name,
        phone: profile.phone,
        patientNumber: profile.patientNumber,
        appointmentsCount: 0,
        lastDate: profile.joinedDate || '',
        profile,
        latestAppointment: null
      });
    });

    appointments.forEach((a) => {
      const matchedProfile = registeredProfiles.find((profile) =>
        profile.id === a.userId ||
        (profile.patientNumber && profile.patientNumber === a.patientNumber) ||
        (profile.email && a.userEmail && profile.email.toLowerCase() === a.userEmail.toLowerCase())
      );
      const existing = Array.from(map.values()).find((entry) =>
        (matchedProfile && entry.profile.id === matchedProfile.id) ||
        entry.profile.id === a.userId ||
        (entry.patientNumber && entry.patientNumber === a.patientNumber)
      );
      if (existing) {
        existing.appointmentsCount += 1;
        existing.profile = {
          ...existing.profile,
          dateOfBirth: existing.profile.dateOfBirth || a.dateOfBirth,
          gender: existing.profile.gender || a.gender,
          maritalStatus: existing.profile.maritalStatus || a.maritalStatus,
          occupation: existing.profile.occupation || a.occupation
        };
        if (a.date > existing.lastDate) existing.lastDate = a.date;
        if (!existing.latestAppointment || a.date >= existing.latestAppointment.date) {
          existing.latestAppointment = a;
        }
      } else {
        const key = matchedProfile?.id || a.userId || a.patientNumber || a.userName;
        const profile: Partial<UserProfile> = matchedProfile || {
          id: a.userId,
          name: a.userName,
          patientNumber: a.patientNumber,
          phone: a.userPhone,
          email: a.userEmail,
          dateOfBirth: a.dateOfBirth,
          gender: a.gender,
          maritalStatus: a.maritalStatus,
          occupation: a.occupation
        };
        map.set(key, {
          key,
          name: a.userName,
          phone: a.userPhone,
          patientNumber: a.patientNumber,
          appointmentsCount: 1,
          lastDate: a.date,
          profile,
          latestAppointment: a
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [appointments, registeredProfiles]);

  const filteredPatientsList = useMemo(() => {
    const query = patientSearchQuery.trim().toLowerCase();
    if (!query) return patientsList;

    return patientsList.filter((patient) => {
      const searchable = [
        patient.name,
        patient.patientNumber,
        patient.phone,
        patient.profile.email,
        patient.profile.gender,
        patient.profile.occupation,
        patient.profile.maritalStatus,
        patient.lastDate
      ].filter(Boolean).join(' ').toLowerCase();

      return searchable.includes(query);
    });
  }, [patientsList, patientSearchQuery]);

  const profileForAppointment = (appointment: Appointment): Partial<UserProfile> => {
    const profile = registeredProfiles.find((item) =>
      item.id === appointment.userId ||
      (item.patientNumber && item.patientNumber === appointment.patientNumber) ||
      (item.email && appointment.userEmail && item.email.toLowerCase() === appointment.userEmail.toLowerCase())
    );
    return {
      ...profile,
      id: profile?.id || appointment.userId,
      name: profile?.name || appointment.userName,
      patientNumber: profile?.patientNumber || appointment.patientNumber,
      phone: profile?.phone || appointment.userPhone,
      email: profile?.email || appointment.userEmail,
      dateOfBirth: profile?.dateOfBirth || appointment.dateOfBirth,
      gender: profile?.gender || appointment.gender,
      maritalStatus: profile?.maritalStatus || appointment.maritalStatus,
      occupation: profile?.occupation || appointment.occupation
    };
  };

  const openPatientProfile = (profile: Partial<UserProfile>, appointment: Appointment | null) => {
    setSelectedPatientProfile({ profile, appointment });
  };

  // Extract YouTube ID from string
  const extractYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : 'bRVXr5ujWDY';
  };

  const handleCreateTherapy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTherapyName.trim()) return;

    const t: Therapy = {
      id: 'therapy-' + Date.now(),
      name: newTherapyName.trim(),
      category: newTherapyCategory,
      tagline: newTherapyTagline.trim() || 'Perawatan holistik komplementer',
      description: newTherapyDesc.trim() || newTherapyTagline,
      definition: newTherapyDef.trim() || newTherapyDesc,
      benefits: newTherapyBenefits.split('\n').filter(b => b.trim().length > 0),
      indications: newTherapyIndications.split('\n').filter(i => i.trim().length > 0),
      precautions: ['Pastikan kondisi pasien stabil dan nyaman selama tindakan.'],
      contraindications: newTherapyContra.split('\n').filter(c => c.trim().length > 0),
      durationMinutes: 30,
      durationText: newTherapyDuration,
      image: newTherapyImage,
      iconName: 'Sparkles'
    };

    onAddTherapy(t);
    setShowAddTherapyModal(false);
    // reset
    setNewTherapyName('');
    setNewTherapyTagline('');
    setNewTherapyDesc('');
    setNewTherapyDef('');
  };

  const handleCreateVideo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVidTitle.trim() || !newVidYoutubeUrl.trim()) return;

    const ytId = extractYoutubeId(newVidYoutubeUrl);
    const v: VideoType = {
      id: 'vid-' + Date.now(),
      title: newVidTitle.trim(),
      category: newVidCategory,
      youtubeId: ytId,
      youtubeUrl: newVidYoutubeUrl.trim(),
      duration: newVidDuration.trim(),
      description: newVidDesc.trim() || 'Video pembelajaran keperawatan holistik.',
      thumbnail: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
      author: newVidAuthor.trim()
    };

    onAddVideo(v);
    setShowAddVideoModal(false);
    setNewVidTitle('');
    setNewVidYoutubeUrl('');
    setNewVidDesc('');
  };

  // Handler untuk ekspor seluruh data janji temu ke format file CSV
  const handleExportAllCSV = () => {
    if (!appointments || appointments.length === 0) {
      alert('Belum ada data janji temu untuk diekspor.');
      return;
    }
    const todayStr = new Date().toISOString().split('T')[0];
    const filename = `Data_Seluruh_Jadwal_Holistic_Nursing_${todayStr}.csv`;
    const success = exportAppointmentsToCSV(appointments, filename);
    if (success) {
      setCsvExportToast({ count: appointments.length, filename });
      setTimeout(() => setCsvExportToast(null), 5000);
    }
  };

  // Handler untuk ekspor data janji temu hasil filter/pencarian ke CSV
  const handleExportFilteredCSV = () => {
    if (!filteredAppointments || filteredAppointments.length === 0) {
      alert('Tidak ada data janji temu yang sesuai filter untuk diekspor.');
      return;
    }
    const todayStr = new Date().toISOString().split('T')[0];
    const filterLabel = statusFilter !== 'Semua' ? statusFilter : 'Pencarian';
    const filename = `Data_Jadwal_Filter_${filterLabel}_${todayStr}.csv`;
    const success = exportAppointmentsToCSV(filteredAppointments, filename);
    if (success) {
      setCsvExportToast({ count: filteredAppointments.length, filename });
      setTimeout(() => setCsvExportToast(null), 5000);
    }
  };

  return (
    <div className="space-y-6 pb-12 bg-stone-50">
      {/* Admin Header Banner */}
      <div className="bg-white text-stone-900 p-5 sm:p-6 rounded-xl border border-stone-200 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-semibold uppercase px-2.5 py-0.5 rounded-md tracking-wider">
              Workspace Klinis Nakes
            </span>
            <span className="text-stone-500 text-xs font-medium">
              Holistic Nursing Care
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight mt-1.5 text-stone-900">
            Dashboard Pengelola Layanan
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Pantau reservasi pasien, kelola status tindakan, ketersediaan slot, dan operasional cabang klinik.
          </p>
        </div>

        {/* Quick Stats & Logout Button in Header */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full lg:w-auto">
          <div className="flex items-center gap-3 bg-stone-50 px-3.5 py-2 rounded-lg border border-stone-200">
            <div className="text-center px-1.5">
              <span className="text-sm sm:text-base font-semibold tabular-nums text-stone-900">
                {appointments.filter(a => a.status === 'Menunggu').length}
              </span>
              <span className="text-[10px] text-stone-500 block">Menunggu</span>
            </div>
            <div className="h-6 w-px bg-stone-200" />
            <div className="text-center px-1.5">
              <span className="text-sm sm:text-base font-semibold tabular-nums text-stone-900">
                {appointments.filter(a => a.status === 'Terjadwal').length}
              </span>
              <span className="text-[10px] text-stone-500 block">Terjadwal</span>
            </div>
            <div className="h-6 w-px bg-stone-200" />
            <div className="text-center px-1.5">
              <span className="text-sm sm:text-base font-semibold tabular-nums text-stone-900">
                {appointments.filter(a => a.status === 'Selesai').length}
              </span>
              <span className="text-[10px] text-stone-500 block">Selesai</span>
            </div>
          </div>

          <button
            onClick={handleExportAllCSV}
            className="bg-white hover:bg-stone-50 text-stone-700 text-xs font-medium px-3.5 py-2.5 rounded-lg border border-stone-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            title="Ekspor seluruh data janji temu ke file CSV"
          >
            <Download className="w-4 h-4 text-stone-600" strokeWidth={1.75} />
            <span>Ekspor CSV (<span className="tabular-nums">{appointments.length}</span>)</span>
          </button>

          <button
            onClick={onExitNakesMode}
            className="bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-medium px-3.5 py-2.5 rounded-lg border border-stone-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            title="Keluar dari Portal Nakes"
          >
            <span>Keluar Mode Nakes</span>
          </button>
        </div>
      </div>

      {/* Google Sheets Integration Card */}
      <GoogleSheetsCard
        googleUser={googleUser}
        accessToken={accessToken}
        onAuthSuccess={onGoogleAuthSuccess}
        onLogout={onGoogleLogout}
        appointments={appointments}
      />

      {/* Ringkasan Janji Temu Hari Ini & Okupansi Lokasi Real-Time */}
      <AdminOccupancySummaryCard
        appointments={appointments}
        locations={locations}
        onFilterLocation={(locName) => {
          setAdminTab('appointments');
          setSearchQuery(locName);
        }}
        onFilterStatus={(status) => {
          setAdminTab('appointments');
          setStatusFilter(status);
        }}
      />

      {/* Admin Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto p-1.5 scrollbar-none bg-stone-100/80 border border-stone-200 rounded-xl">
        <button
          onClick={() => setAdminTab('appointments')}
          className={`px-3.5 py-2 rounded-lg font-medium text-xs transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            adminTab === 'appointments'
              ? 'bg-emerald-800 text-white'
              : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50 hover:text-stone-900'
          }`}
        >
          <CalendarCheck className="w-4 h-4" strokeWidth={1.75} />
          <span>Daftar Jadwal (<span className="tabular-nums">{appointments.length}</span>)</span>
        </button>

        <button
          onClick={() => setAdminTab('progressNotes')}
          className={`px-3.5 py-2 rounded-lg font-medium text-xs transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            adminTab === 'progressNotes'
              ? 'bg-emerald-800 text-white'
              : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50 hover:text-stone-900'
          }`}
        >
          <ClipboardList className="w-4 h-4" strokeWidth={1.75} />
          <span>Catatan Perkembangan (<span className="tabular-nums">{progressNotes.length}</span>)</span>
        </button>

        <button
          onClick={() => setAdminTab('patients')}
          className={`px-3.5 py-2 rounded-lg font-medium text-xs transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            adminTab === 'patients'
              ? 'bg-emerald-800 text-white'
              : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50 hover:text-stone-900'
          }`}
        >
          <Users className="w-4 h-4" strokeWidth={1.75} />
          <span>Data Pasien (<span className="tabular-nums">{patientsList.length}</span>)</span>
        </button>

        <button
          onClick={() => setAdminTab('therapies')}
          className={`px-3.5 py-2 rounded-lg font-medium text-xs transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            adminTab === 'therapies'
              ? 'bg-emerald-800 text-white'
              : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50 hover:text-stone-900'
          }`}
        >
          <Sparkles className="w-4 h-4" strokeWidth={1.75} />
          <span>Kelola Terapi (<span className="tabular-nums">{therapies.length}</span>)</span>
        </button>

        <button
          onClick={() => setAdminTab('videos')}
          className={`px-3.5 py-2 rounded-lg font-medium text-xs transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            adminTab === 'videos'
              ? 'bg-emerald-800 text-white'
              : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50 hover:text-stone-900'
          }`}
        >
          <Video className="w-4 h-4" strokeWidth={1.75} />
          <span>Kelola Video (<span className="tabular-nums">{videos.length}</span>)</span>
        </button>

        <button
          onClick={() => setAdminTab('clinicSettings')}
          className={`px-3.5 py-2 rounded-lg font-medium text-xs transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            adminTab === 'clinicSettings'
              ? 'bg-emerald-800 text-white'
              : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50 hover:text-stone-900'
          }`}
        >
          <Store className="w-4 h-4" strokeWidth={1.75} />
          <span>Pengaturan Klinik</span>
        </button>
      </div>

      {/* TAB 1: APPOINTMENTS MANAGEMENT */}
      {adminTab === 'appointments' && (
        <div className="space-y-4">
          {/* Action Header: Judul, Segmented Filter Cabang Klinik & Tombol Tambah Pasien Walk-in */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-stone-200 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold tracking-tight text-stone-900 text-sm sm:text-base flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-emerald-800" strokeWidth={1.75} />
                  <span>Daftar Jadwal Reservasi & Walk-in</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Kelola jadwal pasien booking online dan pasien datang langsung (walk-in) dalam satu sistem tersinkronisasi.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => {
                    resetWalkinForm();
                    setShowWalkinModal(true);
                  }}
                  className="bg-emerald-800 hover:bg-emerald-900 text-white font-medium text-xs px-4 py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" strokeWidth={1.75} />
                  <span>Tambah Pasien Walk-in</span>
                </button>
                <button
                  onClick={handleExportAllCSV}
                  className="bg-white hover:bg-stone-50 text-stone-700 font-medium text-xs py-2.5 px-3.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-stone-200"
                  title="Ekspor seluruh data janji temu ke file CSV"
                >
                  <Download className="w-4 h-4 text-stone-600" strokeWidth={1.75} />
                  <span>Unduh Semua CSV (<span className="tabular-nums">{appointments.length}</span>)</span>
                </button>
                {(statusFilter !== 'Semua' || searchQuery.trim() !== '' || dateFilter) && filteredAppointments.length > 0 && (
                  <button
                    onClick={handleExportFilteredCSV}
                    className="bg-white hover:bg-stone-50 text-stone-700 font-medium text-xs py-2.5 px-3 rounded-lg transition-colors border border-stone-200 flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Ekspor data janji temu yang tampil sesuai filter/pencarian"
                  >
                    <Filter className="w-4 h-4 text-stone-500" strokeWidth={1.75} />
                    <span>Unduh Filter (<span className="tabular-nums">{filteredAppointments.length}</span>)</span>
                  </button>
                )}
              </div>
            </div>

            {/* Segmented Control: Filter Cabang Klinik */}
            {locations && locations.length > 0 && (
              <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-medium text-stone-500 mr-1.5 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-stone-400" strokeWidth={1.75} />
                  Cabang Klinik:
                </span>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    !locations.some((l) => searchQuery.trim().toLowerCase() === l.name.trim().toLowerCase())
                      ? 'bg-emerald-800 text-white border border-emerald-800'
                      : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  Semua Cabang
                </button>
                {locations.map((loc) => {
                  const isLocActive = searchQuery.trim().toLowerCase() === loc.name.trim().toLowerCase();
                  return (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => setSearchQuery(isLocActive ? '' : loc.name)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        isLocActive
                          ? 'bg-emerald-800 text-white border border-emerald-800'
                          : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      {loc.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Controls: Search, Date Filter & Status Filter */}
          <div className="grid gap-3 rounded-xl border border-stone-200 bg-white p-3.5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
            <div className="grid min-w-0 gap-2.5 sm:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_minmax(260px,auto)]">
              <div className="relative min-w-0">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" strokeWidth={1.75} />
                <input
                  type="text"
                  placeholder="Cari nama pasien, kode RM, atau jenis terapi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-stone-200 rounded-lg pl-9 pr-3 py-2 text-xs text-stone-800 focus:outline-none focus:border-emerald-800"
                />
              </div>

              <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-[11px] text-stone-600">
                <span className="font-medium text-stone-700">Tanggal:</span>
                <select
                  aria-label="Jenis tanggal filter"
                  value={dateFilterType}
                  onChange={(e) => setDateFilterType(e.target.value as 'therapy' | 'registration')}
                  className="min-w-0 rounded-md bg-white border border-stone-200 px-2 py-1 font-medium text-stone-700 focus:outline-none focus:border-emerald-800"
                >
                  <option value="therapy">Terapi</option>
                  <option value="registration">Pendaftaran</option>
                </select>
                <input
                  aria-label="Filter berdasarkan tanggal"
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent font-medium text-stone-800 focus:outline-none tabular-nums"
                />
                {dateFilter && (
                  <button
                    type="button"
                    onClick={() => setDateFilter('')}
                    className="text-stone-600 hover:text-stone-900 font-medium cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {['Semua', 'Menunggu', 'Terjadwal', 'Selesai', 'Dibatalkan'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    statusFilter === st
                      ? 'bg-emerald-800 text-white border border-emerald-800'
                      : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* CSV Export Success Toast */}
          {csvExportToast && (
            <div className="bg-emerald-50 text-emerald-900 px-4 py-2.5 rounded-lg text-xs flex items-center justify-between border border-emerald-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" strokeWidth={1.75} />
                <span>
                  Berhasil mengekspor <strong>{csvExportToast.count} data janji temu</strong> ke file <strong>{csvExportToast.filename}</strong>.
                </span>
              </div>
              <span className="text-[10px] bg-white text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-md font-medium">
                File CSV Siap
              </span>
            </div>
          )}

          {/* Real-time Status Update Notification Toast */}
          {statusUpdateToast && (
            <div className="bg-emerald-50 text-emerald-900 px-4 py-2.5 rounded-lg text-xs flex items-center justify-between border border-emerald-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" strokeWidth={1.75} />
                <span>
                  Status <strong>{statusUpdateToast.code}</strong> berhasil diubah menjadi <strong>{statusUpdateToast.status}</strong> & otomatis tersinkronisasi ke Google Spreadsheet.
                </span>
              </div>
              <span className="text-[10px] bg-white text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md font-medium">
                Tersinkronisasi
              </span>
            </div>
          )}

          {/* Delete Schedule Toast */}
          {deleteToast && (
            <div className="bg-rose-50 text-rose-900 px-4 py-2.5 rounded-lg text-xs flex items-center justify-between border border-rose-200">
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-700 shrink-0" strokeWidth={1.75} />
                <span>
                  Data jadwal pasien <strong>{deleteToast.patientName}</strong> (Kode: <strong>{deleteToast.code}</strong>) berhasil dihapus dan otomatis disinkronkan ke Google Spreadsheet.
                </span>
              </div>
              <span className="text-[10px] bg-white text-rose-800 border border-rose-200 px-2 py-0.5 rounded-md font-medium">
                Data Dihapus
              </span>
            </div>
          )}

          {/* Appointments Table / List */}
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-700">
                <thead className="bg-stone-50 text-stone-500 font-semibold uppercase text-[10px] tracking-wider border-b border-stone-200">
                  <tr>
                    <th className="py-3.5 px-4">Kode & Tanggal</th>
                    <th className="py-3.5 px-4">Nama Pasien & Klasifikasi</th>
                    <th className="py-3.5 px-4">Terapi & Waktu</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Kelola Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredAppointments.map((app) => (
                    <tr key={app.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-semibold text-stone-900 tabular-nums block">
                            {app.bookingCode}
                          </span>
                          {app.registrationType === 'walk-in' ? (
                            <span className="text-[10px] bg-stone-100 text-stone-700 font-medium px-2 py-0.5 rounded-md border border-stone-200">
                              Walk-in
                            </span>
                          ) : (
                            <span className="text-[10px] bg-emerald-50/70 text-emerald-800 font-medium px-2 py-0.5 rounded-md border border-emerald-200">
                              Online
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-stone-500 block mt-0.5">
                          {app.dayName}, {formatIndonesianDate(app.date)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => openPatientProfile(profileForAppointment(app), app)}
                          className="font-semibold text-stone-900 block text-left hover:text-emerald-800 transition-colors cursor-pointer"
                        >
                          {getPatientDisplayName(app.userName, profileForAppointment(app))}
                        </button>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] text-stone-500 tabular-nums">RM: {app.patientNumber || '-'}</span>
                          {(profileForAppointment(app).gender || app.gender) && (
                            <span className={`rounded-md border px-2 py-0.5 text-[10px] font-medium ${getGenderBadgeClass(profileForAppointment(app).gender || app.gender)}`}>
                              {profileForAppointment(app).gender || app.gender}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-stone-900 block">{app.therapyName}</span>
                        <span className="inline-block mt-0.5 text-[11px] bg-stone-100 text-stone-800 border border-stone-200 font-medium px-2 py-0.5 rounded-md tabular-nums">
                          {app.timeSlot.includes('WIB') ? app.timeSlot : `${app.timeSlot} WIB`}
                        </span>
                        <span className="mt-1 block text-[11px] text-stone-500 max-w-[200px] truncate">
                          {app.locationName}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium border ${
                          app.status === 'Selesai'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : app.status === 'Terjadwal'
                            ? 'bg-teal-50 text-teal-800 border-teal-200'
                            : app.status === 'Menunggu'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {app.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openPatientProfile(profileForAppointment(app), app)}
                            className="px-2.5 py-1.5 text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-medium"
                            title="Buka profil pasien dan rekam medis perawat"
                          >
                            <ClipboardList className="w-3.5 h-3.5" strokeWidth={1.75} />
                            <span className="hidden xl:inline">Profil Klinis</span>
                          </button>
                          <select
                            value={app.status}
                            onChange={(e) =>
                              handleStatusChangeWithFeedback(app.id, app.bookingCode, e.target.value as AppointmentStatus)
                            }
                            className="bg-white border border-stone-200 rounded-lg text-xs font-medium py-1.5 px-2.5 text-stone-800 focus:outline-none focus:border-emerald-800 cursor-pointer"
                          >
                            <option value="Menunggu">Menunggu</option>
                            <option value="Terjadwal">Terjadwal</option>
                            <option value="Selesai">Selesai</option>
                            <option value="Dibatalkan">Dibatalkan</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => setAppointmentToDelete(app)}
                            className="p-1.5 text-stone-400 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Data Jadwal Pasien"
                          >
                            <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredAppointments.length === 0 && (
              <div className="text-center py-12 text-stone-500 text-xs">
                Tidak ada data jadwal yang sesuai filter pencarian.
              </div>
            )}
          </div>
        </div>
      )}

      {selectedPatientProfile && (
        <PatientClinicalProfileModal
          profile={selectedPatientProfile.profile}
          appointment={selectedPatientProfile.appointment}
          onClose={() => setSelectedPatientProfile(null)}
        />
      )}

      {/* TAB: CLINICAL PROGRESS NOTES (SOAP) */}
      {adminTab === 'progressNotes' && (
        <ClinicalProgressNotesManager
          progressNotes={progressNotes}
          onAddNote={onAddProgressNote}
          onUpdateNote={onUpdateProgressNote}
          onDeleteNote={onDeleteProgressNote}
          appointments={appointments}
          therapies={therapies}
        />
      )}

      {/* TAB 2: PATIENT DIRECTORY */}
      {adminTab === 'patients' && (
        <div className="bg-white rounded-xl border border-stone-200 p-5 sm:p-6 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold tracking-tight text-stone-900 text-base">Direktori Pasien Terdaftar</h3>
              <p className="text-xs text-stone-500">Daftar pengguna yang telah melakukan reservasi terapi dan memiliki rekam kunjungan.</p>
            </div>
            <div className="relative w-full max-w-md">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" strokeWidth={1.75} />
              <input
                type="text"
                value={patientSearchQuery}
                onChange={(e) => setPatientSearchQuery(e.target.value)}
                placeholder="Cari pasien, nomor RM, atau telepon..."
                className="w-full bg-white border border-stone-200 rounded-lg pl-9 pr-3 py-2 text-xs text-stone-800 focus:outline-none focus:border-emerald-800"
              />
            </div>
          </div>

          {filteredPatientsList.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4 py-10 text-center text-sm text-stone-500">
              Tidak ada pasien yang sesuai dengan kata kunci "{patientSearchQuery}".
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPatientsList.map((pat) => (
                <div key={pat.key} className="p-4 rounded-xl border border-stone-200 bg-stone-50/70 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-stone-900 text-sm">
                          {getPatientDisplayName(pat.name, pat.profile)}
                        </h4>
                        <span className="text-[11px] text-emerald-800 font-mono font-medium tabular-nums">
                          {pat.patientNumber || 'Pasien Umum'}
                        </span>
                        {pat.profile.gender && (
                          <span className={`ml-1.5 rounded-md border px-2 py-0.5 text-[10px] font-medium ${getGenderBadgeClass(pat.profile.gender)}`}>
                            {pat.profile.gender}
                          </span>
                        )}
                      </div>
                      <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-medium px-2 py-0.5 rounded-md tabular-nums">
                        {pat.appointmentsCount} Sesi
                      </span>
                    </div>
                    <div className="text-xs text-stone-600 space-y-0.5 pt-1">
                      <p>Telepon: <span className="font-medium text-stone-900 tabular-nums">{pat.phone}</span></p>
                      <p>Pekerjaan: <span className="font-medium text-stone-900">{pat.profile.occupation || '-'}</span></p>
                      <p>Kunjungan Terakhir: <span className="font-medium text-stone-900">{pat.lastDate ? formatIndonesianDate(pat.lastDate) : '-'}</span></p>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-stone-200 flex items-center justify-end">
                    <button
                      onClick={() => openPatientProfile(pat.profile, pat.latestAppointment)}
                      className="w-full text-center bg-white hover:bg-stone-50 text-emerald-800 border border-stone-200 hover:border-stone-300 font-medium text-xs py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ClipboardList className="w-4 h-4" strokeWidth={1.75} />
                      <span>Profil & Rekam Medis</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: THERAPIES MANAGEMENT */}
      {adminTab === 'therapies' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 sm:p-5 rounded-xl border border-stone-200">
            <div>
              <h3 className="font-semibold tracking-tight text-stone-900 text-base">Manajemen Modalitas Terapi</h3>
              <p className="text-xs text-stone-500">Tambah atau sesuaikan jenis layanan holistik.</p>
            </div>
            <button
              onClick={() => setShowAddTherapyModal(true)}
              className="bg-emerald-800 hover:bg-emerald-900 text-white font-medium text-xs px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" strokeWidth={1.75} />
              <span>Tambah Terapi Baru</span>
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {therapies.map((th) => (
              <div key={th.id} className="bg-white p-4 rounded-xl border border-stone-200 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <img
                    src={th.image}
                    alt={th.name}
                    className="w-16 h-16 rounded-lg object-cover shrink-0 border border-stone-200"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h4 className="font-semibold text-stone-900 text-sm">{th.name}</h4>
                    <span className="inline-block mt-0.5 text-[11px] text-emerald-800 font-medium bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                      {th.durationText}
                    </span>
                    <p className="text-xs text-stone-500 mt-1 line-clamp-1">{th.tagline}</p>
                  </div>
                </div>

                <button
                  onClick={() => onDeleteTherapy(th.id)}
                  className="text-stone-400 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 p-2 rounded-lg transition-colors cursor-pointer"
                  title="Hapus Terapi"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: VIDEOS MANAGEMENT */}
      {adminTab === 'videos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 sm:p-5 rounded-xl border border-stone-200">
            <div>
              <h3 className="font-semibold tracking-tight text-stone-900 text-base">Manajemen Video Edukasi</h3>
              <p className="text-xs text-stone-500">Tambah tautan YouTube materi pembelajaran keperawatan.</p>
            </div>
            <button
              onClick={() => setShowAddVideoModal(true)}
              className="bg-emerald-800 hover:bg-emerald-900 text-white font-medium text-xs px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" strokeWidth={1.75} />
              <span>Tambah Video Baru</span>
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {videos.map((vid) => (
              <div key={vid.id} className="bg-white p-4 rounded-xl border border-stone-200 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <img
                    src={vid.thumbnail}
                    alt={vid.title}
                    className="w-20 h-14 rounded-lg object-cover shrink-0 border border-stone-200"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <span className="text-[10px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                      {vid.category}
                    </span>
                    <h4 className="font-semibold text-stone-900 text-xs sm:text-sm mt-1 line-clamp-1">{vid.title}</h4>
                    <p className="text-[11px] text-stone-500 tabular-nums">Durasi: {vid.duration}</p>
                  </div>
                </div>

                <button
                  onClick={() => onDeleteVideo(vid.id)}
                  className="text-stone-400 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 p-2 rounded-lg transition-colors cursor-pointer"
                  title="Hapus Video"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: CLINIC SETTINGS (Fitur 1: Buka/Tutup Klinik & Fitur 2: Buka/Tutup Akses Booking Online) */}
      {adminTab === 'clinicSettings' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-emerald-800" strokeWidth={1.75} />
                <h3 className="font-semibold tracking-tight text-stone-900 text-base">Pengaturan Operasional Cabang Klinik</h3>
              </div>
              <p className="text-xs text-stone-500 mt-1">
                Atur status buka/tutup operasional (mis. libur tanggal merah) dan kontrol akses pendaftaran booking online mandiri per cabang lokasi.
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {localConfigs.map((config) => {
              const loc = locations?.find((l) => l.id === config.locationId);
              const isSaving = clinicSettingsSaving === config.locationId;
              const isSuccess = clinicSettingsToast === config.locationId;

              return (
                <div
                  key={config.locationId}
                  className="bg-white rounded-xl border border-stone-200 p-5 flex flex-col justify-between transition-colors"
                >
                  <div className="space-y-4">
                    {/* Header Card Klinik */}
                    <div className="border-b border-stone-200 pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-lg bg-stone-50 border border-stone-200 text-emerald-800 flex items-center justify-center shrink-0">
                            <MapPin className="w-4 h-4" strokeWidth={1.75} />
                          </div>
                          <div>
                            <h4 className="font-semibold text-stone-900 text-sm leading-snug">
                              {config.locationName || loc?.name || config.locationId}
                            </h4>
                            <span className="text-[11px] text-stone-500 font-mono">
                              ID: {config.locationId}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide border ${
                              config.isClinicOpen
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {config.isClinicOpen ? 'Klinik Buka' : 'Klinik Tutup'}
                          </span>
                          {!config.isClinicOpen ? null : !config.isOnlineBookingOpen ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                              Booking Online Tutup
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-stone-100 text-stone-700 border border-stone-200">
                              Booking Online Aktif
                            </span>
                          )}
                        </div>
                      </div>
                      {loc?.operatingHoursText && (
                        <p className="text-xs text-stone-500 mt-2 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-stone-400" strokeWidth={1.75} />
                          Jam Operasional: <span className="font-medium text-stone-800 tabular-nums">{loc.operatingHoursText}</span>
                        </p>
                      )}
                    </div>

                    {/* FITUR 1: Toggle Buka/Tutup Klinik */}
                    <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <label className="text-xs font-semibold text-stone-900 block">
                            1. Status Operasional Klinik
                          </label>
                          <span className="text-[11px] text-stone-500">
                            {config.isClinicOpen
                              ? 'Klinik beroperasi normal (pasien dapat berkunjung).'
                              : 'Klinik sedang tutup (mis. hari libur / tanggal merah).'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            updateLocalConfig(config.locationId, {
                              isClinicOpen: !config.isClinicOpen
                            })
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
                            config.isClinicOpen
                              ? 'bg-emerald-800 text-white border-emerald-800'
                              : 'bg-stone-200 text-stone-700 border-stone-300'
                          }`}
                          title={config.isClinicOpen ? 'Klik untuk menutup klinik' : 'Klik untuk membuka klinik'}
                        >
                          {config.isClinicOpen ? (
                            <ToggleRight className="w-4 h-4 text-white" strokeWidth={1.75} />
                          ) : (
                            <ToggleLeft className="w-4 h-4 text-stone-600" strokeWidth={1.75} />
                          )}
                          <span>{config.isClinicOpen ? 'Buka' : 'Tutup'}</span>
                        </button>
                      </div>

                      {!config.isClinicOpen && (
                        <div className="pt-2 space-y-1">
                          <label className="text-[11px] font-medium text-rose-700 block">
                            Pesan/Alasan Tutup (Tampil di form booking pasien):
                          </label>
                          <input
                            type="text"
                            value={config.clinicClosedMessage || ''}
                            onChange={(e) =>
                              updateLocalConfig(config.locationId, {
                                clinicClosedMessage: e.target.value
                              })
                            }
                            placeholder="Contoh: Libur Cuti Bersama Idul Fitri (Buka kembali Senin depan)"
                            className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-xs text-stone-800 focus:outline-none focus:border-emerald-800"
                          />
                        </div>
                      )}
                    </div>

                    {/* FITUR 2: Toggle Buka/Tutup Akses Booking Online */}
                    <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <label className="text-xs font-semibold text-stone-900 block">
                            2. Akses Booking Online Pasien
                          </label>
                          <span className="text-[11px] text-stone-500">
                            {config.isOnlineBookingOpen
                              ? 'Pasien bebas memilih jadwal & booking lewat website.'
                              : 'Booking via web ditutup sementara (Walk-in tetap bisa).'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            updateLocalConfig(config.locationId, {
                              isOnlineBookingOpen: !config.isOnlineBookingOpen
                            })
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
                            config.isOnlineBookingOpen
                              ? 'bg-emerald-800 text-white border-emerald-800'
                              : 'bg-stone-200 text-stone-700 border-stone-300'
                          }`}
                          title={config.isOnlineBookingOpen ? 'Klik untuk menutup booking online' : 'Klik untuk membuka booking online'}
                        >
                          {config.isOnlineBookingOpen ? (
                            <ToggleRight className="w-4 h-4 text-white" strokeWidth={1.75} />
                          ) : (
                            <ToggleLeft className="w-4 h-4 text-stone-600" strokeWidth={1.75} />
                          )}
                          <span>{config.isOnlineBookingOpen ? 'Aktif' : 'Tutup'}</span>
                        </button>
                      </div>

                      {!config.isOnlineBookingOpen && (
                        <div className="pt-2 space-y-1">
                          <label className="text-[11px] font-medium text-amber-800 block">
                            Pesan untuk Pasien (Tampil di form booking online):
                          </label>
                          <input
                            type="text"
                            value={config.onlineBookingClosedMessage || ''}
                            onChange={(e) =>
                              updateLocalConfig(config.locationId, {
                                onlineBookingClosedMessage: e.target.value
                              })
                            }
                            placeholder="Contoh: Kuota reservasi web hari ini penuh. Silakan datang langsung."
                            className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-xs text-stone-800 focus:outline-none focus:border-emerald-800"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer Card: Tombol Simpan Konfigurasi */}
                  <div className="pt-4 border-t border-stone-200 mt-4 flex items-center justify-between">
                    <span className="text-[11px] text-stone-500 tabular-nums">
                      {config.updatedAt ? `Diperbarui: ${config.updatedAt.split('T')[0]}` : 'Default'}
                    </span>
                    <div className="flex items-center gap-2">
                      {isSuccess && (
                        <span className="text-[11px] font-medium text-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                          Tersimpan
                        </span>
                      )}
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => handleSaveClinicConfig(config.locationId)}
                        className={`font-medium text-xs px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                          isSaving
                            ? 'bg-stone-200 text-stone-500 cursor-not-allowed'
                            : 'bg-emerald-800 hover:bg-emerald-900 text-white'
                        }`}
                      >
                        <Save className="w-3.5 h-3.5" strokeWidth={1.75} />
                        <span>{isSaving ? 'Menyimpan...' : 'Simpan Status'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ADD THERAPY MODAL */}
      {showAddTherapyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 border border-stone-200">
            <h3 className="font-semibold tracking-tight text-stone-900 text-base">Tambah Jenis Terapi Holistik Baru</h3>
            <form onSubmit={handleCreateTherapy} className="space-y-3 text-xs">
              <div>
                <label className="font-medium text-stone-700 block mb-1">Nama Terapi *</label>
                <input
                  type="text"
                  value={newTherapyName}
                  onChange={(e) => setNewTherapyName(e.target.value)}
                  placeholder="Contoh: Aromatherapy Massage"
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:border-emerald-800"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-medium text-stone-700 block mb-1">Kategori</label>
                  <select
                    value={newTherapyCategory}
                    onChange={(e) => setNewTherapyCategory(e.target.value as any)}
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-stone-800 bg-white focus:outline-none focus:border-emerald-800"
                  >
                    <option value="massage">Massage</option>
                    <option value="cupping">Cupping</option>
                    <option value="spa">Spa</option>
                    <option value="exercise">Exercise / Olah Tubuh</option>
                    <option value="mind-body">Mind-Body</option>
                  </select>
                </div>
                <div>
                  <label className="font-medium text-stone-700 block mb-1">Durasi Tindakan</label>
                  <input
                    type="text"
                    value={newTherapyDuration}
                    onChange={(e) => setNewTherapyDuration(e.target.value)}
                    placeholder="30 Menit"
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:border-emerald-800"
                  />
                </div>
              </div>
              <div>
                <label className="font-medium text-stone-700 block mb-1">Tagline Ringkas</label>
                <input
                  type="text"
                  value={newTherapyTagline}
                  onChange={(e) => setNewTherapyTagline(e.target.value)}
                  placeholder="Deskripsi satu kalimat yang menarik..."
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:border-emerald-800"
                />
              </div>
              <div>
                <label className="font-medium text-stone-700 block mb-1">Pengertian & Penjelasan</label>
                <textarea
                  value={newTherapyDef}
                  onChange={(e) => setNewTherapyDef(e.target.value)}
                  rows={2}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:border-emerald-800"
                />
              </div>
              <div>
                <label className="font-medium text-stone-700 block mb-1">Tujuan / Manfaat (1 baris per poin)</label>
                <textarea
                  value={newTherapyBenefits}
                  onChange={(e) => setNewTherapyBenefits(e.target.value)}
                  placeholder="Meningkatkan relaksasi&#10;Melancarkan sirkulasi darah"
                  rows={2}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:border-emerald-800"
                />
              </div>
              <div>
                <label className="font-medium text-stone-700 block mb-1">Indikasi (1 baris per poin)</label>
                <textarea
                  value={newTherapyIndications}
                  onChange={(e) => setNewTherapyIndications(e.target.value)}
                  placeholder="Otot tegang&#10;Stres pikiran"
                  rows={2}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:border-emerald-800"
                />
              </div>
              <div>
                <label className="font-medium text-stone-700 block mb-1">Kontraindikasi (1 baris per poin)</label>
                <textarea
                  value={newTherapyContra}
                  onChange={(e) => setNewTherapyContra(e.target.value)}
                  placeholder="Luka terbuka&#10;Fraktur akut"
                  rows={2}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:border-emerald-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowAddTherapyModal(false)}
                  className="px-4 py-2 rounded-lg bg-white border border-stone-300 text-stone-700 font-medium hover:bg-stone-50 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-medium transition-colors cursor-pointer"
                >
                  Simpan Terapi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD VIDEO MODAL */}
      {showAddVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 border border-stone-200">
            <h3 className="font-semibold tracking-tight text-stone-900 text-base">Tambah Video Pembelajaran</h3>
            <form onSubmit={handleCreateVideo} className="space-y-3 text-xs">
              <div>
                <label className="font-medium text-stone-700 block mb-1">Judul Video *</label>
                <input
                  type="text"
                  value={newVidTitle}
                  onChange={(e) => setNewVidTitle(e.target.value)}
                  placeholder="Contoh: Panduan Terapi Akupresur Mandiri"
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:border-emerald-800"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-medium text-stone-700 block mb-1">Kategori</label>
                  <select
                    value={newVidCategory}
                    onChange={(e) => setNewVidCategory(e.target.value as any)}
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-stone-800 bg-white focus:outline-none focus:border-emerald-800"
                  >
                    <option value="Massage">Massage</option>
                    <option value="Cupping">Cupping</option>
                    <option value="Akupresur">Akupresur</option>
                    <option value="Relaksasi">Relaksasi</option>
                    <option value="Mind-body therapy">Mind-body therapy</option>
                  </select>
                </div>
                <div>
                  <label className="font-medium text-stone-700 block mb-1">Durasi Video</label>
                  <input
                    type="text"
                    value={newVidDuration}
                    onChange={(e) => setNewVidDuration(e.target.value)}
                    placeholder="12:00"
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:border-emerald-800"
                  />
                </div>
              </div>
              <div>
                <label className="font-medium text-stone-700 block mb-1">Tautan YouTube URL *</label>
                <input
                  type="text"
                  value={newVidYoutubeUrl}
                  onChange={(e) => setNewVidYoutubeUrl(e.target.value)}
                  placeholder="https://youtu.be/..."
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:border-emerald-800"
                  required
                />
              </div>
              <div>
                <label className="font-medium text-stone-700 block mb-1">Deskripsi Singkat</label>
                <textarea
                  value={newVidDesc}
                  onChange={(e) => setNewVidDesc(e.target.value)}
                  rows={2}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:border-emerald-800"
                />
              </div>
              <div>
                <label className="font-medium text-stone-700 block mb-1">Narasumber / Instansi</label>
                <input
                  type="text"
                  value={newVidAuthor}
                  onChange={(e) => setNewVidAuthor(e.target.value)}
                  placeholder="Tim Keperawatan Komplementer UNDIP"
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:border-emerald-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowAddVideoModal(false)}
                  className="px-4 py-2 rounded-lg bg-white border border-stone-300 text-stone-700 font-medium hover:bg-stone-50 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-medium transition-colors cursor-pointer"
                >
                  Simpan Video
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL INPUT PASIEN WALK-IN (Fitur 3: Datang Langsung) */}
      {showWalkinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-xl max-w-xl w-full max-h-[92vh] flex flex-col border border-stone-200 relative overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-stone-200 bg-stone-50 text-stone-900 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold tracking-tight flex items-center gap-2 text-stone-900">
                  <UserPlus className="w-5 h-5 text-emerald-800" strokeWidth={1.75} />
                  <span>Pendaftaran Pasien Walk-in (Di Tempat)</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Input data pasien yang datang langsung; slot otomatis tersinkron dan terkunci di booking online.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowWalkinModal(false);
                  resetWalkinForm();
                }}
                className="w-8 h-8 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 text-stone-500 hover:text-stone-800 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 text-xs text-stone-700 space-y-4">
              {walkinSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg p-4 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" strokeWidth={1.75} />
                  <div>
                    <h4 className="font-semibold text-sm">Pendaftaran Walk-in Berhasil</h4>
                    <p className="text-xs text-emerald-800">
                      Pasien tercatat dengan status Terjadwal dan slot jam otomatis dikunci.
                    </p>
                  </div>
                </div>
              )}

              {walkinError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-900 rounded-lg p-3.5 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" strokeWidth={1.75} />
                  <span>{walkinError}</span>
                </div>
              )}

              <form id="walkin-form" onSubmit={handleSubmitWalkin} className="space-y-4">
                {/* 1. Pilih Lokasi & Terapi */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-medium text-stone-700 block mb-1">
                      Lokasi Klinik *
                    </label>
                    <select
                      value={walkinLocationId}
                      onChange={(e) => {
                        const newLocId = e.target.value;
                        setWalkinLocationId(newLocId);
                        setWalkinTimeSlot('');
                        // Jika lokasi diganti ke Dipocare dan terapi sedang terpilih Yoga/Tai Chi, reset ke terapi pertama yang tersedia
                        if (isDipocareLocation(newLocId) && isYogaOrTaichiTherapy(walkinTherapyId)) {
                          const firstAllowed = therapies.find((t) => !isYogaOrTaichiTherapy(t.id || t.name));
                          if (firstAllowed) {
                            setWalkinTherapyId(firstAllowed.id);
                          }
                        }
                      }}
                      className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-stone-900 focus:outline-none focus:border-emerald-800 font-medium"
                      required
                    >
                      {locations?.map((l) => {
                        const isBlockedForTherapy =
                          isYogaOrTaichiTherapy(walkinTherapyId) && isDipocareLocation(l.id || l.name);
                        return (
                          <option key={l.id} value={l.id} disabled={isBlockedForTherapy}>
                            {l.name}
                            {isBlockedForTherapy ? ' (Yoga & Tai Chi tidak tersedia)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="font-medium text-stone-700 block mb-1">
                      Jenis Terapi *
                    </label>
                    <select
                      value={walkinTherapyId}
                      onChange={(e) => {
                        const newTherapyId = e.target.value;
                        setWalkinTherapyId(newTherapyId);
                        setWalkinTimeSlot('');
                        // Jika terapi diganti ke Yoga/Tai Chi dan lokasi sedang terpilih Dipocare, reset ke lokasi pertama yang valid
                        if (isYogaOrTaichiTherapy(newTherapyId) && isDipocareLocation(walkinLocationId)) {
                          const firstAllowedLoc = locations?.find((l) => !isDipocareLocation(l.id || l.name));
                          if (firstAllowedLoc) {
                            setWalkinLocationId(firstAllowedLoc.id);
                          }
                        }
                      }}
                      className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-stone-900 focus:outline-none focus:border-emerald-800 font-medium"
                      required
                    >
                      {therapies.map((t) => {
                        const isBlockedAtDipocare =
                          isDipocareLocation(walkinLocationId) && isYogaOrTaichiTherapy(t.id || t.name);
                        return (
                          <option key={t.id} value={t.id} disabled={isBlockedAtDipocare}>
                            {t.name} ({t.durationText})
                            {isBlockedAtDipocare ? ' — Tidak tersedia di Dipocare' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {/* 2. Tanggal & Jam */}
                <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 space-y-3">
                  <div>
                    <label className="font-medium text-stone-700 block mb-1">
                      Tanggal Tindakan *
                    </label>
                    <input
                      type="date"
                      value={walkinDate}
                      onChange={(e) => {
                        setWalkinDate(e.target.value);
                        setWalkinTimeSlot('');
                      }}
                      className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-stone-900 focus:outline-none focus:border-emerald-800 font-medium tabular-nums"
                      required
                    />

                    {/* Warning libur hari klinik */}
                    {walkinClosedInfo.isClosed && (
                      <p className="text-[11px] font-medium text-rose-700 flex items-center gap-1.5 mt-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                        <span>{walkinClosedInfo.reason}</span>
                      </p>
                    )}

                    {/* Warning hari khusus terapi Yoga & Tai Chi */}
                    {!walkinClosedInfo.isClosed && !walkinTherapyValidation.isValid && (
                      <p className="text-[11px] font-medium text-rose-700 flex items-center gap-1.5 mt-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                        <span>{walkinTherapyValidation.message}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="font-medium text-stone-700 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-emerald-800" strokeWidth={1.75} />
                        <span>Pilih Jam Tindakan *</span>
                      </label>
                      <span className="text-[11px] text-stone-500 tabular-nums">
                        {Math.max(0, walkinAllTimeSlots.length - walkinBookedSlotsMap.size)} dari {walkinAllTimeSlots.length} sesi tersedia
                      </span>
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-36 overflow-y-auto p-2 border border-stone-200 rounded-lg bg-white">
                      {walkinAllTimeSlots.map((slot) => {
                        const cleanSlot = slot.replace(/\s*WIB/gi, '').trim();
                        const isBooked = walkinBookedSlotsMap.has(cleanSlot);
                        const isSelected = walkinTimeSlot.replace(/\s*WIB/gi, '').trim() === cleanSlot;
                        const isSlotDisabled = isBooked || walkinClosedInfo.isClosed || !walkinTherapyValidation.isValid;

                        return (
                          <button
                            key={slot}
                            type="button"
                            disabled={isSlotDisabled}
                            onClick={() => {
                              if (isSlotDisabled) return;
                              setWalkinTimeSlot(slot);
                              setWalkinError('');
                            }}
                            className={`py-1.5 px-1 text-[11px] rounded-lg font-medium transition-colors text-center flex flex-col items-center justify-center tabular-nums ${
                              isSlotDisabled
                                ? 'bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed line-through'
                                : isSelected
                                ? 'bg-emerald-800 text-white border border-emerald-800 cursor-pointer'
                                : 'bg-white hover:bg-stone-50 text-stone-800 border border-stone-200 cursor-pointer'
                            }`}
                          >
                            <span>{cleanSlot}</span>
                            <span className="text-[9px] font-normal leading-none mt-0.5">
                              {isBooked ? 'Penuh' : isSelected ? 'Dipilih' : 'Tersedia'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 3. Data Identitas Pasien */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-stone-900 border-b border-stone-200 pb-1.5">
                    Data Pasien Walk-in
                  </h4>

                  <div>
                    <label className="font-medium text-stone-700 block mb-1">
                      Nama Lengkap Pasien *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" strokeWidth={1.75} />
                      <input
                        type="text"
                        value={walkinPatientName}
                        onChange={(e) => setWalkinPatientName(e.target.value)}
                        placeholder="Contoh: Ny. Siti Rahmawati"
                        className="w-full bg-white border border-stone-300 rounded-lg pl-9 pr-3 py-2 text-stone-900 focus:outline-none focus:border-emerald-800"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-medium text-stone-700 block mb-1">
                        Jenis Kelamin *
                      </label>
                      <select
                        value={walkinGender}
                        onChange={(e) => setWalkinGender(e.target.value as any)}
                        className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-stone-900 focus:outline-none focus:border-emerald-800"
                        required
                      >
                        <option value="">Pilih jenis kelamin</option>
                        <option value="Laki-laki">Laki-laki</option>
                        <option value="Perempuan">Perempuan</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-medium text-stone-700 block mb-1">
                        Nomor HP / WhatsApp Aktif *
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" strokeWidth={1.75} />
                        <input
                          type="tel"
                          value={walkinPhone}
                          onChange={(e) => setWalkinPhone(e.target.value)}
                          placeholder="0812-xxxx-xxxx"
                          className="w-full bg-white border border-stone-300 rounded-lg pl-9 pr-3 py-2 text-stone-900 focus:outline-none focus:border-emerald-800 tabular-nums"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-medium text-stone-700 block mb-1">
                        Status Perkawinan *
                      </label>
                      <select
                        value={walkinMarital}
                        onChange={(e) => setWalkinMarital(e.target.value as any)}
                        className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-stone-900 focus:outline-none focus:border-emerald-800"
                        required
                      >
                        <option value="">Pilih status</option>
                        <option value="Sudah menikah">Menikah</option>
                        <option value="Belum menikah">Belum Menikah</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-medium text-stone-700 block mb-1">
                        Pekerjaan Pasien *
                      </label>
                      <input
                        type="text"
                        value={walkinOccupation}
                        onChange={(e) => setWalkinOccupation(e.target.value)}
                        placeholder="Guru, Karyawan, Wiraswasta"
                        className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-stone-900 focus:outline-none focus:border-emerald-800"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-medium text-stone-700 block mb-1">
                        Nama Nakes Penerima (Opsional)
                      </label>
                      <input
                        type="text"
                        value={walkinAddedBy}
                        onChange={(e) => setWalkinAddedBy(e.target.value)}
                        placeholder="Nama Ns. / Petugas"
                        className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-stone-900 focus:outline-none focus:border-emerald-800"
                      />
                    </div>

                    <div>
                      <label className="font-medium text-stone-700 block mb-1">
                        Catatan / Keluhan Singkat (Opsional)
                      </label>
                      <input
                        type="text"
                        value={walkinNotes}
                        onChange={(e) => setWalkinNotes(e.target.value)}
                        placeholder="Nyeri bahu kiri sejak 3 hari"
                        className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-stone-900 focus:outline-none focus:border-emerald-800"
                      />
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-stone-200 bg-stone-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setShowWalkinModal(false);
                  resetWalkinForm();
                }}
                className="px-4 py-2 rounded-lg bg-white border border-stone-300 text-stone-700 font-medium text-xs hover:bg-stone-100 transition-colors cursor-pointer"
              >
                Batal
              </button>

              <button
                type="submit"
                form="walkin-form"
                disabled={walkinSaving || walkinSuccess}
                className={`font-medium text-xs px-5 py-2.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                  walkinSaving || walkinSuccess
                    ? 'bg-stone-200 text-stone-500 cursor-not-allowed'
                    : 'bg-emerald-800 hover:bg-emerald-900 text-white'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" strokeWidth={1.75} />
                <span>{walkinSaving ? 'Menyimpan...' : walkinSuccess ? 'Tersimpan' : 'Simpan Pasien Walk-in'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog Konfirmasi Hapus Data Jadwal Pasien */}
      {appointmentToDelete && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-5 border border-stone-200">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold tracking-tight text-stone-900 text-base">
                  Hapus Data Jadwal Pasien?
                </h3>
                <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">
                  Apakah Anda yakin ingin menghapus data jadwal ini? Tindakan ini akan menghapus data pendaftaran pasien secara permanen.
                </p>
              </div>
            </div>

            {/* Target Appointment Details Summary */}
            <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 text-xs space-y-2.5">
              <div className="flex justify-between border-b border-stone-200 pb-1.5">
                <span className="text-stone-500">Kode Booking:</span>
                <span className="font-mono font-semibold text-stone-900 tabular-nums">{appointmentToDelete.bookingCode}</span>
              </div>
              <div className="flex justify-between border-b border-stone-200 pb-1.5">
                <span className="text-stone-500">Nama Pasien:</span>
                <span className="font-semibold text-stone-900">{appointmentToDelete.userName}</span>
              </div>
              <div className="flex justify-between border-b border-stone-200 pb-1.5">
                <span className="text-stone-500">Nomor Kontak:</span>
                <span className="font-medium text-stone-800 tabular-nums">{appointmentToDelete.userPhone}</span>
              </div>
              <div className="flex justify-between border-b border-stone-200 pb-1.5">
                <span className="text-stone-500">Jenis Terapi:</span>
                <span className="font-medium text-emerald-800">{appointmentToDelete.therapyName}</span>
              </div>
              <div className="flex justify-between border-b border-stone-200 pb-1.5">
                <span className="text-stone-500">Waktu Tindakan:</span>
                <span className="font-medium text-stone-800 tabular-nums">
                  {appointmentToDelete.dayName}, {formatIndonesianDate(appointmentToDelete.date)} • {appointmentToDelete.timeSlot.includes('WIB') ? appointmentToDelete.timeSlot : `${appointmentToDelete.timeSlot} WIB`}
                </span>
              </div>
              <div className="flex justify-between border-b border-stone-200 pb-1.5">
                <span className="text-stone-500">Lokasi:</span>
                <span className="font-medium text-stone-800 text-right max-w-[60%] truncate">
                  {appointmentToDelete.locationName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Status Tindakan:</span>
                <span className="font-semibold text-stone-800">{appointmentToDelete.status}</span>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[11px] text-amber-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" strokeWidth={1.75} />
              <span>
                Penghapusan ini akan otomatis memperbarui daftar rekaman jadwal di <strong>Google Spreadsheet</strong>.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setAppointmentToDelete(null)}
                className="px-4 py-2 rounded-lg bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 font-medium text-xs transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-medium text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                <span>Ya, Hapus Data Jadwal</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
