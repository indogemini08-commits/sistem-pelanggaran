import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ThemeToggleProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  size = 'md',
  className = '',
  showLabel = false,
}) => {
  const { isDark, toggleTheme } = useTheme();

  // Dimensions with guaranteed exact pixel width and travel distance
  const dimensions = {
    sm: {
      track: 'w-[52px] h-7 p-1',
      thumb: 'w-5 h-5',
      icon: 'w-3.5 h-3.5',
      translate: isDark ? 'translate-x-6' : 'translate-x-0',
    },
    md: {
      track: 'w-[64px] h-8 p-1',
      thumb: 'w-6 h-6',
      icon: 'w-4 h-4',
      translate: isDark ? 'translate-x-8' : 'translate-x-0',
    },
    lg: {
      track: 'w-[76px] h-10 p-1.5',
      thumb: 'w-7 h-7',
      icon: 'w-4.5 h-4.5',
      translate: isDark ? 'translate-x-9' : 'translate-x-0',
    },
  }[size];

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label={isDark ? 'Beralih ke mode terang' : 'Beralih ke mode gelap'}
        onClick={toggleTheme}
        title={isDark ? 'Mode Gelap Aktif (Klik untuk Mode Terang)' : 'Mode Terang Aktif (Klik untuk Mode Gelap)'}
        className={`relative ${dimensions.track} rounded-full transition-all duration-500 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 shadow-inner cursor-pointer select-none overflow-hidden group shrink-0 ${
          isDark
            ? 'bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 border border-indigo-500/40 shadow-inner shadow-black/60 ring-1 ring-white/10'
            : 'bg-gradient-to-r from-sky-300 via-amber-100 to-sky-200 border border-amber-300/80 shadow-inner shadow-amber-900/10'
        }`}
      >
        {/* Background Atmosphere Elements */}
        {isDark ? (
          // Night Sky: Twinkling Golden & White Stars (positioned on the left)
          <div className="absolute inset-y-0 left-0 w-[55%] flex items-center justify-around px-1.5 pointer-events-none transition-opacity duration-300">
            <span
              className="w-1.5 h-1.5 rounded-full bg-amber-300/90 shadow-[0_0_4px_#fde047] animate-pulse"
              style={{ animationDuration: '1.8s' }}
            />
            <span
              className="w-1 h-1 rounded-full bg-white/90 shadow-[0_0_3px_#ffffff] animate-pulse"
              style={{ animationDuration: '2.4s' }}
            />
            <span
              className="w-1 h-1 rounded-full bg-indigo-200/90 animate-pulse"
              style={{ animationDuration: '2.0s' }}
            />
          </div>
        ) : (
          // Day Sky: Fluffy White Clouds (positioned on the right)
          <div className="absolute inset-y-0 right-0 w-[55%] flex items-center justify-end pr-1.5 pointer-events-none transition-opacity duration-300">
            <span className="w-2.5 h-1.5 rounded-full bg-white/75 mr-0.5 shadow-xs" />
            <span className="w-3.5 h-2 rounded-full bg-white/90 shadow-xs" />
          </div>
        )}

        {/* Sliding Thumb Knob (Matahari / Bulan) */}
        <div
          className={`relative ${dimensions.thumb} rounded-full transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex items-center justify-center shadow-md transform ${dimensions.translate} ${
            isDark
              ? 'bg-gradient-to-tr from-slate-900 via-indigo-950 to-indigo-800 text-amber-200 shadow-indigo-950/80 ring-1 ring-amber-300/50'
              : 'bg-gradient-to-tr from-amber-400 via-yellow-400 to-amber-300 text-amber-950 shadow-amber-500/40 ring-1 ring-amber-200'
          }`}
        >
          {isDark ? (
            <Moon
              className={`${dimensions.icon} text-amber-200 fill-amber-300/60 drop-shadow-[0_0_5px_rgba(252,211,77,0.75)] transform -rotate-12 transition-transform duration-500 group-hover:rotate-0`}
            />
          ) : (
            <Sun
              className={`${dimensions.icon} text-amber-950 fill-amber-500/40 animate-spin-slow transition-transform duration-500 group-hover:scale-110`}
            />
          )}
        </div>
      </button>

      {showLabel && (
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-200 select-none">
          {isDark ? 'Mode Gelap' : 'Mode Terang'}
        </span>
      )}
    </div>
  );
};
