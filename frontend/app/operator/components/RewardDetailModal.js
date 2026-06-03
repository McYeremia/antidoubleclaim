// Modal detail reward konfirmasi: menampilkan data rekening mahasiswa dan aksi setujui/kembalikan oleh operator.
"use client";

import { useEffect, useState } from "react";
import { API, apiFetch, KATEGORI_LABEL, REWARD_STATUS_BADGE, ConfirmModal, InfoRow, DocLink, formatTanggal, formatDatetime } from "./shared";

// Mengambil data klaim dan pengajuan terkait, lalu merender detail lengkap reward beserta tombol aksi operator.
export default function RewardDetailModal({ reward, onClose, onStatusUpdate }) {

  // ─── STATE ────────────────────────────────────────────────────────────────
  const [claim,          setClaim]          = useState(null);
  const [pengajuan,      setPengajuan]      = useState(null);
  const [updating,       setUpdating]       = useState(false);
  const [catatan,        setCatatan]        = useState(reward.catatan_operator ?? "");
  const [confirmKembali, setConfirmKembali] = useState(false);
  const [confirmApprove, setConfirmApprove] = useState(false);

  useEffect(() => {
    if (!reward.claim_id) return;
    apiFetch(`${API}/claims/${reward.claim_id}`)
      .then(r => r.ok ? r.json() : null)
      .then(setClaim)
      .catch(() => {});
    apiFetch(`${API}/pengajuan/by-claim/${reward.claim_id}`)
      .then(r => r.ok ? r.json() : null)
      .then(setPengajuan)
      .catch(() => {});
  }, [reward.claim_id]);

  const handleStatus = async (status) => {
    setUpdating(true);
    const opId = localStorage.getItem("operator_id");
    const res = await apiFetch(`${API}/reward-konfirmasi/${reward.id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(opId ? { "x-operator-id": opId } : {}),
      },
      body: JSON.stringify({ status, catatan: catatan || null }),
    });
    setUpdating(false);
    if (!res.ok) { alert("Gagal memperbarui status."); return; }
    onStatusUpdate();
    onClose();
  };

  const isPuspresnas    = reward.kategori_lomba === "puspresnas";
  const isNonPuspresnas = reward.kategori_lomba === "non_puspresnas";
  const catatanFilled   = catatan.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden relative"
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
            <div className="bg-[#f0f7f3] border border-[#d4ebe0] rounded-2xl p-6">
              <p className="text-[10px] font-black text-[#046137] uppercase tracking-[0.2em] mb-4">Klaim Terkait</p>
              <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nama Lomba</p>
                  <p className="font-bold text-gray-900 mt-0.5">{claim.nama_lomba}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Mahasiswa</p>
                  <p className="font-bold text-gray-900 mt-0.5">{claim.nama_display}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Peringkat & Tingkat</p>
                  <p className="text-gray-700 mt-0.5">{claim.peringkat} · {claim.tingkat}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tanggal Klaim</p>
                  <p className="text-gray-700 mt-0.5">{formatTanggal(claim.tanggal)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Estimasi Dana */}
          {pengajuan?.estimasi_reward != null && (
            <div className="bg-[#f0f7f3] border border-[#d4ebe0] rounded-2xl p-6 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black text-[#046137] uppercase tracking-wider">Estimasi Dana Penghargaan</p>
                <p className="text-[11px] text-[#046137] mt-1 font-medium italic opacity-70">SK Rektor No. 078/B.02/UKDW/2023</p>
              </div>
              <p className="text-3xl font-black text-[#046137] tracking-tight">
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
              <h4 className="text-[11px] font-black text-gray-300 uppercase tracking-[0.3em] border-b border-gray-50 pb-2 mb-4">
                Catatan Verifikasi
                {reward.reward_status !== "selesai" && reward.reward_status !== "diproses" && (
                  <span className="ml-1 text-red-400 normal-case font-black">*</span>
                )}
              </h4>
              <textarea
                rows={3}
                value={catatan}
                onChange={e => { setCatatan(e.target.value); }}
                placeholder="Wajib diisi sebelum mengembalikan data rekening..."
                className={`w-full px-4 py-3 border rounded-2xl text-[14px] text-gray-900 focus:outline-none focus:ring-2 transition-all ${
                  reward.reward_status !== "selesai" && reward.reward_status !== "diproses" && !catatanFilled
                    ? "bg-orange-50 border-orange-200 focus:ring-orange-300"
                    : "bg-gray-50 border-gray-200 focus:ring-gray-900"
                }`}
              />
              <p className={`text-[11px] font-semibold mt-1.5 transition-opacity duration-150 ${
                reward.reward_status !== "selesai" && reward.reward_status !== "diproses" && !catatanFilled
                  ? "text-orange-500 opacity-100"
                  : "opacity-0 select-none"
              }`}>
                Isi catatan terlebih dahulu sebelum dapat mengembalikan data rekening.
              </p>
            </section>
          </div>
        </div>

        {/* Footer Aksi */}
        {reward.reward_status !== "selesai" && reward.reward_status !== "diproses" && (
          <div className="px-8 py-6 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between flex-shrink-0">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { if (catatanFilled) setConfirmKembali(true); }}
                disabled={updating || !catatanFilled}
                title={!catatanFilled ? "Isi catatan terlebih dahulu" : ""}
                className="px-4 py-2.5 rounded-xl text-[12px] font-black bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                KEMBALIKAN
              </button>
            </div>
            <button
              type="button"
              onClick={() => setConfirmApprove(true)}
              disabled={updating}
              className="px-8 py-2.5 rounded-xl text-[12px] font-black bg-[#046137] text-white hover:bg-[#035230] transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-green-100"
            >
              {updating ? "MEMPROSES..." : "APPROVE DATA REKENING"}
            </button>
          </div>
        )}

        {/* Konfirmasi Modals (tetap fixed, tapi dirender di sini agar tidak memutus konteks) */}
        <ConfirmModal
          isOpen={confirmKembali}
          title="Kembalikan Data Rekening?"
          message={`Mahasiswa ${reward.nama_ketua} akan diberitahu untuk memperbaiki data rekening mereka.`}
          variant="warning"
          confirmLabel="YA, KEMBALIKAN"
          onConfirm={() => { setConfirmKembali(false); handleStatus("dikembalikan"); }}
          onCancel={() => setConfirmKembali(false)}
        />

        <ConfirmModal
          isOpen={confirmApprove}
          title="Approve Data Rekening?"
          message={`Konfirmasi bahwa data rekening mahasiswa ${reward.nama_ketua} sudah benar dan siap untuk diproses pembayarannya.`}
          variant="success"
          confirmLabel="YA, APPROVE"
          onConfirm={() => { setConfirmApprove(false); handleStatus("diproses"); }}
          onCancel={() => setConfirmApprove(false)}
        />
      </div>
    </div>
  );
}
