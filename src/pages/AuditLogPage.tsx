import React, { useState, useEffect } from 'react';
import { ScrollText, Search, Clock, User, ShieldCheck, ChevronDown } from 'lucide-react';
import { AuditLog } from '../types';
import { api } from '../services/api';

export const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await api.audit.list(150);
      setLogs(data);
    } catch (err) {
      console.error('Error loading audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((l) => {
    const q = search.toLowerCase();
    return (
      l.user_name.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      l.table_name.toLowerCase().includes(q)
    );
  });

  const formatActionName = (action: string) => {
    switch (action) {
      case 'RECORD_VIOLATION':
        return <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-bold">Catat Pelanggaran</span>;
      case 'CANCEL_VIOLATION_RECORD':
        return <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-bold">Batalkan Pelanggaran</span>;
      case 'CREATE_STUDENT':
        return <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold">Tambah Santri</span>;
      case 'UPDATE_STUDENT':
        return <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold">Edit Santri</span>;
      case 'DELETE_STUDENT':
        return <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 font-bold">Hapus Santri</span>;
      case 'IMPORT_EXCEL_STUDENTS':
        return <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-bold">Import Excel</span>;
      case 'CREATE_USER':
        return <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold">Tambah Akun</span>;
      case 'LOGIN':
        return <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">Login Pengguna</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-xs">{action}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-scale-in">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <ScrollText className="w-7 h-7 text-brand-600" />
          <span>Audit Log Aktivitas Sistem</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Riwayat pencatatan jejak audit: siapa yang membuat, mengubah, membatalkan, atau menghapus data.
        </p>
      </div>

      {/* Search Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-soft">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari user, aksi, atau tabel..."
            className="w-full text-xs sm:text-sm pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 bg-white"
          />
        </div>
      </div>

      {/* Table Logs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5 text-center w-12">#</th>
                <th className="px-4 py-3.5">Waktu Kejadian</th>
                <th className="px-4 py-3.5">Nama Petugas / User</th>
                <th className="px-4 py-3.5">Aksi Sistem</th>
                <th className="px-4 py-3.5">Tabel Terkait</th>
                <th className="px-4 py-3.5">Rincian Data Baru</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((l, idx) => (
                <tr key={l.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3.5 text-center font-bold text-slate-400">
                    {idx + 1}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-slate-600 font-mono text-xs">
                    {l.created_at}
                  </td>
                  <td className="px-4 py-3.5 font-bold text-slate-900">
                    {l.user_name}
                  </td>
                  <td className="px-4 py-3.5">
                    {formatActionName(l.action)}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs text-slate-500">
                    {l.table_name}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-600 max-w-md truncate font-mono">
                    {l.new_data ? JSON.stringify(l.new_data) : '-'}
                  </td>
                </tr>
              ))}

              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    Belum ada riwayat aktivitas yang cocok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
