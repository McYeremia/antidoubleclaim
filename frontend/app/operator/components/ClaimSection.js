// Komponen tabel klaim yang dapat dikonfigurasi: mendukung mode aksi, tampilan duplikat, dan info verifikasi.
"use client";

import { formatTanggal, formatDatetime } from "./shared";

// Merender satu grup klaim (misalnya: antrean, duplikat, atau selesai) dalam kartu tabel dengan judul dan aksi.
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
        <table className="w-full table-fixed text-sm text-left">
          <colgroup>
            <col className="w-14" />
            <col className="w-[160px]" />
            <col className="w-[90px]" />
            <col className="w-[120px]" />
            <col className="w-[100px]" />
            {showMirip    && <col className="w-[130px]" />}
            {showVerified && <col className="w-[150px]" />}
            <col className={showActions ? "w-[200px]" : "w-[80px]"} />
          </colgroup>
          <thead>
            <tr className="border-b border-gray-50">
              <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">ID</th>
              <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Nama Lomba</th>
              <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Tingkat</th>
              <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Peringkat</th>
              <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">{showMirip ? "Tgl. Pengajuan" : "Tanggal Pengajuan"}</th>
              {showMirip    && <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Mirip Dengan - Alasan</th>}
              {showVerified && <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Diverifikasi Oleh</th>}
              <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest text-right">Aksi</th>
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
                  <span className="inline-block max-w-full truncate px-2.5 py-0.5 rounded-full text-[11px] font-black bg-[#046137] text-white">
                    {claim.peringkat}
                  </span>
                </td>
                <td className="px-6 py-4 text-[12px] text-gray-400 font-medium">{formatTanggal(claim.pengajuan_created_at)}</td>
                {showMirip && (
                  <td className="px-6 py-4">
                    {claim.mirip_dengan_id ? (
                      <div className="flex flex-col items-start gap-1">
                        <button
                          onClick={e => { e.stopPropagation(); router.push(`/operator/${claim.mirip_dengan_id}`); }}
                          className="px-2.5 py-1 rounded-full text-[11px] font-black bg-orange-100 text-orange-700 hover:bg-orange-200"
                        >
                          #{claim.mirip_dengan_id}
                        </button>
                        {claim.flag_alasan && (() => {
                          const a = claim.flag_alasan;
                          const isBoth = a === "gambar, nama" || a === "gambar, nama lomba";
                          const isImg  = a === "gambar";
                          const label  = isBoth ? "Gambar + Nama" : isImg ? "Gambar" : "Nama";
                          const style  = isBoth ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700";
                          return (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide ${style}`}>
                              {label}
                            </span>
                          );
                        })()}
                      </div>
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
                <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-2">
                    {showActions && (
                      <>
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
                        <div className="w-px h-5 bg-gray-200 mx-1 flex-shrink-0" />
                      </>
                    )}
                    <button
                      onClick={() => router.push(`/operator/${claim.id}`)}
                      className="px-3 py-1.5 rounded-xl text-[11px] font-black bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors border border-gray-200"
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
