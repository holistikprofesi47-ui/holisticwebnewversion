import React from 'react';
import { Home, Sparkles, Video as VideoIcon, CalendarClock, User, Stethoscope } from 'lucide-react';
import { ActiveTab } from '../types';

interface BottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  appointmentsCount?: number;
  isAdmin?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  appointmentsCount = 0,
  isAdmin = false
}) => {
  const navItems = [
    { id: 'home', label: 'Beranda', icon: Home },
    { id: 'therapies', label: 'Terapi', icon: Sparkles },
    { id: 'videos', label: 'Video', icon: VideoIcon },
    { id: 'appointments', label: 'Jadwal', icon: CalendarClock, badge: appointmentsCount > 0 ? appointmentsCount : undefined },
    { id: 'profile', label: 'Profil', icon: User },
  ];

  if (isAdmin) {
    navItems.push({ id: 'admin', label: 'Admin', icon: Stethoscope, badge: undefined });
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-stone-200 px-2 py-1.5 max-w-6xl mx-auto md:max-w-md md:rounded-t-xl md:left-1/2 md:-translate-x-1/2 md:bottom-0 md:border-x">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as ActiveTab)}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-lg transition-colors relative cursor-pointer ${
                isActive
                  ? 'text-emerald-800 font-medium bg-stone-100/80'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" strokeWidth={1.75} />
                {item.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2.5 bg-emerald-800 text-white text-[10px] font-medium tabular-nums px-1.5 py-0.2 rounded-full min-w-[16px] text-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-0.5 tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
