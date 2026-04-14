"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import TambahKlaimWizard from "./TambahKlaimWizard";
import KonfirmasiRewardFormPanel from "./KonfirmasiRewardFormPanel";

// ── Status mahasiswa (disederhanakan) ─────────────────────────────────────────
const STATUS_LABEL = (status) =>
  status === "sudah dicek" ? "Selesai" : "Dalam Proses";

const STATUS_STYLE = (status) =>
  status === "sudah dicek"
    ? "bg-green-100 text-green-700"
    : "bg-blue-100 text-blue-700";

// ── Status reward ─────────────────────────────────────────────────────────────
const REWARD_LABEL = {
  menunggu:     "Sedang Diproses",
  diproses:     "Sedang Diproses",
  selesai:      "Reward Dikirim",
  dikembalikan: "Perlu Diperbaiki",
  ditolak:      "Ditolak",
};
const REWARD_STYLE = {
  menunggu:     "bg-blue-100 text-blue-700",
  diproses:     "bg-blue-100 text-blue-700",
  selesai:      "bg-green-100 text-green-700",
  dikembalikan: "bg-orange-100 text-orange-700",
  ditolak:      "bg-red-100 text-red-700",
};

// ── Ikon sidebar ──────────────────────────────────────────────────────────────
const IconPlus = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);
const IconList = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);
const IconChart = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);
const IconReward = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
  </svg>
);
const IconDoc = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

