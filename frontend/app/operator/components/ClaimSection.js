"use client";

import { formatTanggal, formatDatetime } from "./shared";

export default function ClaimSection({
  title, color, items,
  showActions, showMirip, showVerified,
  router, onApprove, onDiscard,
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
      <div className={`px-6 py-4 border-b flex items-center justify-between border-gray-50 ${color}`}>
        <h2 className="font-bold text-[11px] uppercase tracking-widest">{title}</h2>
        <span className="text-[11px] font-black bg-white/50 px-2 py-0.5 rounded-full">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-center text-gray-400 text-[13px] py-12">Tidak ada data untuk kategori ini.</p>
      ) : (
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-gray-50">
              <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest w-16">ID</th>
              <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Nama Lomba</th>
              <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Tingkat</th>
              <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Peringkat</th>
              <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Tanggal</th>
              {showMirip    && <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Mirip Dengan</th>}
              {showVerified && <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Diverifikasi Oleh</th>}
              {showActions  && <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest text-right">Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {items.map(claim => (
              <tr
                key={claim.id}
                onClick={() => router.push(`/operator/${claim.id}`)}
                className="hover:bg-gray-50/60 cursor-pointer transition-colors border-b border-gray-50 last:border-0"
              >
                <td className="px-6 py-4 font-mono text-[12px] text-gray-300 font-bold tabular-nums">#{claim.id}</td>
                <td className="px-6 py-4">
                  <p className="font-bold text-gray-900 text-[13px]">{claim.nama_lomba}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5 font-medium">{claim.nama_display}</p>
                </td>
                <td className="px-6 py-4 text-[13px] text-gray-500 font-medium">{claim.tingkat}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black bg-[#046137] text-white">
                    {claim.peringkat}
                  </span>
                </td>
                <td className="px-6 py-4 text-[12px] text-gray-400 font-medium">{formatTanggal(claim.tanggal)}</td>
                {showMirip && (
                  <td className="px-6 py-4">
                    {claim.mirip_dengan_id ? (
                      <button
                        onClick={e => { e.stopPropagation(); router.push(`/operator/${claim.mirip_dengan_id}`); }}
                        className="px-2.5 py-1 rounded-full text-[11px] font-black bg-orange-100 text-orange-700 hover:bg-orange-200"
                      >
                        #{claim.mirip_dengan_id}
                      </button>
                    ) : <span className="text-gray-200">—</span>}
                  </td>
                )}
                {showVerified && (
                  <td className="px-6 py-4">
                    {claim.verified_by_nama ? (
                      <div>
                        <p className="font-bold text-gray-900 text-[13px]">{claim.verified_by_nama}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5 font-medium">{formatDatetime(claim.verified_at)}</p>
                      </div>
                    ) : <span className="text-gray-200">—</span>}
                  </td>
                )}
                {showActions && (
                  <td className="px-6 py-4 text-right space-x-2" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={e => onApprove(claim.id, e)}
                      className="px-3 py-1.5 rounded-xl text-[11px] font-black bg-[#046137] text-white hover:bg-[#035230] transition-colors"
                    >
                      APPROVE
                    </button>
                    <button
                      onClick={e => onDiscard(claim.id, e)}
                      className="px-3 py-1.5 rounded-xl text-[11px] font-black bg-red-50 text-red-600 hover:bg-red-100 transition-colors border border-red-100"
                    >
                      DISCARD
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
