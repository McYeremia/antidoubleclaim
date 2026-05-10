"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const apiFetch = (url, options = {}) => fetch(url, { ...options, headers: { "ngrok-skip-browser-warning": "true", ...(options.headers || {}) } });

// ── Konstanta ─────────────────────────────────────────────────────────────────
const KOMPETISI_PUSPRESNAS = [
  "PKM", "PPK ORMAWA", "P2MW", "NUDC", "KDMI",
  "ONMIPA", "KBMK", "GEMASTIK", "PILMAPRES",
];

const TAHUN_INI = new Date().getFullYear();

// ── Helper UI ─────────────────────────────────────────────────────────────────
function Label({ children, required }) {
  return (
    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">
      {children} {required && <span className="text-red-500">*</span>}
    </label>
  );
}

function Input({ error, ...props }) {
  return (
    <>
      <input
        className={`block w-full px-4 py-3 bg-gray-50 border rounded-2xl text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all disabled:opacity-60
          ${error ? "border-red-400" : "border-gray-200"}`}
        {...props}
      />
      {error && <p className="mt-1.5 text-[11px] font-bold text-red-500 ml-1">{error}</p>}
    </>
  );
}

function Select({ children, error, ...props }) {
  return (
    <>
      <select
        className={`block w-full px-4 py-3 bg-gray-50 border rounded-2xl text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all
          ${error ? "border-red-400" : "border-gray-200"}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="mt-1.5 text-[11px] font-bold text-red-500 ml-1">{error}</p>}
    </>
  );
}

function FileInput({ label, name, onChange, required, hint, currentFile, existingPath, error }) {
  const existingFilename = existingPath ? existingPath.split(/[\\/]/).pop() : null;
  const existingUrl      = existingFilename ? `/api/file?name=${existingFilename}` : null;
  const hasExisting      = !!existingUrl;
  const isRequired = required && !hasExisting;

  return (
    <div>
      <Label required={isRequired}>{label}</Label>
      {hint && <p className="text-[11px] text-gray-400 mb-2 ml-1 italic">{hint}</p>}

      {hasExisting && !currentFile && (
        <div className="mb-3 flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-100 rounded-2xl">
          <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-[12px] text-green-700 font-bold flex-1 truncate uppercase tracking-tight">Tersimpan: {existingFilename}</span>
          <a href={existingUrl} target="_blank" rel="noopener noreferrer"
             className="text-[11px] font-black text-[#046137] hover:underline flex-shrink-0">LIHAT ↗</a>
        </div>
      )}

      <div className="relative group">
        <input
          type="file"
          name={name}
          onChange={onChange}
          accept=".pdf"
          className="block w-full text-[12px] text-gray-400 file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-[11px] file:font-black file:bg-[#046137] file:text-white hover:file:bg-[#035230] cursor-pointer"
        />
      </div>
      
      {hasExisting && !currentFile && (
        <p className="mt-2 text-[10px] text-gray-300 font-bold uppercase tracking-widest ml-1">Kosongkan jika tidak ingin mengganti file.</p>
      )}
      {currentFile && (
        <p className="mt-2 text-[11px] text-[#046137] font-bold flex items-center gap-1 ml-1 animate-in fade-in">
          <span>✓</span>
          <span className="truncate">{currentFile.name} (akan mengganti file lama)</span>
        </p>
      )}
      {error && <p className="mt-1.5 text-[11px] font-bold text-red-500 ml-1">{error}</p>}
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 p-8 space-y-6">
      <h2 className="text-[11px] font-black text-gray-300 uppercase tracking-[0.3em] border-b border-gray-50 pb-3">
        {title}
      </h2>
      <div className="space-y-6">{children}</div>
    </div>
  );
}

function RadioGroup({ label, name, options, value, onChange, required, error, disabled }) {
  return (
    <div>
      <Label required={required}>{label}</Label>
      <div className="grid grid-cols-1 gap-3 mt-2">
        {options.map((opt) => (
          <label key={opt.value} className={`flex items-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer
            ${value === opt.value ? "bg-[#046137] border-[#046137] text-white" : "bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100"}
            ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}>
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={onChange}
              disabled={disabled}
              className="hidden"
            />
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0
              ${value === opt.value ? "border-white" : "border-gray-300"}`}>
              {value === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
            <span className="text-[13px] font-bold tracking-tight">{opt.label}</span>
          </label>
        ))}
      </div>
      {error && <p className="mt-2 text-[11px] font-bold text-red-500 ml-1">{error}</p>}
    </div>
  );
}

function PrefilledBadge() {
  return (
    <span className="inline-flex items-center gap-1 ml-3 px-2 py-0.5 rounded-lg text-[10px] font-black bg-[#f0f7f3] text-[#046137] uppercase tracking-widest border border-[#d4ebe0]">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
      SYSTEM FILL
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

  const nim = session?.user?.email?.split("@")[0] ?? "";

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

  const [files, setFiles] = useState({
    foto_buku_tabungan: null,
    foto_ktm:           null,
    foto_ktp:           null,
    pakta_integritas:   null,
    laporan_akhir:      null,
    karya_publikasi:    null,
  });

  const [bersedia,  setBersedia]  = useState(false);
  const [dataBenar, setDataBenar] = useState(false);

  const isPuspresnas    = form.kategori_lomba === "puspresnas";
  const isNonPuspresnas = form.kategori_lomba === "non_puspresnas";
  const isPublikasi     = form.kategori_lomba === "publikasi";
  const kategoriDipilih = isPuspresnas || isNonPuspresnas || isPublikasi;

  useEffect(() => {
    Promise.all([
      apiFetch(`${API_URL}/claims/${id}`),
      apiFetch(`${API_URL}/reward-konfirmasi/${id}`),
      apiFetch(`${API_URL}/pengajuan/by-claim/${id}`),
    ]).then(async ([claimRes, rewardRes, pengajuanRes]) => {
      if (claimRes.status === 404) { setNotFound(true); return; }
      const claimData = await claimRes.json();
      setClaim(claimData);

      const filled = new Set();
      if (pengajuanRes.ok) {
        const pData = await pengajuanRes.json();
        setPengajuan(pData);
        const updates = {};
        if (pData.nama_ketua) { updates.nama_ketua = pData.nama_ketua; filled.add("nama_ketua"); }
        if (pData.nomor_wa) { updates.nomor_wa = pData.nomor_wa; filled.add("nomor_wa"); }
        if (pData.nama_kegiatan) { updates.judul_lomba = pData.nama_kegiatan; filled.add("judul_lomba"); }
        if (pData.tahun_kegiatan) { updates.tahun_kegiatan = String(pData.tahun_kegiatan); filled.add("tahun_kegiatan"); }
        if (pData.kategori_simkatmawa === "rekognisi") { updates.kategori_lomba = "publikasi"; filled.add("kategori_lomba"); }
        if (Object.keys(updates).length > 0) setForm(f => ({ ...f, ...updates }));
      } else if (claimData.tanggal) {
        setForm(f => ({ ...f, tahun_kegiatan: claimData.tanggal.substring(0, 4) }));
      }
      setPrefilledFields(filled);

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
        } else setAlreadyFilled(true);
      }
    }).catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (session?.user?.name) {
      setForm(f => ({ ...f, nama_ketua: prefilledFields.has("nama_ketua") ? f.nama_ketua : (f.nama_ketua || session.user.name) }));
    }
  }, [session, prefilledFields]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    setErrors({});
  };

  const handleFileChange = (e) => {
    const { name, files: fileList } = e.target;
    const file = fileList[0] || null;
    if (file && file.size > 3 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, [name]: "Ukuran file maksimal 3 MB" }));
      e.target.value = "";
      return;
    }
    setFiles(f => ({ ...f, [name]: file }));
    setErrors({});
  };

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
    const ex = existingReward;
    if (!files.foto_buku_tabungan && !ex?.foto_buku_tabungan_path) errs.foto_buku_tabungan = "Wajib diupload";
    if (!files.foto_ktm           && !ex?.foto_ktm_path)           errs.foto_ktm           = "Wajib diupload";
    if (!files.foto_ktp           && !ex?.foto_ktp_path)           errs.foto_ktp           = "Wajib diupload";
    if (!files.pakta_integritas   && !ex?.pakta_integritas_path)   errs.pakta_integritas   = "Wajib diupload";
    if ((isPuspresnas || isNonPuspresnas) && !files.laporan_akhir && !ex?.laporan_akhir_path) errs.laporan_akhir = "Wajib diupload";
    if (isPublikasi && !files.karya_publikasi && !ex?.karya_publikasi_path) errs.karya_publikasi = "Wajib diupload";
    if (!bersedia)  errs.bersedia  = "Wajib dicentang";
    if (!dataBenar) errs.data_benar = "Wajib dicentang";
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    setSubmitting(true);
    const formData = new FormData();
    formData.append("claim_id", id);
    formData.append("mahasiswa_email", session.user.email);
    formData.append("nim", nim);
    formData.append("bersedia", String(bersedia));
    formData.append("data_benar", String(dataBenar));
    Object.entries(form).forEach(([key, value]) => { if (value !== undefined && value !== null) formData.append(key, value); });
    Object.entries(files).forEach(([key, file]) => { if (file) formData.append(key, file); });
    try {
      const url = isReturned ? `${API_URL}/reward-konfirmasi/${existingReward.id}` : `${API_URL}/reward-konfirmasi`;
      const method = isReturned ? "PUT" : "POST";
      const res = await apiFetch(url, { method, body: formData });
      if (res.ok) { setSubmitted(true); window.scrollTo({ top: 0, behavior: "smooth" }); }
      else { const err = await res.json(); alert("Gagal mengirim: " + err.detail); }
    } catch { alert("Terjadi kesalahan. Coba lagi."); }
    finally { setSubmitting(false); }
  };

  if (status === "loading" || loading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#f7f7f8]">
       <svg className="w-8 h-8 text-gray-200 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen bg-[#f7f7f8] flex flex-col items-center justify-center p-4">
      <div className="bg-white p-12 rounded-[32px] shadow-xl text-center border border-gray-100 max-w-sm">
        <p className="text-[16px] font-black text-gray-900 mb-2 uppercase tracking-tight">Klaim Tidak Ditemukan</p>
        <p className="text-[13px] text-gray-400 font-medium mb-8">Data tidak valid atau sudah dihapus.</p>
        <Link href="/mahasiswa/dashboard" className="inline-block px-8 py-3 bg-[#046137] text-white rounded-xl text-[12px] font-black">← KEMBALI</Link>
      </div>
    </div>
  );

  if (submitted || alreadyFilled) return (
    <main className="min-h-screen bg-[#f0f7f3] flex items-center justify-center p-4" style={{ fontFamily: "var(--font-poppins, sans-serif)" }}>
      <div className="max-w-md w-full bg-white rounded-[40px] shadow-2xl shadow-[#046137]/10 p-12 text-center border border-[#d4ebe0] animate-in zoom-in-95 duration-500">
        {/* Icon lingkaran berlapis */}
        <div className="relative w-24 h-24 mx-auto mb-8">
          <div className="absolute inset-0 rounded-full bg-[#046137]/10 animate-ping" style={{ animationDuration: "2s" }} />
          <div className="relative w-24 h-24 rounded-full bg-[#046137] flex items-center justify-center shadow-xl shadow-[#046137]/30">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <p className="text-[11px] font-black text-[#046137]/60 uppercase tracking-[0.25em] mb-2">
          {alreadyFilled && !submitted ? "Status Pengajuan" : "Konfirmasi Reward"}
        </p>
        <h1 className="text-[26px] font-black text-gray-900 leading-tight tracking-tight mb-4">
          {alreadyFilled && !submitted ? "Data Sudah Dikirim" : "Pengiriman Berhasil!"}
        </h1>
        <p className="text-[13px] text-gray-400 font-medium leading-relaxed mb-3">
          {alreadyFilled && !submitted
            ? "Anda telah menyelesaikan proses pengisian data reward untuk klaim prestasi ini."
            : "Data rekening telah kami terima dan akan segera diproses oleh Divisi Bakat Minat UKDW."
          }
        </p>

        <div className="flex items-center justify-center gap-2 mb-10">
          <span className="w-1.5 h-1.5 rounded-full bg-[#046137]" />
          <p className="text-[11px] font-semibold text-[#046137]">Universitas Kristen Duta Wacana</p>
          <span className="w-1.5 h-1.5 rounded-full bg-[#046137]" />
        </div>

        <Link href="/mahasiswa/dashboard"
          className="w-full inline-flex items-center justify-center gap-2 py-4 bg-[#046137] text-white rounded-2xl text-[13px] font-black uppercase tracking-widest hover:bg-[#035230] active:scale-95 transition-all shadow-lg shadow-[#046137]/25">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Kembali ke Dashboard
        </Link>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#f7f7f8] py-12 px-4 sm:px-10" style={{ fontFamily: "var(--font-poppins, sans-serif)" }}>
      <div className="max-w-2xl mx-auto space-y-10 animate-in fade-in duration-500">

        {/* Header */}
        <div className="flex flex-col gap-4">
          <Link href="/mahasiswa/dashboard" className="text-[11px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-900 transition-colors flex items-center gap-2">
             <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
             Dashboard
          </Link>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Konfirmasi Reward</h1>
          <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm">
             <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-1">Klaim Terkait</p>
             <p className="text-[15px] font-black text-gray-900">{claim?.nama_lomba}</p>
             <div className="flex items-center gap-2 mt-2">
                <span className="text-[11px] font-bold text-gray-400 uppercase">{claim?.peringkat}</span>
                <span className="w-1 h-1 rounded-full bg-gray-200" />
                <span className="text-[11px] font-bold text-gray-400 uppercase">{claim?.tingkat}</span>
             </div>
          </div>
        </div>

        {isReturned && existingReward?.catatan_operator && (
          <div className="bg-orange-900 rounded-[24px] p-8 text-white shadow-xl shadow-orange-200">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                 <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <p className="text-[11px] font-black text-orange-400 uppercase tracking-widest mb-1">Catatan Revisi Operator</p>
                <p className="text-[14px] font-bold leading-relaxed">{existingReward.catatan_operator}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <SectionCard title="Parameter Administrasi">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label>Tahun Klaim</Label>
                <Input type="text" value={form.tahun_klaim} disabled />
              </div>
              <div>
                <Label required>No. Urut Lampiran</Label>
                <Input type="text" name="nomor_urut_lampiran" value={form.nomor_urut_lampiran} onChange={handleChange} placeholder="Lihat di SK" error={errors.nomor_urut_lampiran} />
              </div>
            </div>
            <RadioGroup label="Periode Pengajuan" name="periode" required value={form.periode} onChange={handleChange} error={errors.periode} options={[{ value: "1", label: "Periode 1 (Feb - Jul)" }, { value: "2", label: "Periode 2 (Agt - Nov)" }]} />
            <RadioGroup label={<>Kategori Lomba{prefilledFields.has("kategori_lomba") && <PrefilledBadge />}</>} name="kategori_lomba" required={!prefilledFields.has("kategori_lomba")} value={form.kategori_lomba} onChange={handleChange} error={errors.kategori_lomba} disabled={prefilledFields.has("kategori_lomba")} options={[{ value: "puspresnas", label: "PUSPRESNAS" }, { value: "non_puspresnas", label: "NON PUSPRESNAS" }, { value: "publikasi", label: "PUBLIKASI / KARYA" }]} />
          </SectionCard>

          {kategoriDipilih && (
            <SectionCard title="Identitas Prestasi">
              {isPuspresnas && (
                <div>
                  <Label required>Kompetisi PUSPRESNAS</Label>
                  <Select name="kompetisi_puspresnas" value={form.kompetisi_puspresnas} onChange={handleChange} error={errors.kompetisi_puspresnas}>
                    <option value="">Pilih kompetisi</option>
                    {KOMPETISI_PUSPRESNAS.map(k => <option key={k} value={k}>{k}</option>)}
                  </Select>
                </div>
              )}
              {(isPuspresnas || isNonPuspresnas) && (
                <div>
                  <Label required={!prefilledFields.has("judul_lomba")}>Judul Lomba / Proposal{prefilledFields.has("judul_lomba") && <PrefilledBadge />}</Label>
                  <Input type="text" name="judul_lomba" value={form.judul_lomba} onChange={handleChange} placeholder="Sesuai pengajuan klaim" error={errors.judul_lomba} disabled={prefilledFields.has("judul_lomba")} />
                </div>
              )}
              <div>
                <Label>Tahun Kegiatan{prefilledFields.has("tahun_kegiatan") && <PrefilledBadge />}</Label>
                <Input type="text" value={form.tahun_kegiatan} disabled />
              </div>
            </SectionCard>
          )}

          {kategoriDipilih && (
            <SectionCard title="Profil Penerima">
              <div>
                <Label required={!prefilledFields.has("nama_ketua")}>Nama Lengkap Ketua{prefilledFields.has("nama_ketua") && <PrefilledBadge />}</Label>
                <Input type="text" name="nama_ketua" value={form.nama_ketua} onChange={handleChange} placeholder="Sesuai KTP" error={errors.nama_ketua} disabled={prefilledFields.has("nama_ketua")} />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div><Label>NIM</Label><Input type="text" value={nim} disabled /></div>
                <div><Label required={!prefilledFields.has("nomor_wa")}>WhatsApp{prefilledFields.has("nomor_wa") && <PrefilledBadge />}</Label><Input type="text" name="nomor_wa" value={form.nomor_wa} onChange={handleChange} placeholder="08..." error={errors.nomor_wa} disabled={prefilledFields.has("nomor_wa")} /></div>
              </div>
            </SectionCard>
          )}

          {kategoriDipilih && (
            <SectionCard title="Alokasi Dana (Bank BNI)">
              <div>
                <Label required>Nama Pemilik Rekening</Label>
                <Input type="text" name="nama_pemilik_rekening" value={form.nama_pemilik_rekening} onChange={handleChange} placeholder="Sesuai buku tabungan" error={errors.nama_pemilik_rekening} />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div><Label>Nama Bank</Label><Input type="text" value="BNI" disabled /></div>
                <div><Label required>Nomor Rekening</Label><Input type="text" name="nomor_rekening" value={form.nomor_rekening} onChange={handleChange} placeholder="Masukkan No. Rek" error={errors.nomor_rekening} /></div>
              </div>
            </SectionCard>
          )}

          {kategoriDipilih && (
            <SectionCard title="Dokumen Validasi (PDF)">
              <div className="grid grid-cols-1 gap-8">
                <FileInput label="Buku Tabungan" name="foto_buku_tabungan" onChange={handleFileChange} required currentFile={files.foto_buku_tabungan} existingPath={existingReward?.foto_buku_tabungan_path} error={errors.foto_buku_tabungan} />
                <FileInput label="Scan KTM" name="foto_ktm" onChange={handleFileChange} required currentFile={files.foto_ktm} existingPath={existingReward?.foto_ktm_path} error={errors.foto_ktm} />
                <FileInput label="Scan KTP" name="foto_ktp" onChange={handleFileChange} required currentFile={files.foto_ktp} existingPath={existingReward?.foto_ktp_path} error={errors.foto_ktp} />
                <FileInput label="Pakta Integritas" name="pakta_integritas" onChange={handleFileChange} required currentFile={files.pakta_integritas} existingPath={existingReward?.pakta_integritas_path} error={errors.pakta_integritas} />
                {(isPuspresnas || isNonPuspresnas) && <FileInput label="Laporan Akhir" name="laporan_akhir" onChange={handleFileChange} required hint="Proposal / Laporan / Bukti" currentFile={files.laporan_akhir} existingPath={existingReward?.laporan_akhir_path} error={errors.laporan_akhir} />}
                {isPublikasi && <FileInput label="Karya Publikasi" name="karya_publikasi" onChange={handleFileChange} required currentFile={files.karya_publikasi} existingPath={existingReward?.karya_publikasi_path} error={errors.karya_publikasi} />}
              </div>
            </SectionCard>
          )}

          {kategoriDipilih && (
            <div className="space-y-6">
              <div className="bg-[#046137] rounded-[32px] p-8 text-white space-y-4">
                <label className="flex items-start gap-4 cursor-pointer group">
                  <input type="checkbox" checked={bersedia} onChange={e => { setBersedia(e.target.checked); setErrors({}); }} className="hidden" />
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${bersedia ? "bg-[#046137] border-[#046137] shadow-lg shadow-[#046137]/30" : "border-gray-700"}`}>
                    {bersedia && <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  <span className="text-[13px] font-bold text-gray-300 group-hover:text-white transition-colors">Saya bersedia mengikuti prosedur administrasi yang ditetapkan.</span>
                </label>
                <label className="flex items-start gap-4 cursor-pointer group">
                  <input type="checkbox" checked={dataBenar} onChange={e => { setDataBenar(e.target.checked); setErrors({}); }} className="hidden" />
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${dataBenar ? "bg-[#046137] border-[#046137] shadow-lg shadow-[#046137]/30" : "border-gray-700"}`}>
                    {dataBenar && <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  <span className="text-[13px] font-bold text-gray-300 group-hover:text-white transition-colors">Data yang saya kirimkan adalah benar dan dapat dipertanggungjawabkan.</span>
                </label>
              </div>
              <button type="submit" disabled={submitting} className="w-full py-5 bg-[#046137] hover:bg-[#035230] disabled:opacity-50 text-white rounded-[24px] text-[14px] font-black uppercase tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-95 shadow-2xl shadow-gray-200">
                {submitting ? "PROSES PENGIRIMAN..." : "KIRIM KONFIRMASI REWARD"}
              </button>
            </div>
          )}
        </form>
      </div>
    </main>
  );
}
