"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import TambahKlaimWizard from "./TambahKlaimWizard";

// ── Status mahasiswa (disederhanakan) ─────────────────────────────────────────
const STATUS_LABEL = (status) =>
  status === "sudah dicek" ? "Selesai" : "Dalam Proses";

const STATUS_STYLE = (status) =>
  status === "sudah dicek"
    ? "bg-green-100 text-green-700"
    : "bg-blue-100 text-blue-700";

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
function DaftarKlaim({ session, search }) {
  const router                       = useRouter();
  const [claims, setClaims]          = useState([]);
  const [loading, setLoading]        = useState(true);
  const [selectedClaim, setSelected] = useState(null);

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`http://127.0.0.1:8000/claims?email=${encodeURIComponent(session.user.email)}`);
      const data = await res.json();
      setClaims(data);
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
                      <button
                        onClick={() => router.push(`/mahasiswa/konfirmasi-reward/${claim.id}`)}
                        className="px-3 py-1.5 rounded-md text-xs font-semibold bg-orange-500 text-white hover:bg-orange-600 transition-colors whitespace-nowrap"
                      >
                        Isi Data Reward
                      </button>
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
function KonfirmasiReward({ session }) {
  const router = useRouter();
  const [claims, setClaims]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`http://127.0.0.1:8000/claims?email=${encodeURIComponent(session.user.email)}`)
      .then(r => r.json())
      .then(data => setClaims(data.filter(c => c.status === "sudah dicek")))
      .catch(() => setClaims([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-1">Konfirmasi Reward</h2>
      <p className="text-sm text-gray-500 mb-5">
        Klaim yang telah disetujui operator memerlukan data rekening untuk pencairan reward.
      </p>

      {loading ? (
        <p className="text-center text-gray-400 py-16">Memuat data...</p>
      ) : claims.length === 0 ? (
        <div className="flex items-center justify-center h-48 bg-white rounded-xl border border-dashed border-gray-300">
          <p className="text-gray-400 text-sm">Belum ada klaim yang perlu dikonfirmasi.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Nama Lomba</th>
                <th className="px-4 py-3">Tingkat</th>
                <th className="px-4 py-3">Peringkat</th>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {claims.map(claim => (
                <tr key={claim.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{claim.nama_lomba}</td>
                  <td className="px-4 py-3 text-gray-600">{claim.tingkat}</td>
                  <td className="px-4 py-3 text-gray-600">{claim.peringkat}</td>
                  <td className="px-4 py-3 text-gray-600">{claim.tanggal}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => router.push(`/mahasiswa/konfirmasi-reward/${claim.id}`)}
                      className="px-3 py-1.5 rounded-md text-xs font-semibold bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                    >
                      Isi Data Reward
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
          {activeMenu === "daftar"      && <DaftarKlaim key={claimsRefreshKey} session={session} search={search} />}
          {activeMenu === "reward"      && <KonfirmasiReward session={session} />}
          {activeMenu === "visualisasi" && <VisualisasiData />}
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