// ── Popup: Form Tambah Klaim — digantikan TambahKlaimWizard ──────────────────
function TambahKlaimModal({ session, onClose, onSuccess }) {
  const [formData, setFormData] = useState({ nama_lomba: "", tingkat: "", tanggal: "", peringkat: "" });
  const [file, setFile]         = useState(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const [result, setResult]     = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { setUploadStatus("Silakan pilih file sertifikat."); return; }

    setUploadStatus("Sedang mengunggah...");
    setResult(null);

    const data = new FormData();
    data.append("nama_lomba",      formData.nama_lomba);
    data.append("tingkat",         formData.tingkat);
    data.append("tanggal",         formData.tanggal);
    data.append("peringkat",       formData.peringkat);
    data.append("mahasiswa_email", session.user.email);
    data.append("nama_display",    session.user.name ?? session.user.email);
    data.append("file",            file);

    try {
      const res = await fetch("http://127.0.0.1:8000/upload", { method: "POST", body: data });
      if (res.ok) {
        const resData = await res.json();
        setResult(resData);
        setUploadStatus("Selesai!");
        if (resData.uploaded) {
          onSuccess?.();
          setFormData({ nama_lomba: "", tingkat: "", tanggal: "", peringkat: "" });
          setFile(null);
          e.target.reset();
        }
      } else {
        setUploadStatus("Gagal mengunggah. Cek koneksi backend.");
      }
    } catch {
      setUploadStatus("Terjadi kesalahan saat menghubungi server.");
    }
  };

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex items-end justify-end p-6 pointer-events-none">
      {/* Panel popup */}
      <div className="pointer-events-auto w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between bg-gray-800 px-5 py-3">
          <span className="text-sm font-semibold text-white">Tambah Klaim Sertifikat</span>
          <button onClick={onClose} className="text-gray-300 hover:text-white text-xl leading-none">&times;</button>
        </div>

        {/* Form */}
        <div className="p-5 overflow-y-auto max-h-[80vh]">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nama Lomba</label>
              <input type="text" name="nama_lomba" required value={formData.nama_lomba} onChange={handleChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Contoh: Hackathon Nasional 2024" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tingkat</label>
                <select name="tingkat" required value={formData.tingkat} onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Pilih</option>
                  <option>Universitas</option>
                  <option>Provinsi</option>
                  <option>Nasional</option>
                  <option>Internasional</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tanggal</label>
                <input type="date" name="tanggal" required value={formData.tanggal} onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Peringkat</label>
              <select name="peringkat" required value={formData.peringkat} onChange={handleChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Pilih Peringkat</option>
                <option>Juara 1</option><option>Juara 2</option><option>Juara 3</option>
                <option>Harapan 1</option><option>Harapan 2</option><option>Harapan 3</option>
                <option>Finalis</option><option>Peserta Terbaik</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">File Sertifikat (JPG/PNG/PDF)</label>
              <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => setFile(e.target.files[0])} required
                className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
            </div>

            {uploadStatus && !result && (
              <p className="text-xs text-center text-blue-700 bg-blue-50 rounded-lg py-2">{uploadStatus}</p>
            )}
            {result && (
              <div className="bg-green-50 border border-green-300 rounded-lg p-3 text-sm">
                <p className="font-semibold text-green-700">Klaim berhasil diupload!</p>
                <p className="text-green-600 text-xs mt-0.5">Menunggu pengecekan operator.</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                Batal
              </button>
              <button type="submit"
                className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Kirim Klaim
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Modal: Detail Klaim ───────────────────────────────────────────────────────
function InfoRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-gray-900 mt-0.5 text-sm">{value}</p>
    </div>
  );
}

function SectionTitle({ children }) {
  return <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100 pb-1 mb-3 mt-4">{children}</p>;
}

function FileLink({ label, path }) {
  if (!path) return null;
  const filename = path.split(/[\\/]/).pop();
  const url = `http://127.0.0.1:8000/uploads/${filename}`;
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
    fetch(`http://127.0.0.1:8000/pengajuan/by-claim/${claim.id}`)
      .then((r) => r.ok ? r.json() : null)
      .then(setPengajuan)
      .catch(() => {});
  }, [claim?.id]);

  if (!claim) return null;

  const fileUrl    = `http://127.0.0.1:8000/uploads/${claim.sertifikat_filename}`;
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

        {/* Header */}
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

          {/* Preview sertifikat */}
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
              {/* Detail Kegiatan */}
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
                  <InfoRow label="Tanggal Mulai"     value={pengajuan.tanggal_mulai} />
                  <InfoRow label="Tanggal Selesai"   value={pengajuan.tanggal_selesai} />
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

              {/* Dosen Pembimbing */}
              <SectionTitle>Dosen Pembimbing</SectionTitle>
              <div className="grid grid-cols-2 gap-4">
                <InfoRow label="Menggunakan Dospem" value={pengajuan.ada_dospem === "ya" ? "Ya" : "Tidak"} />
                {pengajuan.ada_dospem === "ya" && <InfoRow label="NIK/NIDN/NIDK" value={pengajuan.nidn_dospem} />}
              </div>
              <FileLink label="Surat Tugas Dospem" path={pengajuan.surat_tugas_path} />

              {/* Karya Mahasiswa */}
              {isKarya && <>
                <SectionTitle>Data Karya Mahasiswa</SectionTitle>
                <div className="grid grid-cols-2 gap-4">
                  <InfoRow label="Nama Lembaga/Mitra"  value={pengajuan.nama_lembaga} />
                  <InfoRow label="Pilihan Jenis Karya" value={pengajuan.jenis_karya_pilihan} />
                  <InfoRow label="Jenis Karya"         value={pengajuan.jenis_karya_teks} />
                  <InfoRow label="Nomor Surat"         value={pengajuan.nomor_surat} />
                  <InfoRow label="Tanggal Surat"       value={pengajuan.tanggal_surat} />
                  <div className="col-span-2"><InfoRow label="Deskripsi Karya" value={pengajuan.deskripsi_karya} /></div>
                  <div className="col-span-2"><InfoRow label="Manfaat Karya"   value={pengajuan.manfaat_karya} /></div>
                </div>
              </>}

              {/* Data Kelompok */}
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

              {/* Dokumen */}
              <SectionTitle>Dokumen Tambahan</SectionTitle>
              <div className="grid grid-cols-2 gap-4">
                <FileLink label="Foto Penyerahan"  path={pengajuan.foto_penyerahan_path} />
                <FileLink label="Dokumen Lainnya"  path={pengajuan.dokumen_lainnya_path} />
              </div>

              {/* Estimasi Reward */}
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
                <InfoRow label="Tanggal Pengajuan" value={pengajuan.created_at} />
              </div>
            </>
          ) : (
            /* Fallback jika belum ada data pengajuan (klaim lama) */
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="col-span-2"><InfoRow label="Nama Lomba" value={claim.nama_lomba} /></div>
              <InfoRow label="Tingkat"   value={claim.tingkat} />
              <InfoRow label="Peringkat" value={claim.peringkat} />
              <InfoRow label="Tanggal"   value={claim.tanggal} />
              {claim.verified_at && <InfoRow label="Diverifikasi" value={claim.verified_at} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Konten: Daftar Klaim ──────────────────────────────────────────────────────
function DaftarKlaim({ session, search, onOpenForm }) {
  const [claims, setClaims]          = useState([]);
  const [rewardMap, setRewardMap]    = useState({});   // claim_id → reward object
  const [loading, setLoading]        = useState(true);
  const [selectedClaim, setSelected] = useState(null);

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const [claimRes, rewardRes] = await Promise.all([
        fetch(`http://127.0.0.1:8000/claims?email=${encodeURIComponent(session.user.email)}`),
        fetch(`http://127.0.0.1:8000/reward-konfirmasi?email=${encodeURIComponent(session.user.email)}`),
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

  const filtered = claims.filter((c) =>
    [c.nama_lomba, c.tingkat, c.peringkat, c.status].some((v) =>
      v.toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-5">Daftar Klaim Saya</h2>
      {loading ? (
        <p className="text-center text-gray-400 py-16">Memuat data...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-gray-400 py-16">
          {claims.length === 0 ? "Belum ada klaim yang diajukan." : "Tidak ada hasil pencarian."}
        </p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Nama Lomba</th>
                <th className="px-4 py-3">Tingkat</th>
                <th className="px-4 py-3">Peringkat</th>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((claim) => (
                <tr key={claim.id} onClick={() => setSelected(claim)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{claim.nama_lomba}</td>
                  <td className="px-4 py-3 text-gray-600">{claim.tingkat}</td>
                  <td className="px-4 py-3 text-gray-600">{claim.peringkat}</td>
                  <td className="px-4 py-3 text-gray-600">{claim.tanggal}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE(claim.status)}`}>
                      {STATUS_LABEL(claim.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    {claim.status === "sudah dicek" && (
                      rewardMap[claim.id] ? (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${REWARD_STYLE[rewardMap[claim.id].reward_status] ?? "bg-gray-100 text-gray-600"}`}>
                          {REWARD_LABEL[rewardMap[claim.id].reward_status] ?? rewardMap[claim.id].reward_status}
                        </span>
                      ) : (
                        <button
                          onClick={() => onOpenForm?.(claim.id)}
                          className="px-3 py-1.5 rounded-md text-xs font-semibold bg-orange-500 text-white hover:bg-orange-600 transition-colors whitespace-nowrap"
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
        </div>
      )}
      <DetailModal claim={selectedClaim} onClose={() => setSelected(null)} />
    </div>
  );
}

// ── Konten: Konfirmasi Reward ─────────────────────────────────────────────────
function KonfirmasiReward({ session, initialClaimId = null, onClearInitial }) {
  const [claims,          setClaims]          = useState([]);
  const [rewardMap,       setRewardMap]       = useState({});
  const [pengajuanMap,    setPengajuanMap]    = useState({});
  const [loading,         setLoading]         = useState(true);
  const [selectedClaimId, setSelectedClaimId] = useState(initialClaimId);

  // Sync jika initialClaimId berubah dari luar (misal dari DaftarKlaim)
  useEffect(() => {
    if (initialClaimId) {
      setSelectedClaimId(initialClaimId);
      onClearInitial?.();
    }
  }, [initialClaimId]);

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      fetch(`http://127.0.0.1:8000/claims?email=${encodeURIComponent(session.user.email)}`),
      fetch(`http://127.0.0.1:8000/reward-konfirmasi?email=${encodeURIComponent(session.user.email)}`),
      fetch(`http://127.0.0.1:8000/pengajuan?email=${encodeURIComponent(session.user.email)}`),
    ]).then(async ([claimRes, rewardRes, pengajuanRes]) => {
      const claimData     = await claimRes.json();
      const rewardData    = rewardRes.ok    ? await rewardRes.json()    : [];
      const pengajuanData = pengajuanRes.ok ? await pengajuanRes.json() : [];
      setClaims(claimData.filter(c => c.status === "sudah dicek"));
      const rMap = {};
      rewardData.forEach(r => { rMap[r.claim_id] = r; });
      setRewardMap(rMap);
      const pMap = {};
      pengajuanData.forEach(p => { if (p.claim_id) pMap[p.claim_id] = p; });
      setPengajuanMap(pMap);
    }).catch(() => setClaims([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  const belumDiisi      = claims.filter(c => !rewardMap[c.id]);
  const dikembalikan    = claims.filter(c => rewardMap[c.id]?.reward_status === "dikembalikan");
  const sudahDiisi      = claims.filter(c => rewardMap[c.id] && rewardMap[c.id].reward_status !== "dikembalikan");

  const ClaimTable = ({ items, mode }) => (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
          <tr>
            <th className="px-4 py-3">Nama Lomba</th>
            <th className="px-4 py-3">Tingkat</th>
            <th className="px-4 py-3">Peringkat</th>
            <th className="px-4 py-3">Estimasi Dana</th>
            <th className="px-4 py-3 text-right">
              {mode === "isi" ? "Aksi" : mode === "kembali" ? "Aksi" : "Status Reward"}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map(claim => {
            const estimasi = pengajuanMap[claim.id]?.estimasi_reward;
            const reward   = rewardMap[claim.id];
            return (
              <tr key={claim.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{claim.nama_lomba}</td>
                <td className="px-4 py-3 text-gray-600">{claim.tingkat}</td>
                <td className="px-4 py-3 text-gray-600">{claim.peringkat}</td>
                <td className="px-4 py-3">
                  {estimasi != null
                    ? <span className="font-semibold text-blue-700">{"Rp " + Number(estimasi).toLocaleString("id-ID")}</span>
                    : <span className="text-gray-400">—</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  {mode === "isi" && (
                    <button
                      onClick={() => setSelectedClaimId(claim.id)}
                      className="px-3 py-1.5 rounded-md text-xs font-semibold bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                    >
                      Isi Data Reward
                    </button>
                  )}
                  {mode === "kembali" && (
                    <button
                      onClick={() => setSelectedClaimId(claim.id)}
                      className="px-3 py-1.5 rounded-md text-xs font-semibold bg-orange-600 text-white hover:bg-orange-700 transition-colors"
                    >
                      Perbaiki & Kirim Ulang
                    </button>
                  )}
                  {mode === "status" && (
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${REWARD_STYLE[reward?.reward_status] ?? "bg-gray-100 text-gray-600"}`}>
                      {REWARD_LABEL[reward?.reward_status] ?? "—"}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // Render panel form jika ada claim yang dipilih
  if (selectedClaimId) {
    return (
      <KonfirmasiRewardFormPanel
        claimId={selectedClaimId}
        session={session}
        onBack={() => setSelectedClaimId(null)}
        onSuccess={() => { setSelectedClaimId(null); fetchAll(); }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Konfirmasi Reward</h2>
        <p className="text-sm text-gray-500">
          Klaim yang telah disetujui operator memerlukan data rekening untuk pencairan reward.
        </p>
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-16">Memuat data...</p>
      ) : claims.length === 0 ? (
        <div className="flex items-center justify-center h-48 bg-white rounded-xl border border-dashed border-gray-300">
          <p className="text-gray-400 text-sm">Belum ada klaim yang disetujui.</p>
        </div>
      ) : (
        <>
          {/* Dikembalikan — paling atas karena perlu tindakan segera */}
          {dikembalikan.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-orange-700 mb-2 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-orange-500"></span>
                Perlu Diperbaiki ({dikembalikan.length})
              </h3>
              <div className="space-y-3">
                {dikembalikan.map(claim => {
                  const reward = rewardMap[claim.id];
                  return (
                    <div key={claim.id} className="rounded-xl border border-orange-200 overflow-hidden">
                      {reward?.catatan_operator && (
                        <div className="bg-orange-50 px-4 py-3 border-b border-orange-200 flex gap-3">
                          <svg className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
                            <p className="text-xs font-semibold text-orange-700 mb-0.5">Catatan dari Operator:</p>
                            <p className="text-sm text-orange-800">{reward.catatan_operator}</p>
                          </div>
                        </div>
                      )}
                      <ClaimTable items={[claim]} mode="kembali" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {belumDiisi.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-orange-600 mb-2">
                Belum Diisi ({belumDiisi.length})
              </h3>
              <ClaimTable items={belumDiisi} mode="isi" />
            </div>
          )}

          {sudahDiisi.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-2">
                Sudah Diisi ({sudahDiisi.length})
              </h3>
              <ClaimTable items={sudahDiisi} mode="status" />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Konten: SK Rektor ─────────────────────────────────────────────────────────
function SKRektor() {
  const [activeTab, setActiveTab] = useState("ketentuan");

  const tabs = [
    { key: "ketentuan", label: "Ketentuan Umum" },
    { key: "mahasiswa", label: "Tabel Penghargaan Mahasiswa" },
    { key: "petunjuk",  label: "Petunjuk Teknis" },
  ];

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">SK Rektor No. 078/B.02/UKDW/2023</h2>
          <p className="text-sm text-gray-500 mt-1">Aturan Pemberian Penghargaan Bidang Kemahasiswaan UKDW</p>
        </div>
        <a
          href="/sk-rektor.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Lihat PDF Asli
        </a>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === t.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Ketentuan Umum */}
      {activeTab === "ketentuan" && (
        <div className="space-y-4">
          <Section title="Latar Belakang (Pasal 1)">
            <p>
              Selain menekuni bidang akademik, mahasiswa diharapkan mengembangkan <em>soft skills</em> agar
              menjadi lulusan yang tangguh, unggul, dan berprestasi. Dosen atau staf pendamping serta mahasiswa
              diberikan penghargaan atas keaktifan mengikuti berbagai lomba dan kompetisi. Penghargaan
              (reward) yang diberikan diharapkan mampu mendorong dan memotivasi mahasiswa.
            </p>
          </Section>

          <Section title="Tujuan (Pasal 3)">
            <ol className="list-decimal list-inside space-y-1 text-gray-700">
              <li>Memberikan penghargaan kepada mahasiswa dan pendamping yang berhasil mencapai prestasi tinggi.</li>
              <li>Memberikan motivasi kepada mahasiswa melaksanakan kegiatan kurikuler, ko-kurikuler, dan ekstra-kurikuler.</li>
              <li>Mendorong Perguruan Tinggi mengembangkan iklim kehidupan kampus yang memfasilitasi mahasiswa mencapai prestasi secara berkesinambungan.</li>
            </ol>
          </Section>

          <Section title="Pengertian (Pasal 4)">
            <div className="space-y-3 text-gray-700">
              <p><strong>(1) Mahasiswa Berprestasi</strong> — Mahasiswa yang berhasil mencapai prestasi tinggi, baik akademik maupun non-akademik melalui keikutsertaan dalam lomba, kompetisi, dan kegiatan kemahasiswaan.</p>
              <p><strong>(2) Kompetisi/Lomba/Kejuaraan</strong> — Kegiatan perlombaan yang diselenggarakan oleh institusi resmi dengan peserta mahasiswa UKDW yang berstatus aktif. Dapat berupa pertandingan olahraga, lomba karya ilmiah, hibah, gelar karya kreatifitas, dan kegiatan prestasi yang berdampak pada SIMKATMAWA.</p>
              <p><strong>(3) Tingkatan Lomba</strong> — Bersifat (a) Rekognisi dan (b) Non Rekognisi.</p>
            </div>
          </Section>

          <Section title="Ketentuan Penghargaan (Pasal 5)">
            <div className="space-y-2 text-gray-700">
              <p>(1) Penentuan penghargaan prestasi ditentukan dalam rapat pimpinan Bidang Kemahasiswaan UKDW dan diwujudkan sebagai dana pembinaan.</p>
              <p>(2) Kriteria penghargaan berdasarkan tingkatan lomba bersifat (a) Rekognisi dan (b) Non Rekognisi, diberikan berdasarkan pencapaian pada tahapan lomba.</p>
            </div>
          </Section>

          <Section title="Ketentuan Berlaku">
            <p className="text-gray-700">
              Keputusan ini berlaku mulai sejak <strong>Semester Gasal 2023–2024</strong>, ditetapkan di Yogyakarta
              pada tanggal 19 September 2023 oleh Rektor UKDW Dr.-Ing. Wiyatiningsih, ST., MT.
            </p>
          </Section>
        </div>
      )}

      {/* Tab: Tabel Penghargaan Mahasiswa */}
      {activeTab === "mahasiswa" && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <strong>Pengali:</strong> Rp 225.000 per poin. Contoh: poin 6 = Rp 1.350.000
          </div>

          <Section title="PUSPRESNAS">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-3 py-2 text-left">Kategori</th>
                    <th className="border border-gray-300 px-3 py-2 text-center">Semifinal</th>
                    <th className="border border-gray-300 px-3 py-2 text-center">Juara 3</th>
                    <th className="border border-gray-300 px-3 py-2 text-center">Juara 2</th>
                    <th className="border border-gray-300 px-3 py-2 text-center">Juara 1</th>
                    <th className="border border-gray-300 px-3 py-2 text-center">Terbaik</th>
                    <th className="border border-gray-300 px-3 py-2 text-center">Terbaik+</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-3 py-2 font-medium">PUSPRESNAS</td>
                    <td className="border border-gray-300 px-3 py-2 text-center">0,5</td>
                    <td className="border border-gray-300 px-3 py-2 text-center">3</td>
                    <td className="border border-gray-300 px-3 py-2 text-center">6</td>
                    <td className="border border-gray-300 px-3 py-2 text-center">12</td>
                    <td className="border border-gray-300 px-3 py-2 text-center">15</td>
                    <td className="border border-gray-300 px-3 py-2 text-center">18</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="NON PUSPRESNAS">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-3 py-2 text-left">Tingkat</th>
                    <th className="border border-gray-300 px-3 py-2 text-center">Peserta</th>
                    <th className="border border-gray-300 px-3 py-2 text-center">Juara 3</th>
                    <th className="border border-gray-300 px-3 py-2 text-center">Juara 2</th>
                    <th className="border border-gray-300 px-3 py-2 text-center">Juara 1</th>
                    <th className="border border-gray-300 px-3 py-2 text-center">Terbaik</th>
                    <th className="border border-gray-300 px-3 py-2 text-center">Terbaik+</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { level: "Regional",       vals: ["0,5", "1", "2", "4", "5", "6"] },
                    { level: "Nasional",        vals: ["0,5", "2", "4", "8", "10", "12"] },
                    { level: "Internasional",   vals: ["0,5", "3", "6", "12", "15", "18"] },
                  ].map((row) => (
                    <tr key={row.level}>
                      <td className="border border-gray-300 px-3 py-2 font-medium">{row.level}</td>
                      {row.vals.map((v, i) => (
                        <td key={i} className="border border-gray-300 px-3 py-2 text-center">{v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="Publikasi Ilmiah">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-3 py-2 text-left">Jenis Publikasi</th>
                    <th className="border border-gray-300 px-3 py-2 text-center">Penulis 1</th>
                    <th className="border border-gray-300 px-3 py-2 text-center">Penulis 2</th>
                    <th className="border border-gray-300 px-3 py-2 text-center">Penulis 3+</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { jenis: "Jurnal Internasional",   vals: ["6", "4", "2"] },
                    { jenis: "Jurnal Nasional Scopus",  vals: ["6", "4", "2"] },
                    { jenis: "Jurnal Nasional SINTA",   vals: ["6", "4", "2"] },
                    { jenis: "Paten Internasional",     vals: ["6", "4", "2"] },
                    { jenis: "Pemakalah Internasional", vals: ["2", "–", "–"] },
                    { jenis: "Pemakalah Nasional",      vals: ["2", "–", "–"] },
                    { jenis: "Pemakalah Regional",      vals: ["2", "–", "–"] },
                  ].map((row) => (
                    <tr key={row.jenis}>
                      <td className="border border-gray-300 px-3 py-2 font-medium">{row.jenis}</td>
                      {row.vals.map((v, i) => (
                        <td key={i} className="border border-gray-300 px-3 py-2 text-center">{v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 mt-2">* Pembatasan: masing-masing jenis publikasi (jurnal, paten, pemakalah) dibatasi 2x selama studi per individu.</p>
          </Section>
        </div>
      )}

      {/* Tab: Petunjuk Teknis */}
      {activeTab === "petunjuk" && (
        <div className="space-y-4">
          <Section title="Berkas yang Wajib Dilampirkan">
            <ol className="list-decimal list-inside space-y-1 text-gray-700">
              <li>Surat tugas peserta kompetisi</li>
              <li>Sertifikat</li>
              <li>URL laman penyelenggara dan dokumentasi kegiatan (website, media sosial, poster kegiatan)</li>
              <li>Letter of Acceptance (untuk kategori publikasi ilmiah)</li>
            </ol>
          </Section>

          <Section title="Ketentuan Jumlah Peserta Kelompok">
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>Tabel berlaku untuk kelompok dengan <strong>maksimal 5 orang</strong> anggota</li>
              <li>6–10 orang: jumlah penghargaan ditambah <strong>25%</strong></li>
              <li>Lebih dari 10 orang: jumlah penghargaan ditambah <strong>50%</strong></li>
              <li>Seluruh penghargaan dalam kelompok <strong>dibagi rata</strong> sesuai jumlah anggota</li>
            </ul>
          </Section>

          <Section title="Ketentuan Skala Wilayah (Non PUSPRESNAS)">
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li><strong>Regional</strong> — kegiatan dalam lingkup 1–3 provinsi</li>
              <li><strong>Nasional</strong> — diikuti minimal dari 4 provinsi</li>
              <li><strong>Internasional</strong> — diikuti minimal dari 4 negara</li>
            </ul>
          </Section>

          <Section title="Ketentuan Berkas Tidak Lengkap">
            <p className="text-gray-700">
              Apabila berkas tidak lengkap dan ketika direview memiliki catatan pertimbangan layak mendapat
              penghargaan, maka jumlah penghargaan yang diterima <strong>maksimal 75%</strong>.
            </p>
          </Section>

          <Section title="Batas Waktu Pengajuan">
            <p className="text-gray-700">
              Jangka waktu kegiatan kompetisi yang dapat diajukan memiliki batas <strong>12 bulan</strong> dimulai
              dari waktu dikeluarkannya informasi/pengumuman terkait tahapan prestasi yang didapatkan.
            </p>
          </Section>

          <Section title="Cara Input Berkas">
            <p className="text-gray-700">Input berkas melalui website SAC (Sistem Anti-Double Claim).</p>
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">{title}</h3>
      <div className="text-sm text-gray-700 leading-relaxed">{children}</div>
    </div>
  );
}

// ── Konten: Visualisasi Data ──────────────────────────────────────────────────
function VisualisasiData() {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">Visualisasi Data</h2>
      <div className="flex items-center justify-center h-64 bg-white rounded-xl border border-dashed border-gray-300">
        <p className="text-gray-400 text-sm">Visualisasi data akan segera hadir.</p>
      </div>
    </div>
  );
}

// ── Halaman Utama ─────────────────────────────────────────────────────────────
export default function MahasiswaDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [activeMenu,       setActiveMenu]       = useState("daftar");
  const [showTambah,       setShowTambah]       = useState(false);
  const [search,           setSearch]           = useState("");
  const [claimsRefreshKey, setClaimsRefreshKey] = useState(0);
  const [rewardOpenId,     setRewardOpenId]     = useState(null); // buka form reward langsung

  if (status === "loading") {
    return <p className="text-center mt-20 text-gray-400">Memuat sesi...</p>;
  }
  if (status === "unauthenticated" || !session?.user?.email?.endsWith("@students.ukdw.ac.id")) {
    router.replace("/");
    return null;
  }

  const handleClaimSuccess = () => {
    setClaimsRefreshKey((k) => k + 1);
    // Pindah ke daftar setelah berhasil upload (opsional — bisa dihapus)
    // setShowTambah(false);
    // setActiveMenu("daftar");
  };

  const menus = [
    { key: "daftar",      label: "Daftar Klaim",      icon: <IconList />   },
    { key: "reward",      label: "Konfirmasi Reward",  icon: <IconReward /> },
    { key: "visualisasi", label: "Visualisasi Data",   icon: <IconChart />  },
    { key: "sk-rektor",   label: "SK Rektor",          icon: <IconDoc />    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* ── Sidebar ── */}
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-gray-100">
          <h1 className="text-base font-bold text-gray-900">Anti-Double Claim</h1>
          <p className="text-xs text-gray-400 mt-0.5">Portal Mahasiswa</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {/* Tombol Tambah Klaim (Gmail-style) */}
          <button
            onClick={() => setShowTambah(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors text-left bg-blue-600 text-white hover:bg-blue-700 shadow-sm mb-2"
          >
            <IconPlus />
            Tambah Klaim
          </button>

          {/* Menu biasa */}
          {menus.map((m) => (
            <button
              key={m.key}
              onClick={() => setActiveMenu(m.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left
                ${activeMenu === m.key
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-600 hover:bg-gray-50"
                }`}
            >
              {m.icon}
              {m.label}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-5 py-4 border-t border-gray-100">
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-xs text-red-500 hover:text-red-700"
          >
            Keluar
          </button>
        </div>
      </aside>

      {/* ── Area Kanan ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar — selalu tampil */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-8 flex-shrink-0">
          {/* Search bar — hanya tampil di menu daftar */}
          {activeMenu === "daftar" ? (
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama lomba, tingkat, peringkat..."
              className="w-72 px-4 py-1.5 border border-gray-300 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <div />
          )}

          {/* Akun Google */}
          <div className="flex items-center gap-2.5">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-800 leading-tight">{session.user.name}</p>
              <p className="text-xs text-gray-400">{session.user.email}</p>
            </div>
            {session.user.image && (
              <img src={session.user.image} alt="avatar"
                   className="w-8 h-8 rounded-full border border-gray-200" />
            )}
          </div>
        </header>

        {/* Konten */}
        <main className="flex-1 px-8 py-8 overflow-y-auto">
          {activeMenu === "daftar"      && <DaftarKlaim key={claimsRefreshKey} session={session} search={search}
                                              onOpenForm={(id) => { setRewardOpenId(id); setActiveMenu("reward"); }} />}
          {activeMenu === "reward"      && <KonfirmasiReward session={session} initialClaimId={rewardOpenId} onClearInitial={() => setRewardOpenId(null)} />}
          {activeMenu === "visualisasi" && <VisualisasiData />}
          {activeMenu === "sk-rektor"   && <SKRektor />}
        </main>
      </div>

      {/* ── Wizard Tambah Klaim ── */}
      {showTambah && (
        <TambahKlaimWizard
          session={session}
          onClose={() => setShowTambah(false)}
          onSuccess={handleClaimSuccess}
        />
      )}
    </div>
  );
}
