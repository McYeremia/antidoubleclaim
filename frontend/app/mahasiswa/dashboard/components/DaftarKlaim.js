"use client";

import { useState, useEffect } from "react";
import {
  API_URL,
  STATUS_LABEL, STATUS_STYLE,
  REWARD_LABEL, REWARD_STYLE,
  formatTanggal, formatDatetime,
  InfoRow,
} from "./shared";

function SectionTitle({ children }) {
  return (
    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100 pb-1 mb-3 mt-4">
      {children}
    </p>
  );
}

function FileLink({ label, path }) {
  if (!path) return null;
  const filename = path.split(/[\\/]/).pop();
  const url = `${API_URL}/uploads/${filename}`;
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase">{label}</p>
      <a href={url} target="_blank" rel="noopener noreferrer"
         className="text-sm text-blue-600 hover:underline mt-0.5 inline-block">
        {filename} ↗
      </a>
    </div>
  );
}

function DetailModal({ claim, onClose }) {
  const [pengajuan, setPengajuan] = useState(null);

  useEffect(() => {
    if (!claim) return;
    fetch(`${API_URL}/pengajuan/by-claim/${claim.id}`)
      .then((r) => r.ok ? r.json() : null)
      .then(setPengajuan)
      .catch(() => {});
  }, [claim?.id]);

  if (!claim) return null;

  const fileUrl    = `${API_URL}/uploads/${claim.sertifikat_filename}`;
  const isPdf      = claim.sertifikat_filename?.toLowerCase().endsWith(".pdf");
  const isLomba    = pengajuan?.kategori_simkatmawa === "lomba_mandiri";
  const isKarya    = pengajuan?.kategori_kegiatan?.startsWith("Karya Mahasiswa");
  const isKelompok = pengajuan?.jenis_kepesertaan === "kelompok";

  const anggota = pengajuan?.anggota_list
    ? pengajuan.anggota_list.split(";;").map((s) => { const [nama, nim] = s.split("|"); return { nama, nim }; })
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
           onClick={(e) => e.stopPropagation()}>

        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-bold text-gray-900">Detail Klaim #{claim.id}</h3>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE(claim.status)}`}>
              {STATUS_LABEL(claim.status)}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-6 space-y-1">
          {claim.status === "ditolak" && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
              <p className="text-sm font-bold text-red-700 mb-1">Klaim Tidak Lolos Verifikasi</p>
              {claim.catatan_penolakan ? (
                <>
                  <p className="text-xs text-red-500 font-semibold uppercase tracking-wide mb-1">Alasan dari Operator:</p>
                  <p className="text-sm text-red-800 leading-relaxed">{claim.catatan_penolakan}</p>
                </>
              ) : (
                <p className="text-xs text-red-500">Hubungi Divisi Bakat Minat UKDW untuk informasi lebih lanjut.</p>
              )}
            </div>
          )}
          <SectionTitle>Preview Sertifikat</SectionTitle>
          {isPdf
            ? <iframe src={fileUrl} className="w-full h-60 rounded-lg border border-gray-200" title="Preview" />
            : <img src={fileUrl} alt="Sertifikat" className="w-full rounded-lg border border-gray-200 object-contain max-h-60" />
          }
          <a href={fileUrl} target="_blank" rel="noopener noreferrer"
             className="mt-2 mb-4 inline-block text-sm text-blue-600 hover:underline">
            Buka di tab baru ↗
          </a>

          {pengajuan ? (
            <>
              <SectionTitle>Detail Kegiatan</SectionTitle>
              <div className="grid grid-cols-2 gap-4">
                <InfoRow label="Kategori" value={isLomba ? "Lomba Mandiri" : "Rekognisi Non-Lomba"} />
                <InfoRow label="Jenis Kepesertaan"  value={pengajuan.jenis_kepesertaan} />
                <div className="col-span-2">
                  <InfoRow label="Nama Kegiatan"    value={pengajuan.nama_kegiatan} />
                </div>
                <InfoRow label="Kategori Kegiatan"  value={pengajuan.kategori_kegiatan} />
                {!isLomba && <InfoRow label="Tingkatan" value={pengajuan.tingkatan} />}
                <InfoRow label="Tahun Kegiatan"     value={pengajuan.tahun_kegiatan} />
                {isLomba && <>
                  <InfoRow label="Model Pelaksanaan" value={pengajuan.model_pelaksanaan} />
                  <InfoRow label="Jumlah Peserta"    value={pengajuan.jumlah_peserta} />
                  <InfoRow label="Capaian"           value={pengajuan.capaian} />
                  <InfoRow label="Tanggal Mulai"     value={formatTanggal(pengajuan.tanggal_mulai)} />
                  <InfoRow label="Tanggal Selesai"   value={formatTanggal(pengajuan.tanggal_selesai)} />
                </>}
                <div className="col-span-2">
                  <p className="text-xs text-gray-400 uppercase">URL Penyelenggara</p>
                  <a href={pengajuan.url_penyelenggara} target="_blank" rel="noopener noreferrer"
                     className="text-sm text-blue-600 hover:underline mt-0.5 inline-block break-all">
                    {pengajuan.url_penyelenggara}
                  </a>
                </div>
                {pengajuan.keterangan && (
                  <div className="col-span-2"><InfoRow label="Keterangan" value={pengajuan.keterangan} /></div>
                )}
              </div>

              <SectionTitle>Dosen Pembimbing</SectionTitle>
              <div className="grid grid-cols-2 gap-4">
                <InfoRow label="Menggunakan Dospem" value={pengajuan.ada_dospem === "ya" ? "Ya" : "Tidak"} />
                {pengajuan.ada_dospem === "ya" && <InfoRow label="NIK/NIDN/NIDK" value={pengajuan.nidn_dospem} />}
              </div>
              <FileLink label="Surat Tugas Dospem" path={pengajuan.surat_tugas_path} />

              {isKarya && <>
                <SectionTitle>Data Karya Mahasiswa</SectionTitle>
                <div className="grid grid-cols-2 gap-4">
                  <InfoRow label="Nama Lembaga/Mitra"  value={pengajuan.nama_lembaga} />
                  <InfoRow label="Pilihan Jenis Karya" value={pengajuan.jenis_karya_pilihan} />
                  <InfoRow label="Jenis Karya"         value={pengajuan.jenis_karya_teks} />
                  <InfoRow label="Nomor Surat"         value={pengajuan.nomor_surat} />
                  <InfoRow label="Tanggal Surat"       value={formatTanggal(pengajuan.tanggal_surat)} />
                  <div className="col-span-2"><InfoRow label="Deskripsi Karya" value={pengajuan.deskripsi_karya} /></div>
                  <div className="col-span-2"><InfoRow label="Manfaat Karya"   value={pengajuan.manfaat_karya} /></div>
                </div>
              </>}

              {isKelompok && <>
                <SectionTitle>Data Kelompok</SectionTitle>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <InfoRow label="Nama Ketua"       value={pengajuan.nama_ketua} />
                  <InfoRow label="Peran Anda"       value={pengajuan.peran_pengeclaim} />
                  {pengajuan.keterangan_kelompok && (
                    <div className="col-span-2"><InfoRow label="Keterangan Kelompok" value={pengajuan.keterangan_kelompok} /></div>
                  )}
                </div>
                {anggota.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase mb-2">Anggota Lainnya</p>
                    <div className="space-y-1.5">
                      {anggota.map((a, i) => (
                        <div key={i} className="flex gap-4 text-sm bg-gray-50 rounded-lg px-3 py-2">
                          <span className="text-gray-500 w-4">{i + 2}.</span>
                          <span className="font-medium text-gray-900">{a.nama}</span>
                          <span className="text-gray-500 font-mono">{a.nim}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>}

              <SectionTitle>Dokumen Tambahan</SectionTitle>
              <div className="grid grid-cols-2 gap-4">
                <FileLink label="Foto Penyerahan"  path={pengajuan.foto_penyerahan_path} />
                <FileLink label="Dokumen Lainnya"  path={pengajuan.dokumen_lainnya_path} />
              </div>

              {pengajuan.estimasi_reward != null && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between mt-2">
                  <div>
                    <p className="text-sm font-semibold text-blue-700">Estimasi Dana Penghargaan</p>
                    <p className="text-xs text-blue-400 mt-0.5">SK Rektor No. 078/B.02/UKDW/2023 · Non PUSPRESNAS</p>
                  </div>
                  <p className="text-xl font-bold text-blue-700">
                    {"Rp " + Number(pengajuan.estimasi_reward).toLocaleString("id-ID")}
                  </p>
                </div>
              )}

              <div className="pt-3">
                <InfoRow label="Tanggal Pengajuan" value={formatDatetime(pengajuan.created_at)} />
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="col-span-2"><InfoRow label="Nama Lomba" value={claim.nama_lomba} /></div>
              <InfoRow label="Tingkat"   value={claim.tingkat} />
              <InfoRow label="Peringkat" value={claim.peringkat} />
              <InfoRow label="Tanggal"   value={formatTanggal(claim.tanggal)} />
              {claim.verified_at && <InfoRow label="Diverifikasi" value={formatDatetime(claim.verified_at)} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DaftarKlaim({ session, search, onOpenForm, onTambahKlaim }) {
  const [claims, setClaims]          = useState([]);
  const [rewardMap, setRewardMap]    = useState({});
  const [loading, setLoading]        = useState(true);
  const [selectedClaim, setSelected] = useState(null);

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const [claimRes, rewardRes] = await Promise.all([
        fetch(`${API_URL}/claims?email=${encodeURIComponent(session.user.email)}`),
        fetch(`${API_URL}/reward-konfirmasi?email=${encodeURIComponent(session.user.email)}`),
      ]);
      const claimData  = await claimRes.json();
      const rewardData = rewardRes.ok ? await rewardRes.json() : [];
      setClaims(claimData);
      const map = {};
      rewardData.forEach(r => { map[r.claim_id] = r; });
      setRewardMap(map);
    } catch {
      setClaims([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClaims(); }, []);

  // Fix: null-safe filter agar tidak crash jika field kosong
  const filtered = claims.filter((c) =>
    [c.nama_lomba, c.tingkat, c.peringkat, c.status].some((v) =>
      (v ?? "").toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div>
      <div className="flex items-start justify-between mb-10">
        <div>
          <h1 className="text-4xl font-black text-gray-900 leading-none tracking-tight">Daftar Klaim</h1>
          <p className="text-gray-400 mt-3 text-[14px]">Riwayat klaim sertifikat prestasi yang telah diajukan.</p>
        </div>
        <button
          onClick={onTambahKlaim}
          className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-[13px] font-semibold rounded-xl hover:bg-gray-700 transition-colors flex-shrink-0 mt-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Tambah Klaim
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-3 text-gray-400">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <span className="text-sm">Memuat data...</span>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-gray-100">
          <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-600">
            {claims.length === 0 ? "Belum ada klaim yang diajukan" : "Tidak ada hasil pencarian"}
          </p>
          {claims.length === 0 && (
            <p className="text-xs text-gray-400 mt-1.5">Klik tombol "Tambah Klaim" untuk mulai mengajukan</p>
          )}
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[11px] font-bold text-gray-400 tracking-widest uppercase">Riwayat Aktivitas</h2>
            <button className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 hover:text-gray-600 tracking-wider uppercase">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M7 8h10M10 12h4" />
              </svg>
              Filter
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-5 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest w-14">No</th>
                  <th className="px-5 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Nama Lomba</th>
                  <th className="px-5 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Tingkat</th>
                  <th className="px-5 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Peringkat</th>
                  <th className="px-5 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Tanggal</th>
                  <th className="px-5 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Status</th>
                  <th className="px-5 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Status Reward</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((claim, idx) => (
                  <tr key={claim.id} onClick={() => setSelected(claim)}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 cursor-pointer transition-colors">
                    <td className="px-5 py-4 text-gray-300 text-[12px] font-semibold tabular-nums">{String(idx + 1).padStart(2, "0")}</td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-900 text-[13px]">{claim.nama_lomba}</p>
                    </td>
                    <td className="px-5 py-4 text-[13px] text-gray-500">{claim.tingkat}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-900 text-white">
                        {claim.peringkat}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-[12px] text-gray-400">{formatTanggal(claim.tanggal)}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_STYLE(claim.status)}`}>
                        {STATUS_LABEL(claim.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-[13px]" onClick={(e) => e.stopPropagation()}>
                      {claim.status === "sudah dicek" && (
                        rewardMap[claim.id] ? (
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${REWARD_STYLE[rewardMap[claim.id].reward_status] ?? "bg-gray-100 text-gray-600"}`}>
                            {REWARD_LABEL[rewardMap[claim.id].reward_status] ?? rewardMap[claim.id].reward_status}
                          </span>
                        ) : (
                          <button
                            onClick={() => onOpenForm?.(claim.id)}
                            className="text-[13px] font-semibold text-gray-900 hover:text-blue-600 transition-colors underline underline-offset-2"
                          >
                            Isi Data Reward
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-3 border-t border-gray-50">
              <p className="text-[11px] text-gray-300 font-medium">{filtered.length} klaim ditemukan</p>
            </div>
          </div>
        </div>
      )}
      <DetailModal claim={selectedClaim} onClose={() => setSelected(null)} />
    </div>
  );
}
