"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

// ── Konstanta ─────────────────────────────────────────────────────────────────
const KOMPETISI_PUSPRESNAS = [
  "PKM", "PPK ORMAWA", "P2MW", "NUDC", "KDMI",
  "ONMIPA", "KBMK", "GEMASTIK", "PILMAPRES",
];

const TAHUN_INI = new Date().getFullYear();

// ── Helper UI ─────────────────────────────────────────────────────────────────
function Label({ children, required }) {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {children} {required && <span className="text-red-500">*</span>}
    </label>
  );
}

function Input({ error, ...props }) {
  return (
    <>
      <input
        className={`block w-full px-3 py-2 border rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500
          ${error ? "border-red-400 bg-red-50" : "border-gray-300"}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </>
  );
}

function Select({ children, error, ...props }) {
  return (
    <>
      <select
        className={`block w-full px-3 py-2 border rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500
          ${error ? "border-red-400 bg-red-50" : "border-gray-300"}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </>
  );
}

function FileInput({ label, name, onChange, required, hint, currentFile, existingPath, error }) {
  const existingFilename = existingPath ? existingPath.split(/[\\/]/).pop() : null;
  const existingUrl      = existingFilename ? `http://127.0.0.1:8000/uploads/${existingFilename}` : null;
  const hasExisting      = !!existingUrl;
  // Jika ada file lama, upload jadi opsional (tidak wajib)
  const isRequired = required && !hasExisting;

  return (
    <div>
      <Label required={isRequired}>{label}</Label>
      {hint && <p className="text-xs text-gray-400 mb-1">{hint}</p>}

      {/* File lama — tampil jika ada dan belum diganti */}
      {hasExisting && !currentFile && (
        <div className="mb-1.5 flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
          <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs text-green-700 flex-1 truncate">File tersimpan: {existingFilename}</span>
          <a href={existingUrl} target="_blank" rel="noopener noreferrer"
             className="text-xs text-blue-600 hover:underline flex-shrink-0">Lihat ↗</a>
        </div>
      )}

      <input
        type="file"
        name={name}
        onChange={onChange}
        accept=".pdf"
        className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />
      {hasExisting && !currentFile && (
        <p className="mt-0.5 text-xs text-gray-400">Kosongkan jika tidak ingin mengganti file.</p>
      )}
      {currentFile && (
        <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
          <span>✓</span>
          <span className="truncate">{currentFile.name} (akan mengganti file lama)</span>
        </p>
      )}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100 pb-2 mb-5">
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function RadioGroup({ label, name, options, value, onChange, required, error, disabled }) {
  return (
    <div>
      <Label required={required}>{label}</Label>
      <div className="flex flex-wrap gap-3 mt-1">
        {options.map((opt) => (
          <label key={opt.value} className={`flex items-center gap-2 ${disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}>
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={onChange}
              disabled={disabled}
              className="accent-blue-600"
            />
            <span className="text-sm text-gray-700">{opt.label}</span>
          </label>
        ))}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function PrefilledBadge() {
  return (
    <span className="inline-flex items-center gap-1 ml-2 px-1.5 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-600 border border-indigo-100">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
      dari pengajuan
    </span>
  );
}

// ── Halaman Utama ─────────────────────────────────────────────────────────────
export default function KonfirmasiRewardForm() {
  const { id }                      = useParams();
  const router                      = useRouter();
  const { data: session, status }   = useSession();

  const [claim,         setClaim]         = useState(null);
  const [pengajuan,     setPengajuan]     = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [notFound,      setNotFound]      = useState(false);
  const [alreadyFilled, setAlreadyFilled] = useState(false);
  const [isReturned,    setIsReturned]    = useState(false);
  const [existingReward, setExistingReward] = useState(null);
  const [submitting,    setSubmitting]    = useState(false);
  const [submitted,     setSubmitted]     = useState(false);
  const [errors,        setErrors]        = useState({});
  const [prefilledFields, setPrefilledFields] = useState(new Set());

  // NIM diambil dari email (format: NIM@students.ukdw.ac.id)
  const nim = session?.user?.email?.split("@")[0] ?? "";

  // ── State form teks ────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    tahun_klaim:            String(TAHUN_INI),
    periode:                "",
    nomor_urut_lampiran:    "",
    kategori_lomba:         "",
    kompetisi_puspresnas:   "",
    judul_lomba:            "",
    tahun_kegiatan:         String(TAHUN_INI),
    nama_ketua:             "",
    nomor_wa:               "",
    nama_pemilik_rekening:  "",
    bank:                   "BNI",
    nomor_rekening:         "",
  });

  // ── State file ─────────────────────────────────────────────────────────────
  const [files, setFiles] = useState({
    foto_buku_tabungan: null,
    foto_ktm:           null,
    foto_ktp:           null,
    pakta_integritas:   null,
    laporan_akhir:      null,
    karya_publikasi:    null,
  });

  // ── Konfirmasi ─────────────────────────────────────────────────────────────
  const [bersedia,  setBersedia]  = useState(false);
  const [dataBenar, setDataBenar] = useState(false);

  // ── Computed helpers ───────────────────────────────────────────────────────
  const isPuspresnas    = form.kategori_lomba === "puspresnas";
  const isNonPuspresnas = form.kategori_lomba === "non_puspresnas";
  const isPublikasi     = form.kategori_lomba === "publikasi";
  const kategoriDipilih = isPuspresnas || isNonPuspresnas || isPublikasi;

  // ── Fetch data klaim + pengajuan + cek apakah sudah pernah submit ────────
  useEffect(() => {
    Promise.all([
      fetch(`http://127.0.0.1:8000/claims/${id}`),
      fetch(`http://127.0.0.1:8000/reward-konfirmasi/${id}`),
      fetch(`http://127.0.0.1:8000/pengajuan/by-claim/${id}`),
    ]).then(async ([claimRes, rewardRes, pengajuanRes]) => {
      if (claimRes.status === 404) { setNotFound(true); return; }
      const claimData = await claimRes.json();
      setClaim(claimData);

      // ── Pre-fill dari data pengajuan ──────────────────────────────────
      const filled = new Set();
      if (pengajuanRes.ok) {
        const pData = await pengajuanRes.json();
        setPengajuan(pData);
        const updates = {};
        if (pData.nama_ketua) {
          updates.nama_ketua = pData.nama_ketua;
          filled.add("nama_ketua");
        }
        if (pData.nomor_wa) {
          updates.nomor_wa = pData.nomor_wa;
          filled.add("nomor_wa");
        }
        if (pData.nama_kegiatan) {
          updates.judul_lomba = pData.nama_kegiatan;
          filled.add("judul_lomba");
        }
        if (pData.tahun_kegiatan) {
          updates.tahun_kegiatan = String(pData.tahun_kegiatan);
          filled.add("tahun_kegiatan");
        }
        if (pData.kategori_simkatmawa === "rekognisi") {
          updates.kategori_lomba = "publikasi";
          filled.add("kategori_lomba");
        }
        if (Object.keys(updates).length > 0) {
          setForm(f => ({ ...f, ...updates }));
        }
      } else if (claimData.tanggal) {
        setForm(f => ({ ...f, tahun_kegiatan: claimData.tanggal.substring(0, 4) }));
      }
      setPrefilledFields(filled);

      // ── Cek reward lama ───────────────────────────────────────────────
      if (rewardRes.ok) {
        const rewardData = await rewardRes.json();
        setExistingReward(rewardData);
        if (rewardData.reward_status === "dikembalikan") {
          setIsReturned(true);
          setForm(f => ({
            ...f,
            tahun_klaim:           rewardData.tahun_klaim           ?? f.tahun_klaim,
            periode:               rewardData.periode               ?? f.periode,
            nomor_urut_lampiran:   rewardData.nomor_urut_lampiran   ?? f.nomor_urut_lampiran,
            kategori_lomba:        filled.has("kategori_lomba") ? f.kategori_lomba : (rewardData.kategori_lomba ?? f.kategori_lomba),
            kompetisi_puspresnas:  rewardData.kompetisi_puspresnas  ?? f.kompetisi_puspresnas,
            judul_lomba:           filled.has("judul_lomba")    ? f.judul_lomba    : (rewardData.judul_lomba    ?? f.judul_lomba),
            tahun_kegiatan:        filled.has("tahun_kegiatan") ? f.tahun_kegiatan : (rewardData.tahun_kegiatan ?? f.tahun_kegiatan),
            nama_ketua:            filled.has("nama_ketua")     ? f.nama_ketua     : (rewardData.nama_ketua     ?? f.nama_ketua),
            nomor_wa:              filled.has("nomor_wa")       ? f.nomor_wa       : (rewardData.nomor_wa       ?? f.nomor_wa),
            nama_pemilik_rekening: rewardData.nama_pemilik_rekening ?? f.nama_pemilik_rekening,
            bank:                  rewardData.bank                  ?? f.bank,
            nomor_rekening:        rewardData.nomor_rekening        ?? f.nomor_rekening,
          }));
        } else {
          setAlreadyFilled(true);
        }
      }
    }).catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  // Pre-fill nama dari session Google (hanya jika belum di-prefill dari pengajuan)
  useEffect(() => {
    if (session?.user?.name) {
      setForm(f => ({
        ...f,
        nama_ketua: prefilledFields.has("nama_ketua") ? f.nama_ketua : (f.nama_ketua || session.user.name),
      }));
    }
  }, [session, prefilledFields]);

  // ── Handler ────────────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: "" }));
  };

  const handleFileChange = (e) => {
    const { name, files: fileList } = e.target;
    setFiles(f => ({ ...f, [name]: fileList[0] || null }));
    setErrors(prev => ({ ...prev, [name]: "" }));
  };

  // ── Validasi ───────────────────────────────────────────────────────────────
  const validate = () => {
    const errs = {};
    if (!form.periode)                                          errs.periode               = "Wajib dipilih";
    if (!form.nomor_urut_lampiran.trim())                       errs.nomor_urut_lampiran   = "Wajib diisi";
    if (!form.kategori_lomba)                                   errs.kategori_lomba        = "Wajib dipilih";
    if (isPuspresnas && !form.kompetisi_puspresnas)             errs.kompetisi_puspresnas  = "Wajib dipilih";
    if ((isPuspresnas || isNonPuspresnas) && !form.judul_lomba.trim()) errs.judul_lomba    = "Wajib diisi";
    if (!form.nama_ketua.trim())                                errs.nama_ketua            = "Wajib diisi";
    if (!form.nomor_wa.trim())                                  errs.nomor_wa              = "Wajib diisi";
    if (!form.nama_pemilik_rekening.trim())                     errs.nama_pemilik_rekening = "Wajib diisi";
    if (kategoriDipilih && !form.nomor_rekening.trim())         errs.nomor_rekening        = "Wajib diisi";
    // File wajib upload hanya jika belum ada file lama (mode kirim pertama kali)
    const ex = existingReward;
    if (!files.foto_buku_tabungan && !ex?.foto_buku_tabungan_path) errs.foto_buku_tabungan = "Wajib diupload";
    if (!files.foto_ktm           && !ex?.foto_ktm_path)           errs.foto_ktm           = "Wajib diupload";
    if (!files.foto_ktp           && !ex?.foto_ktp_path)           errs.foto_ktp           = "Wajib diupload";
    if (!files.pakta_integritas   && !ex?.pakta_integritas_path)   errs.pakta_integritas   = "Wajib diupload";
    if ((isPuspresnas || isNonPuspresnas) && !files.laporan_akhir && !ex?.laporan_akhir_path)
      errs.laporan_akhir = "Wajib diupload";
    if (isPublikasi && !files.karya_publikasi && !ex?.karya_publikasi_path)
      errs.karya_publikasi = "Wajib diupload";
    if (!bersedia)  errs.bersedia  = "Wajib dicentang";
    if (!dataBenar) errs.data_benar = "Wajib dicentang";
    return errs;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      // scroll ke atas untuk lihat error
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setSubmitting(true);
    const formData = new FormData();

    formData.append("claim_id",       id);
    formData.append("mahasiswa_email", session.user.email);
    formData.append("nim",            nim);
    formData.append("bersedia",       String(bersedia));
    formData.append("data_benar",     String(dataBenar));

    Object.entries(form).forEach(([key, value]) => {
      if (value !== undefined && value !== null) formData.append(key, value);
    });

    Object.entries(files).forEach(([key, file]) => {
      if (file) formData.append(key, file);
    });

    try {
      const url    = isReturned
        ? `http://127.0.0.1:8000/reward-konfirmasi/${existingReward.id}`
        : "http://127.0.0.1:8000/reward-konfirmasi";
      const method = isReturned ? "PUT" : "POST";

      const res = await fetch(url, { method, body: formData });
      if (res.ok) {
        setSubmitted(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        const err = await res.json();
        alert("Gagal mengirim: " + err.detail);
      }
    } catch {
      alert("Terjadi kesalahan. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Guard states ───────────────────────────────────────────────────────────
  if (status === "loading" || loading) {
    return <p className="text-center mt-20 text-gray-400">Memuat data...</p>;
  }

  if (status === "unauthenticated") {
    router.replace("/");
    return null;
  }

  if (notFound) return (
    <div className="text-center mt-20">
      <p className="text-gray-500">Klaim tidak ditemukan.</p>
      <Link href="/mahasiswa/dashboard" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
        ← Kembali ke Dashboard
      </Link>
    </div>
  );

  // ── Sukses ─────────────────────────────────────────────────────────────────
  if (submitted || alreadyFilled) return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-8">
      <div className="max-w-2xl mx-auto text-center space-y-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          {alreadyFilled && !submitted ? "Data Sudah Dikirim" : submitted && isReturned ? "Data Berhasil Diperbaiki!" : "Data Berhasil Dikirim!"}
        </h1>
        <p className="text-gray-500 text-sm">
          {alreadyFilled && !submitted
            ? "Kamu sudah pernah mengisi data reward untuk klaim ini."
            : submitted && isReturned
            ? `Data reward untuk klaim "${claim?.nama_lomba}" telah diperbaiki dan dikirim ulang. Operator akan meninjau kembali.`
            : `Data rekening untuk klaim "${claim?.nama_lomba}" telah berhasil dikirimkan. Divisi Bakat Minat akan segera memproses reward kamu.`
          }
        </p>
        <Link
          href="/mahasiswa/dashboard"
          className="inline-block mt-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          Kembali ke Dashboard
        </Link>
      </div>
    </main>
  );

  // ── Form ───────────────────────────────────────────────────────────────────
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-8">
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Header */}
        <div>
          <Link href="/mahasiswa/dashboard" className="text-sm text-blue-600 hover:underline">
            ← Kembali ke Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Konfirmasi Data Reward</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Klaim: <span className="font-medium text-gray-700">{claim?.nama_lomba}</span>
            <span className="mx-2 text-gray-300">|</span>
            <span className="text-gray-600">{claim?.peringkat} · {claim?.tingkat}</span>
          </p>
        </div>

        {/* Banner dikembalikan */}
        {isReturned && existingReward?.catatan_operator && (
          <div className="bg-orange-50 border border-orange-300 rounded-xl px-5 py-4">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-orange-800 mb-1">Form dikembalikan oleh Operator</p>
                <p className="text-sm text-orange-700">{existingReward.catatan_operator}</p>
                <p className="text-xs text-orange-500 mt-1">Perbaiki data di bawah, lalu kirim ulang. File yang tidak diganti akan tetap digunakan.</p>
              </div>
            </div>
          </div>
        )}

        {/* Error summary */}
        {hasErrors && (
          <div className="bg-red-50 border border-red-300 rounded-xl px-5 py-3 text-sm text-red-700">
            Terdapat beberapa field yang belum diisi dengan benar. Mohon periksa kembali.
          </div>
        )}

        {/* Info banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 text-sm text-blue-800 space-y-1">
          <p className="font-semibold">Pengumpulan Data Rekening Penerima Prestasi</p>
          <p>Kategori Kelompok hanya diisi oleh <span className="font-medium">Ketua Kelompok</span> sesuai data yang terlampir di surat.</p>
          <p>
            📣 Konsultasi:{" "}
            <a href="https://wa.me/6281336660839" target="_blank" rel="noopener noreferrer"
               className="underline hover:text-blue-600">
              Divisi Bakat Minat
            </a>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* ── Info Dasar ── */}
          <SectionCard title="Informasi Dasar">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tahun Klaim</Label>
                <p className="text-xs text-gray-400 mb-1">Tahun klaim saat ini, bukan tahun lomba.</p>
                <Input
                  type="text"
                  value={form.tahun_klaim}
                  disabled
                />
              </div>
              <div>
                <Label required>Nomor Urut pada Lampiran</Label>
                <p className="text-xs text-gray-400 mb-1">Sesuai Surat Pemberitahuan.</p>
                <Input
                  type="text"
                  name="nomor_urut_lampiran"
                  value={form.nomor_urut_lampiran}
                  onChange={handleChange}
                  placeholder="Contoh: 3"
                  error={errors.nomor_urut_lampiran}
                />
              </div>
            </div>

            <RadioGroup
              label="Klaim di Periode ke?"
              name="periode"
              required
              value={form.periode}
              onChange={handleChange}
              error={errors.periode}
              options={[
                { value: "1", label: "1 — Periode Februari - Juli" },
                { value: "2", label: "2 — Periode Agustus - November" },
              ]}
            />

            <div>
              <RadioGroup
                label={<>Kategori Lomba{prefilledFields.has("kategori_lomba") && <PrefilledBadge />}</>}
                name="kategori_lomba"
                required={!prefilledFields.has("kategori_lomba")}
                value={form.kategori_lomba}
                onChange={handleChange}
                error={errors.kategori_lomba}
                disabled={prefilledFields.has("kategori_lomba")}
                options={[
                  { value: "puspresnas",     label: "PUSPRESNAS (PKM, PPK Ormawa, P2MW, Gemastik, NUDC, KDMI, ONMIPA, dll)" },
                  { value: "non_puspresnas", label: "Non PUSPRESNAS" },
                  { value: "publikasi",      label: "Publikasi / Karya / HKI" },
                ]}
              />
              {prefilledFields.has("kategori_lomba") && (
                <p className="mt-1 text-xs text-indigo-500">Diisi otomatis berdasarkan kategori SimKatmawa pada pengajuan klaim.</p>
              )}
            </div>
          </SectionCard>

          {/* ── Detail Kegiatan (muncul setelah kategori dipilih) ── */}
          {kategoriDipilih && (
            <SectionCard title="Detail Kegiatan">
              {isPuspresnas && (
                <div>
                  <Label required>Kompetisi PUSPRESNAS</Label>
                  <Select
                    name="kompetisi_puspresnas"
                    value={form.kompetisi_puspresnas}
                    onChange={handleChange}
                    error={errors.kompetisi_puspresnas}
                  >
                    <option value="">Pilih kompetisi</option>
                    {KOMPETISI_PUSPRESNAS.map(k => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </Select>
                </div>
              )}

              {(isPuspresnas || isNonPuspresnas) && (
                <div>
                  <Label required={!prefilledFields.has("judul_lomba")}>
                    Judul Lomba / Proposal{prefilledFields.has("judul_lomba") && <PrefilledBadge />}
                  </Label>
                  {prefilledFields.has("judul_lomba")
                    ? <p className="text-xs text-gray-400 mb-1">Diisi otomatis dari nama kegiatan pada pengajuan klaim.</p>
                    : <p className="text-xs text-gray-400 mb-1">Pastikan sama dengan pengumpulan prestasi sebelumnya.</p>
                  }
                  <Input
                    type="text"
                    name="judul_lomba"
                    value={form.judul_lomba}
                    onChange={handleChange}
                    placeholder="Masukkan judul lomba atau proposal"
                    error={errors.judul_lomba}
                    disabled={prefilledFields.has("judul_lomba")}
                  />
                </div>
              )}

              <div>
                <Label>
                  Tahun Kegiatan{prefilledFields.has("tahun_kegiatan") && <PrefilledBadge />}
                </Label>
                <p className="text-xs text-gray-400 mb-1">
                  {prefilledFields.has("tahun_kegiatan")
                    ? "Diisi otomatis dari tahun kegiatan pada pengajuan klaim."
                    : "Diambil otomatis dari tanggal klaim."}
                </p>
                <Input
                  type="text"
                  value={form.tahun_kegiatan}
                  disabled
                />
              </div>
            </SectionCard>
          )}

          {/* ── Data Diri ── */}
          {kategoriDipilih && (
            <SectionCard title="Data Diri">
              <div>
                <Label required={!prefilledFields.has("nama_ketua")}>
                  Nama Lengkap Ketua{prefilledFields.has("nama_ketua") && <PrefilledBadge />}
                </Label>
                <Input
                  type="text"
                  name="nama_ketua"
                  value={form.nama_ketua}
                  onChange={handleChange}
                  placeholder="Nama lengkap sesuai KTP"
                  error={errors.nama_ketua}
                  disabled={prefilledFields.has("nama_ketua")}
                />
              </div>

              <div>
                <Label>NIM</Label>
                <Input type="text" value={nim} disabled />
              </div>

              <div>
                <Label required={!prefilledFields.has("nomor_wa")}>
                  Nomor WhatsApp{prefilledFields.has("nomor_wa") && <PrefilledBadge />}
                </Label>
                <Input
                  type="text"
                  name="nomor_wa"
                  value={form.nomor_wa}
                  onChange={handleChange}
                  placeholder="Contoh: 08123456789"
                  error={errors.nomor_wa}
                  disabled={prefilledFields.has("nomor_wa")}
                />
              </div>
            </SectionCard>
          )}

          {/* ── Data Rekening ── */}
          {kategoriDipilih && (
            <SectionCard title="Data Rekening">
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-xs text-amber-800">
                Rekening yang digunakan hanya <span className="font-semibold">Bank BNI</span>.
              </div>

              <div>
                <Label required>Nama Lengkap Pemilik Rekening</Label>
                <p className="text-xs text-gray-400 mb-1">Pastikan isi dengan lengkap dan benar agar tidak terjadi kendala.</p>
                <Input
                  type="text"
                  name="nama_pemilik_rekening"
                  value={form.nama_pemilik_rekening}
                  onChange={handleChange}
                  placeholder="Nama sesuai buku tabungan"
                  error={errors.nama_pemilik_rekening}
                />
              </div>

              <div>
                <Label>Bank</Label>
                <Input type="text" value="BNI" disabled />
              </div>

              <div>
                <Label required>Nomor Rekening</Label>
                <Input
                  type="text"
                  name="nomor_rekening"
                  value={form.nomor_rekening}
                  onChange={handleChange}
                  placeholder="Masukkan nomor rekening BNI"
                  error={errors.nomor_rekening}
                />
              </div>
            </SectionCard>
          )}

          {/* ── Upload Dokumen ── */}
          {kategoriDipilih && (
            <SectionCard title="Upload Dokumen">
              <p className="text-xs text-gray-400 -mt-2">Semua dokumen dalam format PDF.</p>

              <div className="grid grid-cols-1 gap-5">
                <FileInput
                  label="Foto Buku Tabungan"
                  name="foto_buku_tabungan"
                  onChange={handleFileChange}
                  required
                  hint={`Format nama file: ${isPuspresnas ? (form.kompetisi_puspresnas || "KategoriKompetisi") : isNonPuspresnas ? "NonPUSPRESNAS" : "Publikasi"}_${form.nama_pemilik_rekening || "NamaPemilik"}_Buku Tabungan`}
                  currentFile={files.foto_buku_tabungan}
                  existingPath={existingReward?.foto_buku_tabungan_path}
                  error={errors.foto_buku_tabungan}
                />

                <FileInput
                  label="Foto Scan KTM"
                  name="foto_ktm"
                  onChange={handleFileChange}
                  required
                  hint={`Format nama file: ${isPuspresnas ? (form.kompetisi_puspresnas || "KategoriKompetisi") : isNonPuspresnas ? "NonPUSPRESNAS" : "Publikasi"}_${form.nama_pemilik_rekening || "NamaPemilik"}_KTM`}
                  currentFile={files.foto_ktm}
                  existingPath={existingReward?.foto_ktm_path}
                  error={errors.foto_ktm}
                />

                <FileInput
                  label="Foto Scan KTP"
                  name="foto_ktp"
                  onChange={handleFileChange}
                  required
                  hint={`Format nama file: ${isPuspresnas ? (form.kompetisi_puspresnas || "KategoriKompetisi") : isNonPuspresnas ? "NonPUSPRESNAS" : "Publikasi"}_${form.nama_pemilik_rekening || "NamaPemilik"}_KTP`}
                  currentFile={files.foto_ktp}
                  existingPath={existingReward?.foto_ktp_path}
                  error={errors.foto_ktp}
                />

                <div>
                  <FileInput
                    label="Pakta Integritas"
                    name="pakta_integritas"
                    onChange={handleFileChange}
                    required
                    currentFile={files.pakta_integritas}
                    existingPath={existingReward?.pakta_integritas_path}
                    error={errors.pakta_integritas}
                  />
                  <p className="mt-1 text-xs text-blue-600">
                    Unduh template:{" "}
                    <span className="underline cursor-pointer">Template Pakta Integritas Kelompok/Individu</span>
                  </p>
                </div>

                {(isPuspresnas || isNonPuspresnas) && (
                  <FileInput
                    label="Laporan Akhir / Proposal / Karya Terakhir"
                    name="laporan_akhir"
                    onChange={handleFileChange}
                    required
                    hint="Lampirkan Laporan Akhir / Proposal Akhir / Karya / Bukti Pendukung."
                    currentFile={files.laporan_akhir}
                    existingPath={existingReward?.laporan_akhir_path}
                    error={errors.laporan_akhir}
                  />
                )}

                {isPublikasi && (
                  <FileInput
                    label="Karya Publikasi"
                    name="karya_publikasi"
                    onChange={handleFileChange}
                    required
                    hint="Lampirkan karya publikasi."
                    currentFile={files.karya_publikasi}
                    existingPath={existingReward?.karya_publikasi_path}
                    error={errors.karya_publikasi}
                  />
                )}
              </div>
            </SectionCard>
          )}

          {/* ── Konfirmasi ── */}
          {kategoriDipilih && (
            <SectionCard title="Konfirmasi">
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bersedia}
                    onChange={e => { setBersedia(e.target.checked); setErrors(prev => ({ ...prev, bersedia: "" })); }}
                    className="mt-0.5 accent-blue-600 w-4 h-4 flex-shrink-0"
                  />
                  <span className="text-sm text-gray-700">
                    Saya bersedia mengikuti proses yang ada.
                  </span>
                </label>
                {errors.bersedia && <p className="text-xs text-red-500 pl-7">{errors.bersedia}</p>}

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dataBenar}
                    onChange={e => { setDataBenar(e.target.checked); setErrors(prev => ({ ...prev, data_benar: "" })); }}
                    className="mt-0.5 accent-blue-600 w-4 h-4 flex-shrink-0"
                  />
                  <span className="text-sm text-gray-700">
                    Saya sudah mengisi data dengan <span className="font-medium">sadar dan benar</span>.
                  </span>
                </label>
                {errors.data_benar && <p className="text-xs text-red-500 pl-7">{errors.data_benar}</p>}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {submitting ? "Mengirim..." : "Kirim Data Reward"}
                </button>
              </div>
            </SectionCard>
          )}

        </form>
      </div>
    </main>
  );
}
