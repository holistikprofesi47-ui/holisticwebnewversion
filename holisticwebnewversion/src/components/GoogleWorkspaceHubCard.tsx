import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Sparkles,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Database,
  Radio,
  Zap
} from 'lucide-react';
import { Appointment } from '../types';
import { googleSignIn } from '../services/firebaseAuth';
import {
  ensureSpreadsheetHeaders,
  triggerRealtimeSheetSync,
  syncAllAppointmentsToSheet,
  SPREADSHEET_URL
} from '../services/googleSheets';

interface GoogleWorkspaceHubCardProps {
  googleUser: any | null;
  accessToken: string | null;
  onAuthSuccess: (user: any, token: string) => void;
  onLogout: () => void;
  appointments: Appointment[];
}

export const GoogleWorkspaceHubCard: React.FC<GoogleWorkspaceHubCardProps> = ({
  googleUser,
  accessToken,
  onAuthSuccess,
  onLogout,
  appointments
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [spreadsheetUrl] = useState<string>(SPREADSHEET_URL);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Listen to background real-time sync events
  useEffect(() => {
    const handleSyncEvent = (e: any) => {
      const detail = e?.detail;
      if (detail?.success !== false) {
        setLastSyncTime(
          new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB'
        );
      } else if (detail?.error) {
        setStatusMessage({
          type: 'error',
          text: `Sinkronisasi otomatis: ${detail.error}`
        });
      }
    };

    window.addEventListener('hnc_sheet_synced', handleSyncEvent);
    return () => window.removeEventListener('hnc_sheet_synced', handleSyncEvent);
  }, []);

  const handleConnectGoogle = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const res = await googleSignIn();
      if (res && res.accessToken) {
        onAuthSuccess(res.user, res.accessToken);
        setStatusMessage({
          type: 'success',
          text: 'Google Workspace (Google Sheets) berhasil terhubung!'
        });
      }
    } catch (err: any) {
      console.error('Google Workspace Connect Error:', err);
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Gagal menghubungkan Google Sheets.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncSheets = async () => {
    if (!accessToken) {
      await handleConnectGoogle();
      return;
    }
    setIsLoading(true);
    setStatusMessage(null);
    try {
      await ensureSpreadsheetHeaders(accessToken);
      const count = await syncAllAppointmentsToSheet(accessToken, appointments);
      setLastSyncTime(
        new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB'
      );
      setStatusMessage({
        type: 'success',
        text: `Sinkronisasi Google Sheets berhasil! Total ${count} baris data reservasi pasien telah diperbarui.`
      });
    } catch (err: any) {
      console.error('Sheet sync error:', err);
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Gagal melakukan sinkronisasi Google Sheets.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl p-5 sm:p-6 border border-stone-200 space-y-4">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-semibold tracking-wider bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200">
                Google Sheets Integration
              </span>
              <span className="text-[10px] text-stone-500">• Sinkronisasi Tabel Real-Time</span>
            </div>
            <h3 className="font-semibold tracking-tight text-stone-900 text-sm sm:text-base mt-0.5">
              Integrasi Google Sheets (Sinkronisasi Tabel Real-Time)
            </h3>
          </div>
        </div>

        {/* Connect / User status button */}
        {accessToken ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" strokeWidth={1.75} />
              <span>Terhubung ({googleUser?.email || 'Akun Google Nakes'})</span>
            </div>
            <button
              onClick={onLogout}
              className="text-stone-500 hover:text-rose-700 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 transition-colors cursor-pointer"
            >
              Putuskan
            </button>
          </div>
        ) : (
          <button
            onClick={handleConnectGoogle}
            disabled={isLoading}
            className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-100" strokeWidth={1.75} />
            <span>{isLoading ? 'Menghubungkan...' : 'Hubungkan Google Sheets'}</span>
          </button>
        )}
      </div>

      {/* Status Feedback */}
      {statusMessage && (
        <div
          className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-700" strokeWidth={1.75} />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-700" strokeWidth={1.75} />
          )}
          <span className="font-medium">{statusMessage.text}</span>
        </div>
      )}

      {/* Google Sheets Panel */}
      <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                <Radio className="w-3 h-3 text-emerald-700" strokeWidth={1.75} />
                Live Sync Aktif
              </span>
              {lastSyncTime && (
                <span className="text-[11px] text-stone-500 font-medium">
                  Terakhir diperbarui: <strong className="font-semibold text-stone-900 tabular-nums">{lastSyncTime}</strong>
                </span>
              )}
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Setiap kali pasien memesan jadwal, perawat memperbarui status, atau membatalkan sesi, data langsung disinkronkan secara otomatis ke lembar spreadsheet resmi klinik.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="bg-white px-3 py-2 rounded-lg border border-stone-200 text-center">
              <span className="text-sm font-semibold tabular-nums text-stone-900 block">{appointments.length}</span>
              <span className="text-[10px] text-stone-500">Total Baris</span>
            </div>
            <div className="bg-white px-3 py-2 rounded-lg border border-stone-200 text-center">
              <span className="text-sm font-semibold tabular-nums text-stone-900 block">
                {appointments.filter(a => a.status === 'Terjadwal').length}
              </span>
              <span className="text-[10px] text-stone-500">Terjadwal</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2.5 border-t border-stone-200">
          <button
            type="button"
            onClick={handleSyncSheets}
            disabled={isLoading}
            className="w-full sm:w-auto bg-emerald-800 hover:bg-emerald-900 text-white font-medium text-xs py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} strokeWidth={1.75} />
            <span>{isLoading ? 'Sedang Menyinkronkan...' : 'Sinkronkan Tabel Sekarang (Manual)'}</span>
          </button>

          <a
            href={spreadsheetUrl}
            target="_blank"
            rel="noreferrer"
            className="w-full sm:w-auto bg-white hover:bg-stone-100 border border-stone-200 text-stone-800 font-medium text-xs py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-4 h-4 text-emerald-800" strokeWidth={1.75} />
            <span>Buka Google Spreadsheet</span>
          </a>
        </div>
      </div>
    </div>
  );
};
