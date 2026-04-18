"use client";

import { KATEGORI_LABEL, formatDatetime } from "./shared";

export default function RewardSection({
  title, color, items,
  onExport, onBulkKirim, rowActions, onSelectReward,
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
      <div className={`px-6 py-4 border-b flex items-center justify-between border-gray-50 ${color}`}>
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-[11px] uppercase tracking-widest">{title}</h3>
          <span className="text-[11px] font-black bg-white/50 px-2 py-0.5 rounded-full">{items.length}</span>
        </div>
        <div className="flex items-center gap-2">
          {onBulkKirim && items.length > 0 && (
            <button
              onClick={onBulkKirim}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black bg-green-600 text-white hover:bg-green-700 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              KIRIM SEMUA REWARD
            </button>
          )}
          {onExport && items.length > 0 && (
            <button
              onClick={onExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black bg-green-700 text-white hover:bg-green-800 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              EXPORT EXCEL
            </button>
          )}
        </div>
      </div>
      {items.length === 0 ? (
        <p className="text-center text-gray-400 text-[13px] py-12">Tidak ada data.</p>
      ) : (
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-gray-50">
              <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Ketua & Institusi</th>
              <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Nama Lomba</th>
              <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Kategori</th>
              <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Rekening</th>
              <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Tgl. Pengajuan</th>
              <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {items.map(r => (
              <tr key={r.id} className="hover:bg-gray-50/60 transition-colors border-b border-gray-50 last:border-0">
                <td className="px-6 py-4">
                  <p className="font-bold text-gray-900 text-[13px]">{r.nama_ketua}</p>
                  <p className="text-[11px] font-mono text-gray-400 mt-0.5">{r.nim}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-[13px] text-gray-700 font-medium truncate max-w-xs">{r.nama_lomba ?? "—"}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5 font-medium italic">Periode {r.periode}</p>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black bg-gray-50 text-gray-500 border border-gray-100 uppercase tracking-wider">
                    {KATEGORI_LABEL[r.kategori_lomba] ?? r.kategori_lomba}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <p className="text-[12px] font-black text-gray-900 uppercase">{r.bank}</p>
                  <p className="text-[12px] font-mono text-gray-400 mt-0.5 font-bold">{r.nomor_rekening ?? "—"}</p>
                </td>
                <td className="px-6 py-4 text-[12px] text-gray-400 font-medium">{formatDatetime(r.created_at)}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {rowActions && rowActions(r)}
                    <button
                      onClick={() => onSelectReward(r)}
                      className="px-4 py-1.5 rounded-xl text-[11px] font-black bg-gray-900 text-white hover:bg-gray-700 transition-all hover:scale-105"
                    >
                      DETAIL
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
