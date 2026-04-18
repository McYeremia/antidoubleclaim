"use client";

import { useEffect, useState } from "react";
import { API, KATEGORI_LABEL, REWARD_STATUS_BADGE, InfoRow, DocLink } from "./shared";

export default function RewardDetailModal({ reward, onClose, onStatusUpdate }) {
  const [claim,    setClaim]    = useState(null);
  const [pengajuan, setPengajuan] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [catatan,  setCatatan]  = useState(reward.catatan_operator ?? "");

  useEffect(() => {
    if (!reward.claim_id) return;
    fetch(`${API}/claims/${reward.claim_id}`)
      .then(r => r.ok ? r.json() : null)
      .then(setClaim)
      .catch(() => {});
    fetch(`${API}/pengajuan/by-claim/${reward.claim_id}`)
      .then(r => r.ok ? r.json() : null)
      .then(setPengajuan)
      .catch(() => {});
  }, [reward.claim_id]);

  const handleStatus = async (status) => {
    setUpdating(true);
    const res = await fetch(`${API}/reward-konfirmasi/${reward.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, catatan: catatan || null }),
    });
    setUpdating(false);
    if (!res.ok) { alert("Gagal memperbarui status."); return; }
    onStatusUpdate();
    onClose();
  };

  const isPuspresnas    = reward.kategori_lomba === "puspresnas";
  const isNonPuspresnas = reward.kategori_lomba === "non_puspresnas";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-4">
            <h3 className="text-[16px] font-black text-gray-900 tracking-tight">Detail Pengajuan Reward</h3>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${REWARD_STATUS_BADGE[reward.reward_status] ?? "bg-gray-100 text-gray-600"}`}>
              {reward.reward_status}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 text-2xl leading-none">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Klaim Terkait */}
          {claim && (
            <div className="bg-gray-900 rounded-2xl p-6 text-white shadow-xl shadow-gray-200">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Klaim Terkait</p>
              <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Nama Lomba</p>
                  <p className="font-bold text-white mt-0.5">{claim.nama_lomba}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Mahasiswa</p>
                  <p className="font-bold text-white mt-0.5">{claim.nama_display}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Peringkat & Tingkat</p>
                  <p className="text-gray-200 mt-0.5">{claim.peringkat} · {claim.tingkat}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tanggal Klaim</p>
                  <p className="text-gray-200 mt-0.5">{claim.tanggal}</p>
                </div>
              </div>
            </div>
          )}

          {/* Estimasi Dana */}
          {pengajuan?.estimasi_reward != null && (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black text-blue-700 uppercase tracking-wider">Estimasi Dana Penghargaan</p>
                <p className="text-[11px] text-blue-400 mt-1 font-medium italic">SK Rektor No. 078/B.02/UKDW/2023</p>
              </div>
              <p className="text-3xl font-black text-blue-700 tracking-tight">
                {"Rp " + Number(pengajuan.estimasi_reward).toLocaleString("id-ID")}
              </p>
            </div>
          )}

          {/* Grid data */}
          <div className="space-y-8">
            <section>
              <h4 className="text-[11px] font-black text-gray-300 uppercase tracking-[0.3em] border-b border-gray-50 pb-2 mb-4">Data Diri</h4>
              <div className="grid grid-cols-3 gap-6">
                <InfoRow label="Nama Ketua" value={reward.nama_ketua} />
                <InfoRow label="NIM"        value={reward.nim} />
                <InfoRow label="Nomor WA"   value={reward.nomor_wa} />
              </div>
            </section>

            <section>
              <h4 className="text-[11px] font-black text-gray-300 uppercase tracking-[0.3em] border-b border-gray-50 pb-2 mb-4">Info Pengajuan</h4>
              <div className="grid grid-cols-2 gap-6">
                <InfoRow label="Kategori"          value={KATEGORI_LABEL[reward.kategori_lomba] ?? reward.kategori_lomba} />
                {isPuspresnas    && <InfoRow label="Kompetisi"   value={reward.kompetisi_puspresnas} />}
                {(isPuspresnas || isNonPuspresnas) && <InfoRow label="Judul Lomba" value={reward.judul_lomba} />}
                <InfoRow label="Tahun Klaim"        value={reward.tahun_klaim} />
                <InfoRow label="Tahun Kegiatan"     value={reward.tahun_kegiatan} />
                <InfoRow label="Periode"            value={`Periode ${reward.periode}`} />
                <InfoRow label="No. Urut Lampiran"  value={reward.nomor_urut_lampiran} />
              </div>
            </section>

            <section>
              <h4 className="text-[11px] font-black text-gray-300 uppercase tracking-[0.3em] border-b border-gray-50 pb-2 mb-4">Data Rekening</h4>
              <div className="grid grid-cols-3 gap-6">
                <InfoRow label="Nama Pemilik" value={reward.nama_pemilik_rekening} />
                <InfoRow label="Bank"         value={reward.bank} />
                <InfoRow label="No. Rekening" value={reward.nomor_rekening ?? "—"} />
              </div>
            </section>

            <section>
              <h4 className="text-[11px] font-black text-gray-300 uppercase tracking-[0.3em] border-b border-gray-50 pb-2 mb-4">Dokumen</h4>
              <div className="grid grid-cols-2 gap-y-6 gap-x-12">
                <DocLink label="Buku Tabungan"         path={reward.foto_buku_tabungan_path} />
                <DocLink label="Kartu Tanda Mahasiswa" path={reward.foto_ktm_path} />
                <DocLink label="Kartu Tanda Penduduk"  path={reward.foto_ktp_path} />
                <DocLink label="Pakta Integritas"      path={reward.pakta_integritas_path} />
                <DocLink label="Laporan Akhir"         path={reward.laporan_akhir_path} />
                <DocLink label="Karya Publikasi"       path={reward.karya_publikasi_path} />
              </div>
            </section>

            <section>
              <h4 className="text-[11px] font-black text-gray-300 uppercase tracking-[0.3em] border-b border-gray-50 pb-2 mb-4">Catatan Verifikasi</h4>
              <textarea
                rows={3}
                value={catatan}
                onChange={e => setCatatan(e.target.value)}
                placeholder="Tulis catatan revisi atau penolakan..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all"
              />
            </section>
          </div>
        </div>

        {/* Footer Aksi */}
        {reward.reward_status !== "selesai" && reward.reward_status !== "diproses" && (
          <div className="px-8 py-6 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between flex-shrink-0">
            <div className="flex gap-2">
              <button
                onClick={() => handleStatus("dikembalikan")}
                disabled={updating}
                className="px-4 py-2.5 rounded-xl text-[12px] font-black bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors"
              >
                KEMBALIKAN
              </button>
            </div>
            <button
              onClick={() => handleStatus("diproses")}
              disabled={updating}
              className="px-8 py-2.5 rounded-xl text-[12px] font-black bg-gray-900 text-white hover:bg-gray-700 transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-gray-200"
            >
              {updating ? "MEMPROSES..." : "APPROVE DATA REKENING"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
