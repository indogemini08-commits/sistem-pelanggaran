import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X, AlertCircle, Trash2, CheckCircle2 } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Ya, Lanjutkan',
  cancelLabel = 'Batal',
  isDestructive = true,
  isLoading = false,
  error,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto animate-scale-in">
      <div className="relative w-full max-w-md m-auto h-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] flex flex-col bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden">
        {/* Header with gradient tint */}
        <div
          className={`p-5 sm:p-6 border-b shrink-0 flex items-start justify-between ${
            isDestructive
              ? 'bg-rose-50/60 border-rose-100'
              : 'bg-brand-50/60 border-brand-100'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-3 rounded-2xl shrink-0 shadow-sm ${
                isDestructive
                  ? 'bg-rose-100 text-rose-600 ring-4 ring-rose-50'
                  : 'bg-brand-100 text-brand-600 ring-4 ring-brand-50'
              }`}
            >
              {isDestructive ? (
                <Trash2 className="w-5 h-5 sm:w-6 sm:h-6" />
              ) : (
                <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  {title}
                </h3>
              </div>
              <p
                className={`text-xs font-semibold mt-0.5 ${
                  isDestructive ? 'text-rose-600' : 'text-brand-600'
                }`}
              >
                {isDestructive ? '⚠️ Peringatan Hapus Data Permanen' : 'Konfirmasi Tindakan Sistem'}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-white/80 transition-colors disabled:opacity-50"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Message Content */}
        <div className="p-5 sm:p-6 overflow-y-auto pr-2 space-y-3 flex-1">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm rounded-xl flex items-start gap-2.5 animate-scale-in">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <div className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200">
            {message}
          </div>

          {isDestructive && (
            <p className="text-[11px] text-slate-400 italic flex items-center gap-1.5 px-1">
              <span>* Data yang telah dihapus akan dihilangkan dari basis data sistem dan audit log akan mencatat aktivitas ini.</span>
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-4 sm:p-5 bg-slate-50/50 flex items-center justify-end gap-3 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors disabled:opacity-50 shadow-sm"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-5 py-2.5 text-xs sm:text-sm font-bold text-white rounded-xl shadow-md transition-all flex items-center gap-2 ${
              isDestructive
                ? 'bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 focus:ring-4 focus:ring-rose-500/20'
                : 'bg-gradient-to-r from-brand-600 to-navy-800 hover:from-brand-700 hover:to-navy-900 focus:ring-4 focus:ring-brand-500/20'
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <>
                {isDestructive ? (
                  <Trash2 className="w-4 h-4" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>{confirmLabel}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

