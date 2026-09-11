import React from 'react';
import { LayoutDashboard, History, Plus, GraduationCap, BookOpen } from 'lucide-react';

interface MobileBottomNavProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenQuickRecord: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenQuickRecord,
}) => {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-navy-950/95 backdrop-blur-md border-t border-navy-800 px-2 py-1.5 shadow-2xl">
      <div className="flex items-center justify-around relative">
        {/* Dashboard */}
        <button
          onClick={() => onSelectTab('dashboard')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all ${
            currentTab === 'dashboard' ? 'text-brand-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Beranda</span>
        </button>

        {/* Riwayat */}
        <button
          onClick={() => onSelectTab('records')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all ${
            currentTab === 'records' ? 'text-brand-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Riwayat</span>
        </button>

        {/* Big Center Action Button: + CATAT */}
        <div className="relative -top-5 flex flex-col items-center">
          <button
            onClick={onOpenQuickRecord}
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-brand-600 to-blue-500 text-white flex items-center justify-center shadow-lg shadow-brand-500/40 ring-4 ring-navy-950 transform active:scale-90 transition-transform"
            aria-label="Catat Pelanggaran"
          >
            <Plus className="w-7 h-7 stroke-[2.5]" />
          </button>
          <span className="text-[9px] font-extrabold text-brand-300 mt-0.5 uppercase tracking-wider">
            Catat
          </span>
        </div>

        {/* Santri */}
        <button
          onClick={() => onSelectTab('students')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all ${
            currentTab === 'students' ? 'text-brand-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <GraduationCap className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Santri</span>
        </button>

        {/* Halaqah */}
        <button
          onClick={() => onSelectTab('halaqah')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all ${
            currentTab === 'halaqah' ? 'text-brand-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Halaqah</span>
        </button>
      </div>
    </div>
  );
};
