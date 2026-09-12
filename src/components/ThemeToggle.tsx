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

  // Dimensions based on size
  const dimensions = {
    sm: {
      track: 'w-13 h-7 p-0.5',
      thumb: 'w-5 h-5',
      icon: 'w-3 h-3',
      translate: isDark ? 'translate-x-6' : 'translate-x-0',
      star: 'w-1 h-1',
    },
    md: {
      track: 'w-16 h-8 p-1',
      thumb: 'w-6 h-6',
      icon: 'w-3.5 h-3.5',
      translate: isDark ? 'translate-x-8' : 'translate-x-0',
      star: 'w-1.5 h-1.5',
    },
    lg: {
      track: 'w-20 h-10 p-1.5',
      thumb: 'w-7 h-7',
      icon: 'w-4 h-4',
      translate: isDark ? 'translate-x-10' : 'translate-x-0',
      star: 'w-2 h-2',
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
        className={`relative ${dimensions.track} rounded-full transition-all duration-500 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 shadow-inner cursor-pointer select-none overflow-hidden group ${
          isDark
            ? 'bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 ring-1 ring-white/10'
            : 'bg-gradient-to-r from-sky-200 via-amber-100 to-amber-200 border border-amber-300/80 shadow-amber-900/5'
        }`}
      >
        {/* Background Decorative Elements */}
        {isDark ? (
          // Night Sky: Tiny Glowing Stars
          <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none transition-opacity duration-300">
            <span className="w-1 h-1 rounded-full bg-amber-200/80 animate-pulse" style={{ animationDuration: '2s' }} />
            <span className="w-0.5 h-0.5 rounded-full bg-white/70 animate-pulse ml-2" style={{ animationDuration: '3s' }} />
            <span className="w-1 h-1 rounded-full bg-indigo-200/90 animate-pulse" style={{ animationDuration: '2.5s' }} />
          </div>
        ) : (
          // Day Sky: Subtle Cloud Puffs
          <div className="absolute inset-0 flex items-center justify-end pr-2 pointer-events-none transition-opacity duration-300">
            <span className="w-2.5 h-1.5 rounded-full bg-white/60 mr-1" />
            <span className="w-3.5 h-2 rounded-full bg-white/80 shadow-xs" />
          </div>
        )}

        {/* Sliding Thumb Knob */}
        <div
          className={`relative ${dimensions.thumb} rounded-full transition-transform duration-500 ease-spring flex items-center justify-center shadow-md transform ${dimensions.translate} ${
            isDark
              ? 'bg-gradient-to-tr from-indigo-600 via-indigo-500 to-indigo-400 text-amber-200 shadow-indigo-950/60 ring-1 ring-white/20'
              : 'bg-gradient-to-tr from-amber-400 via-yellow-400 to-amber-300 text-amber-950 shadow-amber-500/30'
          }`}
        >
          {isDark ? (
            <Moon
              className={`${dimensions.icon} text-amber-100 transform -rotate-12 transition-transform duration-500 group-hover:rotate-0`}
            />
          ) : (
            <Sun
              className={`${dimensions.icon} text-amber-900 animate-spin-slow transition-transform duration-500 group-hover:scale-110`}
            />
          )}
        </div>
      </button>

      {showLabel && (
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 select-none">
          {isDark ? 'Mode Gelap' : 'Mode Terang'}
        </span>
      )}
    </div>
  );
};
