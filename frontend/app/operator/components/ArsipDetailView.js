// Tampilan detail satu klaim arsip: data pengajuan lengkap, dokumen, anggota tim, dan reward terkait.
"use client";

import { useEffect, useState } from "react";
import {
  API, apiFetch, STATUS_BADGE, KATEGORI_LABEL, ARSIP_LABEL_KATEGORI, arsipIsLomba,
  ArsipField, ArsipSectionTitle, ArsipFileLink, ArsipCertPreview,
  formatTanggal, formatDatetime,
} from "./shared";

// Mengambil data pengajuan berdasarkan claim_id, lalu merender detail lengkap klaim dari arsip.
export default function ArsipDetailView({ detailItem, rewards, onBack }) {
  const [pengajuan, setPengajuan] = useState(null);
  const [pLoading,  setPLoading]  = useState(true);
  // Cari reward yang sesuai dengan klaim ini dari daftar reward periode.
  const reward = rewards.find(r => r.claim_id === detailItem.id);

  useEffect(() => {
    setPLoading(true);
    apiFetch(`${API}/pengajuan/by-claim/${detailItem.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(setPengajuan)
      .catch(() => setPengajuan(null))
      .finally(() => setPLoading(false));
  }, [detailItem.id]);

  const p        = pengajuan;
  const isLomba  = p ? arsipIsLomba(p.kategori_simkatmawa) : false;
  const isKarya  = p?.kategori_kegiatan?.startsWith("Karya Mahasiswa");
  const isKelompok = p?.jenis_kepesertaan === "kelompok";
  const anggota  = p?.anggota_list
    ? p.anggota_list.split(";;").map(s => { const [nama, nim] = s.split("|"); return { nama, nim }; })
    : [];

  const certFilename = detailItem.sertifikat_filename || (detailItem.sertifikat_path ? detailItem.sertifikat_path.split(/[\\/]/).pop() : null);
  const certUrl      = certFilename ? `${API}/uploads/${certFilename}` : null;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <button onClick={onBack}
        className="text-[11px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-900 transition-colors flex items-center gap-2">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
        </svg>
        Kembali ke Periode
      </button>

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Detail Klaim #{detailItem.id}</p>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">{detailItem.nama_lomba}</h2>
          <p className="text-[13px] text-gray-400 mt-1">{detailItem.nama_display} · {detailItem.mahasiswa_email}</p>
        </div>
        <span className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest ${STATUS_BADGE[detailItem.status] ?? "bg-gray-100 text-gray-500"}`}>
          {detailItem.status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Kolom Kiri: Sertifikat */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 p-8">
            <ArsipSectionTitle>Preview Sertifikat Digital</ArsipSectionTitle>
            {certUrl && certFilename ? (
              <>
                <ArsipCertPreview url={certUrl} filename={certFilename} />
                <a href={certUrl} target="_blank" rel="noopener noreferrer"
                   className="mt-6 inline-flex items-center gap-2 text-[12px] font-black text-gray-900 underline underline-offset-4 hover:text-[#046137] transition-colors uppercase tracking-widest">
                  BUKA DALAM TAB BARU
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </>
            ) : (
              <p className="text-[13px] text-gray-400 py-8 text-center">Tidak ada file sertifikat.</p>
            )}
          </div>

          <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 p-8 space-y-5">
            <ArsipSectionTitle>Informasi Verifikasi</ArsipSectionTitle>
            <div className="space-y-4">
              <ArsipField label="Status Klaim"      value={detailItem.status} />
              <ArsipField label="Tingkat"           value={detailItem.tingkat} />
              <ArsipField label="Peringkat"         value={detailItem.peringkat} />
              <ArsipField label="Tanggal Klaim"     value={formatTanggal(detailItem.tanggal)} />
              <ArsipField label="Diverifikasi oleh" value={detailItem.verified_by_nama} />
              {detailItem.flag_alasan && <ArsipField label="Alasan Flag" value={detailItem.flag_alasan} />}
            </div>
          </div>
        </div>

        {/* Kolom Kanan */}
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 p-10 space-y-10">
            <div className="border-b border-gray-50 pb-6">
              <h2 className="text-[18px] font-black text-gray-900 tracking-tight">Data Pengajuan Lengkap</h2>
              <p className="text-[12px] text-gray-400 mt-1 font-medium">Informasi mendetail dari wizard mahasiswa.</p>
            </div>

            {pLoading ? (
              <div className="flex items-center justify-center py-16">
                <svg className="w-7 h-7 text-gray-200 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            ) : !p ? (
              <div className="py-12 text-center">
                <p className="text-[13px] text-gray-400">Tidak ada data pengajuan untuk klaim ini.</p>
                <p className="text-[11px] text-gray-300 mt-1">Mahasiswa mungkin belum mengisi formulir pengajuan.</p>
              </div>
            ) : (
              <div className="space-y-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-8">
                  <div className="space-y-5">
                    <ArsipSectionTitle>Profil Mahasiswa</ArsipSectionTitle>
                    <div className="grid grid-cols-1 gap-5">
                      <ArsipField label="Nama Lengkap"    value={p.nama_display} />
                      <ArsipField label="Email Institusi" value={p.mahasiswa_email} />
                      <ArsipField label="Nomor WhatsApp"  value={p.nomor_wa} />
                    </div>
                  </div>
                  <div className="space-y-5">
                    <ArsipSectionTitle>Dosen Pembimbing</ArsipSectionTitle>
                    <div className="grid grid-cols-1 gap-5">
                      <ArsipField label="Menggunakan Dospem" value={p.ada_dospem === "ya" ? "Ya" : "Tidak"} />
                      {p.ada_dospem === "ya" && <ArsipField label="NIK/NIDN/NIDK" value={p.nidn_dospem} />}
                    </div>
                    <div className="pt-1">
                      <ArsipFileLink label="Surat Tugas Dospem" path={p.surat_tugas_path} />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <ArsipSectionTitle>Rincian Kegiatan</ArsipSectionTitle>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                    <ArsipField label="Kategori SIMKATMAWA"
                      value={ARSIP_LABEL_KATEGORI[p.kategori_simkatmawa] ?? p.kategori_simkatmawa} />
                    <ArsipField label="Jenis Kepesertaan" value={p.jenis_kepesertaan} />
                    <ArsipField label="Tahun Kegiatan"    value={p.tahun_kegiatan} />
                    <div className="col-span-2 sm:col-span-3">
                      <ArsipField label="Nama Lengkap Kegiatan" value={p.nama_kegiatan} />
                    </div>
                    <div className="col-span-2">
                      <ArsipField label="Kategori Kegiatan" value={p.kategori_kegiatan} />
                    </div>
                    {!isLomba && <ArsipField label="Tingkatan" value={p.tingkatan} />}
                    {isLomba && (
                      <>
                        <ArsipField label="Model Pelaksanaan"   value={p.model_pelaksanaan} />
                        <ArsipField label="Jumlah Peserta"      value={p.jumlah_peserta} />
                        <ArsipField label="Capaian / Peringkat" value={p.capaian} />
                        <ArsipField label="Tanggal Mulai"       value={formatTanggal(p.tanggal_mulai)} />
                        <ArsipField label="Tanggal Selesai"     value={formatTanggal(p.tanggal_selesai)} />
                      </>
                    )}
                    <div className="col-span-2 sm:col-span-3">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">URL Website Penyelenggara</p>
                      <a href={p.url_penyelenggara} target="_blank" rel="noopener noreferrer"
                         className="text-[13px] font-bold text-gray-900 underline underline-offset-4 hover:text-[#046137] transition-colors break-all">
                        {p.url_penyelenggara || "—"}
                      </a>
                    </div>
                    {p.keterangan && (
                      <div className="col-span-2 sm:col-span-3">
                        <ArsipField label="Keterangan Tambahan" value={p.keterangan} />
                      </div>
                    )}
                  </div>
                </div>

                {isKarya && (
                  <div className="space-y-6">
                    <ArsipSectionTitle>Eksistensi Karya Mahasiswa</ArsipSectionTitle>
                    <div className="grid grid-cols-2 gap-6">
                      <ArsipField label="Nama Lembaga/Mitra"    value={p.nama_lembaga} />
                      <ArsipField label="Judul/Jenis Karya"      value={p.jenis_karya_teks} />
                      <ArsipField label="Pilihan Kategori Karya" value={p.jenis_karya_pilihan} />
                      <ArsipField label="Nomor Surat Keterangan" value={p.nomor_surat} />
                      <ArsipField label="Tanggal Surat"          value={formatTanggal(p.tanggal_surat)} />
                      <div className="col-span-2"><ArsipField label="Deskripsi Karya" value={p.deskripsi_karya} /></div>
                      <div className="col-span-2"><ArsipField label="Manfaat Karya"   value={p.manfaat_karya} /></div>
                    </div>
                  </div>
                )}

                {isKelompok && (
                  <div className="space-y-6">
                    <ArsipSectionTitle>Kolaborasi Kelompok</ArsipSectionTitle>
                    <div className="grid grid-cols-2 gap-6 mb-6">
                      <ArsipField label="Nama Lengkap Ketua" value={p.nama_ketua} />
                      <ArsipField label="Peran Pengeclaim"   value={p.peran_pengeclaim} />
                      {p.keterangan_kelompok && (
                        <div className="col-span-2"><ArsipField label="Keterangan Kelompok" value={p.keterangan_kelompok} /></div>
                      )}
                    </div>
                    {anggota.length > 0 && (
                      <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Anggota Kelompok Lainnya</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {anggota.map((a, i) => (
                            <div key={i} className="flex items-center gap-4 bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                              <div className="w-8 h-8 rounded-lg bg-[#046137] flex items-center justify-center text-[11px] font-black text-white shrink-0">
                                {i + 2}
                              </div>
                              <div className="truncate">
                                <p className="text-[13px] font-bold text-gray-900 truncate">{a.nama}</p>
                                <p className="text-[11px] font-mono font-bold text-gray-400 tabular-nums">{a.nim}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-6">
                  <ArsipSectionTitle>Dokumen Pendukung Tambahan</ArsipSectionTitle>
                  <div className="grid grid-cols-2 gap-6">
                    <ArsipFileLink label="Foto Penyerahan Sertifikat" path={p.foto_penyerahan_path} />
                    <ArsipFileLink label="Dokumen Pendukung Lainnya"  path={p.dokumen_lainnya_path} />
                  </div>
                </div>
              </div>
            )}

            {p?.estimasi_reward != null && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-[0.18em]">Estimasi Dana Penghargaan</p>
                  <p className="text-[11px] text-amber-500 mt-0.5">
                    SK Rektor 078/B.02/UKDW/2023 ·{" "}
                    {p.kategori_simkatmawa === "lomba_mandiri_puspresnas" ? "PUSPRESNAS (DIKTI)" : "Non PUSPRESNAS"}
                  </p>
                </div>
                <p className="text-[22px] font-black text-amber-700 tabular-nums">
                  {"Rp " + Number(p.estimasi_reward).toLocaleString("id-ID")}
                </p>
              </div>
            )}

            {p && (
              <div className="pt-6 border-t border-gray-50 flex justify-between items-center">
                <ArsipField label="Tanggal Pengajuan" value={formatDatetime(p.created_at)} />
                <p className="text-[10px] font-black text-gray-200 uppercase tracking-widest">Antidoubleclaim Verification Engine</p>
              </div>
            )}
          </div>

          {reward ? (
            <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 p-10 space-y-8">
              <div className="flex items-center justify-between flex-wrap gap-3 border-b border-gray-50 pb-6">
                <div>
                  <h2 className="text-[18px] font-black text-gray-900 tracking-tight">Konfirmasi Reward</h2>
                  <p className="text-[12px] text-gray-400 mt-1 font-medium">Data rekening dan dokumen pencairan dana.</p>
                </div>
                <span className={`px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest ${
                  reward.reward_status === "selesai"  ? "bg-green-100 text-green-700"
                  : reward.reward_status === "diproses" ? "bg-[#d4ebe0] text-[#046137]"
                  : reward.reward_status === "ditolak"  ? "bg-red-100 text-red-700"
                  : "bg-orange-100 text-orange-600"
                }`}>{reward.reward_status}</span>
              </div>

              <div className="space-y-4">
                <ArsipSectionTitle>Data Diri</ArsipSectionTitle>
                <div className="grid grid-cols-3 gap-6">
                  <ArsipField label="Nama Ketua" value={reward.nama_ketua} />
                  <ArsipField label="NIM"        value={reward.nim} />
                  <ArsipField label="Nomor WA"   value={reward.nomor_wa} />
                </div>
              </div>

              <div className="space-y-4">
                <ArsipSectionTitle>Info Pengajuan Reward</ArsipSectionTitle>
                <div className="grid grid-cols-2 gap-6">
                  <ArsipField label="Kategori"     value={KATEGORI_LABEL[reward.kategori_lomba] ?? reward.kategori_lomba} />
                  {reward.kompetisi_puspresnas && <ArsipField label="Kompetisi" value={reward.kompetisi_puspresnas} />}
                  {reward.judul_lomba && <ArsipField label="Judul Lomba" value={reward.judul_lomba} />}
                  <ArsipField label="Tahun Klaim"       value={reward.tahun_klaim} />
                  <ArsipField label="Tahun Kegiatan"    value={reward.tahun_kegiatan} />
                  <ArsipField label="Periode"           value={`Periode ${reward.periode}`} />
                  <ArsipField label="No. Urut Lampiran" value={reward.nomor_urut_lampiran} />
                </div>
              </div>

              <div className="space-y-4">
                <ArsipSectionTitle>Data Rekening</ArsipSectionTitle>
                <div className="grid grid-cols-3 gap-6">
                  <ArsipField label="Nama Pemilik" value={reward.nama_pemilik_rekening} />
                  <ArsipField label="Bank"         value={reward.bank} />
                  <ArsipField label="No. Rekening" value={reward.nomor_rekening ?? "—"} />
                </div>
              </div>

              {reward.estimasi_reward && (
                <div className="bg-[#f0f7f3] border border-[#d4ebe0] rounded-2xl p-6 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-black text-[#046137] uppercase tracking-wider">Estimasi Dana Penghargaan</p>
                    <p className="text-[11px] text-[#046137] mt-1 font-medium italic opacity-70">SK Rektor No. 078/B.02/UKDW/2023</p>
                  </div>
                  <p className="text-3xl font-black text-[#046137] tracking-tight">
                    {"Rp " + Number(reward.estimasi_reward).toLocaleString("id-ID")}
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <ArsipSectionTitle>Dokumen</ArsipSectionTitle>
                <div className="grid grid-cols-2 gap-y-6 gap-x-12">
                  <ArsipFileLink label="Buku Tabungan"          path={reward.foto_buku_tabungan_path} />
                  <ArsipFileLink label="Kartu Tanda Mahasiswa"  path={reward.foto_ktm_path} />
                  <ArsipFileLink label="Kartu Tanda Penduduk"   path={reward.foto_ktp_path} />
                  <ArsipFileLink label="Pakta Integritas"       path={reward.pakta_integritas_path} />
                  <ArsipFileLink label="Laporan Akhir"          path={reward.laporan_akhir_path} />
                  <ArsipFileLink label="Karya Publikasi"        path={reward.karya_publikasi_path} />
                </div>
              </div>

              {reward.catatan_operator && (
                <div className="space-y-2">
                  <ArsipSectionTitle>Catatan Operator</ArsipSectionTitle>
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                    <p className="text-[13px] text-gray-700 whitespace-pre-wrap">{reward.catatan_operator}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-[32px] border border-gray-100 p-10 text-center">
              <p className="text-[15px] font-bold text-gray-400">Belum ada data konfirmasi reward</p>
              <p className="text-[12px] text-gray-300 mt-1">Mahasiswa belum mengajukan pencairan dana untuk klaim ini.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
