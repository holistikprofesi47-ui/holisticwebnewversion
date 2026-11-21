import React from 'react';
import { Sparkles, ShieldCheck, UserCheck, Stethoscope, HeartHandshake, User, Users } from 'lucide-react';
import { ActiveTab, UserProfile } from '../types';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenSafety: () => void;
  isAdmin: boolean;
  onRequestNakesAccess: () => void;
  onExitNakesMode: () => void;
  pendingAppointmentsCount: number;
  currentUser?: UserProfile;
  onOpenPatientAuth?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenSafety,
  isAdmin,
  onRequestNakesAccess,
  onExitNakesMode,
  pendingAppointmentsCount,
  currentUser,
  onOpenPatientAuth
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm text-stone-900 border-b border-stone-200">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* App Logo & Name dengan Logo UNDIP */}
        <button
          onClick={() => setActiveTab('home')}
          className="flex items-center gap-3 text-left focus:outline-none group cursor-pointer"
        >
          {/* Logo UNDIP */}
          <img
            src="https://upload.wikimedia.org/wikipedia/id/2/2d/Undip.png"
            alt="Logo UNDIP"
            className="h-8 sm:h-9 w-auto object-contain shrink-0"
            referrerPolicy="no-referrer"
          />

          {/* Pemisah / Garis Pembatas Vertikal */}
          <div className="h-6 w-[1px] bg-stone-200 hidden sm:block" />

          {/* Logo & Nama Aplikasi HNC */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-800 flex items-center justify-center text-white shrink-0 transition-colors group-hover:bg-emerald-900">
              <HeartHandshake className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm sm:text-base tracking-tight text-stone-900 leading-snug">
                  Holistic Nursing Care
                </span>
                {isAdmin && (
                  <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-medium px-2 py-0.5 rounded-md uppercase tracking-wider">
                    Nakes / Admin
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 hidden sm:block leading-tight">
                Layanan Keperawatan Holistik & Komplementer
              </p>
            </div>
          </div>
        </button>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Patient Account Quick Indicator */}
          {!isAdmin && currentUser && onOpenPatientAuth && (
            <button
              onClick={onOpenPatientAuth}
              className="hidden lg:flex items-center gap-1.5 text-xs bg-stone-50 hover:bg-stone-100 text-stone-700 px-3 py-1.5 rounded-lg border border-stone-200 transition-colors cursor-pointer"
              title="Ganti / Masuk Akun Pasien"
            >
              <User className="w-4 h-4 text-emerald-800" strokeWidth={1.75} />
              <span className="font-medium truncate max-w-[120px]">{currentUser.name}</span>
            </button>
          )}

          {/* Safety Button */}
          <button
            onClick={onOpenSafety}
            className="flex items-center gap-1.5 text-xs bg-white hover:bg-stone-50 text-stone-700 px-3 py-1.5 rounded-lg border border-stone-200 transition-colors cursor-pointer"
            title="Edukasi Keselamatan Pasien"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-800" strokeWidth={1.75} />
            <span className="hidden sm:inline font-medium">Panduan Keselamatan</span>
            <span className="sm:hidden font-medium">Keselamatan</span>
          </button>

          {/* Admin Switcher Toggle */}
          <button
            onClick={() => {
              if (isAdmin) {
                onExitNakesMode();
              } else {
                onRequestNakesAccess();
              }
            }}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
              isAdmin
                ? 'bg-emerald-800 hover:bg-emerald-900 text-white font-medium border-emerald-800'
                : 'bg-white hover:bg-stone-50 text-stone-700 border-stone-200 font-medium'
            }`}
            title="Beralih ke mode Tenaga Kesehatan / Admin"
          >
            <Stethoscope className={`w-4 h-4 ${isAdmin ? 'text-white' : 'text-emerald-800'}`} strokeWidth={1.75} />
            <span className="hidden md:inline">
              {isAdmin ? 'Mode Nakes' : 'Akses Nakes'}
            </span>
          </button>

          {/* Profile Avatar button */}
          <button
            onClick={() => setActiveTab('profile')}
            className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors relative cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-emerald-800 text-white border-emerald-800'
                : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
            }`}
            title="Profil Pengguna"
          >
            <UserCheck className="w-4 h-4" strokeWidth={1.75} />
            {pendingAppointmentsCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 bg-emerald-800 text-white text-[10px] font-medium tabular-nums rounded-full flex items-center justify-center border border-white">
                {pendingAppointmentsCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
