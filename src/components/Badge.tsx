import React from 'react';

interface BadgeProps {
  statusName: string;
  badgeColor?: string;
  points?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<BadgeProps> = ({
  statusName,
  badgeColor = 'blue',
  points,
  size = 'md',
}) => {
  const color = badgeColor.toLowerCase();

  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';

  if (color.includes('emerald') || color.includes('green') || statusName === 'AMAN') {
    colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-500/20';
  } else if (color.includes('amber') || color.includes('yellow') || statusName.includes('PEMBINAAN')) {
    colorClasses = 'bg-amber-50 text-amber-800 border-amber-200 ring-1 ring-amber-500/20';
  } else if (color.includes('orange') || statusName.includes('KHUSUS')) {
    colorClasses = 'bg-orange-50 text-orange-800 border-orange-200 ring-1 ring-orange-500/20';
  } else if (color.includes('rose') || statusName.includes('PERINGATAN')) {
    colorClasses = 'bg-rose-50 text-rose-800 border-rose-200 ring-1 ring-rose-500/20';
  } else if (color.includes('red') || statusName.includes('TINDAKAN')) {
    colorClasses = 'bg-red-100 text-red-900 border-red-300 ring-1 ring-red-500/30 animate-pulse';
  } else if (color.includes('blue')) {
    colorClasses = 'bg-blue-50 text-blue-800 border-blue-200 ring-1 ring-blue-500/20';
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1 font-medium',
    lg: 'text-sm px-3.5 py-1.5 font-semibold',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border shadow-sm ${sizeClasses} ${colorClasses}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />
      <span>{statusName}</span>
      {points !== undefined && (
        <span className="ml-0.5 rounded-full bg-black/5 px-1.5 py-0.2 text-[10px] font-bold">
          {points} Poin
        </span>
      )}
    </span>
  );
};
