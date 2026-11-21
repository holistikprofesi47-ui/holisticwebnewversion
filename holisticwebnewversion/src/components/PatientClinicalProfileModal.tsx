import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, LockKeyhole, Save, X } from 'lucide-react';
import { Appointment, NurseClinicalRecord, UserProfile } from '../types';
import { auth } from '../services/firebaseAuth';
import { saveNurseClinicalRecord, subscribeNurseClinicalRecords } from '../services/firebaseFirestore';
import { getAgeParts, getPatientDisplayName } from '../utils/patientDemographics';

interface PatientClinicalProfileModalProps {
  profile: Partial<UserProfile>;
  appointment: Appointment | null;
  onClose: () => void;
}

const PatientClinicalProfileModal: React.FC<PatientClinicalProfileModalProps> = ({
  profile,
  appointment,
  onClose
}) => {
  const [records, setRecords] = useState<NurseClinicalRecord[]>([]);
  const [soap, setSoap] = useState({ subjective: '', objective: '', assessment: '', plan: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [notice, setNotice] = useState('');

  const patientId =
    appointment?.userId || profile.id || appointment?.patientNumber || profile.patientNumber || '';
  const patientName = appointment?.userName || profile.name || 'Pasien';
  const patientNumber = appointment?.patientNumber || profile.patientNumber || '';
  const nurseName = auth.currentUser?.displayName || auth.currentUser?.email || 'Perawat Penanggung Jawab / Ners';
  const hasFirebaseStaffSession = Boolean(auth.currentUser && !auth.currentUser.isAnonymous);
  const age = useMemo(
    () => (profile.dateOfBirth ? getAgeParts(profile.dateOfBirth) : null),
    [profile.dateOfBirth]
  );

  useEffect(() => {
    if (!patientId) return;
    return subscribeNurseClinicalRecords(
      patientId,
      setRecords,
      (error) => setErrorMessage(`Rekam medis perawat tidak dapat dimuat: ${error.message}`)
    );
  }, [patientId]);

  const handleSaveSoap = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!patientId) {
      setErrorMessage('Identitas pasien tidak lengkap; catatan tidak dapat disimpan.');
      return;
    }

    setErrorMessage('');
    setNotice('');
    setIsSaving(true);
    try {
      await saveNurseClinicalRecord({
        patientId,
        patientName,
        patientNumber,
        appointmentId: appointment?.id,
        ...soap,
        nurseName,
        profession: 'Perawat Penanggung Jawab / Ners',
        createdAt: new Date().toISOString()
      });
      setSoap({ subjective: '', objective: '', assessment: '', plan: '' });
      setNotice('Catatan SOAP tersimpan di rekam medis perawat yang bersifat rahasia.');
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `Catatan tidak tersimpan. Pastikan akun Nakes berwenang: ${error.message}`
          : 'Catatan tidak tersimpan. Pastikan akun Nakes berwenang.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const identity = [
    ['Tanggal lahir', profile.dateOfBirth || '-'],
    ['Usia', age ? `${age.years} tahun` : '-'],
    ['No. RM', patientNumber || '-'],
    ['Jenis kelamin', profile.gender || appointment?.gender || '-'],
    ['Status perkawinan', profile.maritalStatus || appointment?.maritalStatus || '-'],
    ['Pekerjaan', profile.occupation || appointment?.occupation || '-']
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-900/60 p-3 sm:p-4 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="patient-clinical-profile-title"
        className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-stone-200 bg-white p-5 sm:p-6"
      >
        <header className="mb-5 flex items-start justify-between gap-4 border-b border-stone-200 pb-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-800">
              <LockKeyhole className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span>Rekam medis rahasia - khusus Nakes</span>
            </div>
            <h2 id="patient-clinical-profile-title" className="text-base sm:text-lg font-semibold tracking-tight text-stone-900">
              Profil & Rekam Medis Pasien
            </h2>
            <p className="mt-0.5 text-xs font-medium text-stone-600">
              {getPatientDisplayName(patientName, profile)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup profil pasien"
            className="w-8 h-8 rounded-lg border border-stone-200 bg-white text-stone-500 hover:bg-stone-100 hover:text-stone-800 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </header>

        <div className="mb-5 grid gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {identity.map(([label, value]) => (
            <div key={label}>
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-stone-500">{label}</span>
              <span className="text-xs font-semibold text-stone-900 tabular-nums">{value}</span>
            </div>
          ))}
        </div>

        {!hasFirebaseStaffSession && (
          <p className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
            Untuk mengisi rekam medis rahasia, masuk menggunakan Google dengan akun Nakes yang telah terotorisasi dan tersimpan di sistem. Login kode sandi lokal saja tidak memberikan akses penyimpanan data.
          </p>
        )}

        <section className="mb-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold tracking-tight text-stone-900">Riwayat SOAP Perawat</h3>
              <p className="mt-0.5 text-[11px] text-stone-500">Pemeriksaan: {new Date().toLocaleString('id-ID')} · Perawat Penanggung Jawab / Ners</p>
            </div>
            <span className="rounded-md bg-stone-100 border border-stone-200 px-2.5 py-0.5 text-[11px] font-medium text-stone-700 tabular-nums">{records.length} catatan</span>
          </div>
          {records.length === 0 ? (
            <p className="rounded-xl border border-dashed border-stone-300 bg-stone-50/70 p-4 text-center text-xs text-stone-500">
              Belum ada catatan SOAP perawat untuk pasien ini.
            </p>
          ) : (
            <div className="max-h-56 space-y-2.5 overflow-y-auto">
              {records.map((record) => (
                <article key={record.id} className="rounded-lg border border-stone-200 bg-stone-50/60 p-3.5 text-xs space-y-1.5">
                  <p className="pb-1.5 border-b border-stone-200 font-semibold text-stone-600 tabular-nums">
                    {new Date(record.createdAt).toLocaleString('id-ID')} · <span className="text-stone-900">{record.nurseName}</span>
                  </p>
                  {([
                    ['S', 'Subjective', record.subjective],
                    ['O', 'Objective', record.objective],
                    ['A', 'Assessment', record.assessment],
                    ['P', 'Plan', record.plan]
                  ] as const).map(([initial, title, text]) => (
                    <p key={initial} className="whitespace-pre-wrap text-stone-900 leading-relaxed">
                      <strong className="font-semibold text-stone-700">{initial} · {title}:</strong> {text}
                    </p>
                  ))}
                </article>
              ))}
            </div>
          )}
        </section>

        <form onSubmit={handleSaveSoap} className="space-y-3.5">
          <h3 className="text-sm font-semibold tracking-tight text-stone-900">Catatan Klinis Baru (SOAP)</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {([
              ['subjective', 'S - Subjective', 'Keluhan dan informasi subjektif pasien'],
              ['objective', 'O - Objective', 'Temuan objektif dan tanda vital'],
              ['assessment', 'A - Assessment', 'Analisis atau penilaian klinis'],
              ['plan', 'P - Plan', 'Rencana tindakan dan edukasi']
            ] as const).map(([key, label, placeholder]) => (
              <label key={key} className="text-xs font-semibold text-stone-800">
                {label}
                <textarea
                  required
                  rows={3}
                  value={soap[key]}
                  onChange={(event) => setSoap((current) => ({ ...current, [key]: event.target.value }))}
                  placeholder={placeholder}
                  className="mt-1.5 w-full resize-y rounded-lg border border-stone-300 bg-white p-3 text-xs text-stone-900 font-normal placeholder:text-stone-400 focus:border-emerald-800 focus:outline-none transition-colors"
                />
              </label>
            ))}
          </div>

          {(errorMessage || notice) && (
            <p className={`flex items-start gap-2 rounded-lg border p-3 text-xs ${errorMessage ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
              {errorMessage ? <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" strokeWidth={1.75} /> : <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" strokeWidth={1.75} />}
              <span>{errorMessage || notice}</span>
            </p>
          )}

          <footer className="flex justify-end gap-2 border-t border-stone-200 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg bg-white border border-stone-300 px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer">
              Tutup
            </button>
            <button type="submit" disabled={isSaving || !hasFirebaseStaffSession} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-800 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-900 transition-colors cursor-pointer disabled:opacity-60">
              <Save className="h-4 w-4" strokeWidth={1.75} />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan SOAP Rahasia'}</span>
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
};

export default PatientClinicalProfileModal;
