"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const apiFetch = (url, options = {}) => fetch(url, { ...options, headers: { "ngrok-skip-browser-warning": "true", ...(options.headers || {}) } });

const STATUS_LABEL = (s) => s === "sudah dicek" ? "Selesai" : s === "ditolak" ? "Ditolak" : "Dalam Proses";
const STATUS_STYLE = (s) => s === "sudah dicek" ? "bg-green-100 text-green-700" : s === "ditolak" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700";

const TAHUN_INI = new Date().getFullYear();
const OPT_TAHUN             = [String(TAHUN_INI), String(TAHUN_INI - 1), String(TAHUN_INI - 2)];
const OPT_KATEGORI_SIMKATMAWA = [
  { value: "lomba_mandiri_puspresnas",     label: "Lomba Mandiri — Puspresnas (DIKTI)" },
  { value: "lomba_mandiri_non_puspresnas", label: "Lomba Mandiri — Non Puspresnas (Non DIKTI)" },
  { value: "rekognisi",                    label: "Rekognisi Non-Lomba" },
];
const OPT_JENIS_KEPESERTAAN = [
  { value: "individu", label: "Individu" },
  { value: "kelompok", label: "Kelompok" },
];
const OPT_KATEGORI_LOMBA    = ["Provinsi / Wilayah", "Nasional", "Internasional"];
const OPT_TINGKATAN         = ["Internasional", "Nasional", "Provinsi"];
const OPT_MODEL_PELAKSANAAN = ["Online", "Offline"];
const OPT_CAPAIAN = [
  "Juara 1", "Juara 2", "Juara 3",
  "Harapan 1", "Harapan 2", "Harapan 3",
  "Didanai / Lolos Wilayah",
  "Apresiasi kejuaraan / Penghargaan tambahan / Juara umum",
  "Partisipasi / Delegasi / Peserta kejuaraan",
];
const OPT_KATEGORI_REKOGNISI = [
  "Karya Mahasiswa berupa teknologi tepat guna/seni budaya/produk kreatif untuk UMKM dan Industri",
  "Juri/Pelatih/Wasit",
  "Pemakalah/Speaker pada Conference/Seminar Ilmiah",
  "Narasumber pada kegiatan/seminar",
  "Peserta pameran karya seni",
  "Penulisan ISBN",
  "Paten/Paten Sederhana",
  "Publikasi jurnal nasional Sinta 1 dan 2 dan/atau internasional bereputasi sebagai penulis pertama",
  "Tuan rumah kejuaraan/kompetisi mandiri",
];
const OPT_JENIS_KARYA = ["Teknologi Tepat Guna", "Seni Budaya", "Produk Kreatif"];

const isLombaMandiri = (kat) =>
  kat === "lomba_mandiri_puspresnas" || kat === "lomba_mandiri_non_puspresnas";

const REWARD_LABEL = { menunggu: "Diproses", diproses: "Data Diterima", selesai: "Reward Dikirim", dikembalikan: "Perlu Diperbaiki", ditolak: "Ditolak" };
const REWARD_STYLE = { menunggu: "bg-blue-100 text-blue-700", diproses: "bg-blue-100 text-blue-700", selesai: "bg-green-100 text-green-700", dikembalikan: "bg-orange-100 text-orange-700", ditolak: "bg-red-100 text-red-700" };

const BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
function formatTanggal(str) {
  if (!str) return "—";
  const [y, m, d] = str.slice(0, 10).split("-");
  return `${parseInt(d)} ${BULAN[parseInt(m) - 1]} ${y}`;
}
function formatDatetime(str) {
  if (!str) return "—";
  const [date, time] = str.split(" ");
  const [y, m, d] = date.split("-");
  const jam = time ? time.slice(0, 5) : "";
  return `${parseInt(d)} ${BULAN[parseInt(m) - 1]} ${y}${jam ? `, ${jam}` : ""}`;
}

function InfoRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
      <p className="text-[13px] text-gray-900 mt-0.5 font-medium">{value}</p>
    </div>
  );
}

function SectionTitle({ children }) {
  return <h3 className="text-[11px] font-black text-gray-300 uppercase tracking-[0.3em] border-b border-gray-100 pb-2 mb-5 mt-7 first:mt-0">{children}</h3>;
}

function FileLink({ label, path }) {
  if (!path) return null;
  const filename = path.split(/[\\/]/).pop();
  const url = `${API_URL}/uploads/${filename}`;
  const match = filename.match(/^.+?_[0-9a-f]{32}_(.+)$/);
  const displayName = match ? match[1] : filename;
  return (
    <div className="min-w-0 overflow-hidden">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
      <a href={url} target="_blank" rel="noopener noreferrer"
         className="text-[13px] text-[#046137] hover:text-[#035230] mt-0.5 flex items-center gap-1.5 transition-colors overflow-hidden">
        <span className="truncate underline underline-offset-2">{displayName}</span>
        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
    </div>
  );
}

function EditInput({ label, name, value, onChange, type = "text" }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">{label}</p>
      <input
        type={type}
        value={value ?? ""}
        onChange={e => onChange(name, e.target.value)}
        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#046137]/30 transition-all"
      />
    </div>
  );
}

function EditSelect({ label, name, value, onChange, options }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">{label}</p>
      <select
        value={value ?? ""}
        onChange={e => onChange(name, e.target.value)}
        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#046137]/30 transition-all"
      >
        <option value="">— pilih —</option>
        {options.map(o => {
          const val = typeof o === "object" ? o.value : o;
          const lbl = typeof o === "object" ? o.label : o;
          return <option key={val} value={val}>{lbl}</option>;
        })}
      </select>
    </div>
  );
}

function CertPreview({ url, filename }) {
  const isPdf = filename?.toLowerCase().endsWith(".pdf");
  if (isPdf) return <iframe src={url} className="w-full h-72 rounded-xl border border-gray-100" title="Sertifikat" />;
  return <img src={url} alt="Sertifikat" className="w-full rounded-xl border border-gray-100 object-contain max-h-72" />;
}

export default function KlaimDetailPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const { id }  = useParams();
  const searchParams = useSearchParams();
  const isReadonly   = searchParams.get("readonly") === "true";

  const [claim,     setClaim]     = useState(null);
  const [pengajuan, setPengajuan] = useState(null);
  const [reward,    setReward]    = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [editOpen,  setEditOpen]  = useState(false);
  const [editForm,  setEditForm]  = useState({});
  const [saving,      setSaving]      = useState(false);
  const [saveMsg,     setSaveMsg]     = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    if (authStatus === "unauthenticated") { router.replace("/"); return; }
    if (authStatus !== "authenticated" || !id) return;

    Promise.all([
      apiFetch(`${API_URL}/claims/${id}`),
      apiFetch(`${API_URL}/pengajuan/by-claim/${id}`),
      apiFetch(`${API_URL}/reward-konfirmasi?email=${encodeURIComponent(session.user.email)}`),
    ]).then(async ([cRes, pRes, rRes]) => {
      const claimData    = cRes.ok ? await cRes.json() : null;
      const pengajuanData = pRes.ok ? await pRes.json() : null;
      const rewardData   = rRes.ok ? await rRes.json() : [];
      setClaim(claimData);
      setPengajuan(pengajuanData);
      setReward(Array.isArray(rewardData) ? rewardData.find(r => r.claim_id === Number(id)) : null);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [authStatus, id, session]);

  if (authStatus === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[#f7f7f8] flex items-center justify-center" style={{ fontFamily: "var(--font-poppins, sans-serif)" }}>
        <div className="flex items-center gap-3 text-gray-400">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <span className="text-sm">Memuat detail klaim...</span>
        </div>
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="min-h-screen bg-[#f7f7f8] flex items-center justify-center" style={{ fontFamily: "var(--font-poppins, sans-serif)" }}>
        <div className="text-center">
          <p className="text-gray-500 font-semibold">Klaim tidak ditemukan.</p>
          <Link href="/mahasiswa/dashboard" className="mt-4 inline-block text-sm text-[#046137] hover:underline">← Kembali ke Dashboard</Link>
        </div>
      </div>
    );
  }

  const fileUrl      = `${API_URL}/uploads/${claim.sertifikat_filename}`;
  const isLomba      = pengajuan?.kategori_simkatmawa?.startsWith("lomba_mandiri");
  const isKarya      = pengajuan?.kategori_kegiatan?.startsWith("Karya Mahasiswa");
  const isKelompok   = pengajuan?.jenis_kepesertaan === "kelompok";
  const canEdit      = !isReadonly && pengajuan && (claim.status === "belum dicek" || claim.status === "perlu ditinjau");

  const openEdit = () => {
    setEditForm({
      nama_kegiatan:       pengajuan.nama_kegiatan       ?? "",
      tahun_kegiatan:      pengajuan.tahun_kegiatan      ?? "",
      kategori_simkatmawa: pengajuan.kategori_simkatmawa ?? "",
      jenis_kepesertaan:   pengajuan.jenis_kepesertaan   ?? "",
      kategori_kegiatan:   pengajuan.kategori_kegiatan   ?? "",
      tingkatan:           pengajuan.tingkatan           ?? "",
      model_pelaksanaan:   pengajuan.model_pelaksanaan   ?? "",
      jumlah_peserta:      pengajuan.jumlah_peserta      ?? "",
      capaian:             pengajuan.capaian             ?? "",
      tanggal_mulai:       pengajuan.tanggal_mulai       ?? "",
      tanggal_selesai:     pengajuan.tanggal_selesai     ?? "",
      url_penyelenggara:   pengajuan.url_penyelenggara   ?? "",
      keterangan:          pengajuan.keterangan          ?? "",
      nama_lembaga:        pengajuan.nama_lembaga        ?? "",
      jenis_karya_teks:    pengajuan.jenis_karya_teks    ?? "",
      jenis_karya_pilihan: pengajuan.jenis_karya_pilihan ?? "",
      nomor_surat:         pengajuan.nomor_surat         ?? "",
      tanggal_surat:       pengajuan.tanggal_surat       ?? "",
      deskripsi_karya:     pengajuan.deskripsi_karya     ?? "",
      manfaat_karya:       pengajuan.manfaat_karya       ?? "",
      nama_ketua:          pengajuan.nama_ketua          ?? "",
      peran_pengeclaim:    pengajuan.peran_pengeclaim    ?? "",
      keterangan_kelompok: pengajuan.keterangan_kelompok ?? "",
    });
    setSaveMsg("");
    setEditOpen(true);
  };

  const setField    = (name, value) => setEditForm(f => ({ ...f, [name]: value }));
  const cancelEdit  = () => { setEditOpen(false); setSaveMsg(""); };

  const handleSaveEdit = async () => {
    setSaving(true);
    setSaveMsg("");
    try {
      const res = await apiFetch(`${API_URL}/pengajuan/${pengajuan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.status === 409) {
        const err = await res.json();
        setSaveMsg(`Gagal: ${err.detail}`);
        setClaim(prev => ({ ...prev, status: "disetujui" }));
        return;
      }
      if (!res.ok) throw new Error("Gagal menyimpan");
      setPengajuan(prev => ({ ...prev, ...editForm }));
      setEditOpen(false);
    } catch {
      setSaveMsg("Gagal menyimpan. Coba lagi.");
    } finally {
      setSaving(false);
    }
  };
  const anggota    = pengajuan?.anggota_list
    ? pengajuan.anggota_list.split(";;").map(s => { const [nama, nim] = s.split("|"); return { nama, nim }; })
    : [];

  return (
    <div className="min-h-screen bg-[#f7f7f8] flex" style={{ fontFamily: "var(--font-poppins, sans-serif)" }}>

      {/* Sidebar */}
      <aside className="w-[240px] bg-[#046137] flex flex-col flex-shrink-0 h-screen sticky top-0">
        <div className="px-7 pt-9 pb-8">
          <img src="/logo_utama.png" alt="Anti Double Claim" className="h-20 w-auto object-contain" />
          <p className="text-[10px] font-semibold text-white/50 mt-2.5 tracking-widest uppercase">Portal Mahasiswa</p>
        </div>
        <nav className="flex-1 px-4 space-y-0.5">
          {[
            { href: "/mahasiswa/dashboard?menu=daftar",      label: "Daftar Klaim",     icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg> },
            { href: "/mahasiswa/dashboard?menu=reward",      label: "Konfirmasi Reward", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /></svg> },
            { href: "/mahasiswa/dashboard?menu=visualisasi", label: "Visualisasi Data",  icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
            { href: "/mahasiswa/dashboard?menu=sk-rektor",   label: "SK Rektor",         icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
          ].map(m => (
            <Link key={m.href} href={m.href}
              className="relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] text-white/70 font-medium hover:text-white hover:bg-white/10 transition-colors">
              {m.icon}
              {m.label}
            </Link>
          ))}
        </nav>
        <div className="px-7 py-6 border-t border-white/10">
          <p className="text-[11px] font-bold text-white/80 uppercase tracking-widest leading-none">UKDW</p>
          <p className="text-[10px] text-white/40 mt-1 leading-snug">Universitas Kristen<br />Duta Wacana</p>
          <p className="text-[10px] text-white/30 mt-3 tabular-nums">© {new Date().getFullYear()}</p>
        </div>
      </aside>

      {/* Konten */}
      <div className="flex-1 flex flex-col overflow-auto">
        <header className="h-16 bg-[#f0f7f3] border-b border-[#d4ebe0] flex items-center justify-between px-8 flex-shrink-0">
          <Link href="/mahasiswa/dashboard"
            className="flex items-center gap-2 text-[11px] font-black text-gray-400 uppercase tracking-widest hover:text-[#046137] transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
            </svg>
            Kembali ke Dashboard
          </Link>

          {/* Profil user */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(v => !v)}
              className="flex items-center gap-3 px-3 py-1.5 rounded-xl hover:bg-[#d4ebe0] transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-[#046137] flex items-center justify-center flex-shrink-0 overflow-hidden">
                {session?.user?.image ? (
                  <img src={session.user.image} alt="avatar" className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-white">
                    {session?.user?.name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="text-left">
                <p className="text-[13px] font-semibold text-gray-900 leading-tight">{session?.user?.name}</p>
                <p className="text-[11px] text-gray-400 leading-tight truncate max-w-[160px]">{session?.user?.email}</p>
              </div>
              <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showUserMenu ? "rotate-180" : ""}`}
                   fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-xl border border-gray-100 shadow-lg z-20 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <p className="text-sm font-semibold text-gray-900 truncate">{session?.user?.name}</p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{session?.user?.email}</p>
                  </div>
                  <div className="p-1.5">
                    <button
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors text-left"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Keluar
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 px-10 py-10 overflow-y-auto">
          <div className="max-w-6xl mx-auto space-y-8">

            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-tight">{claim.nama_lomba}</h1>
                <div className="flex items-center gap-3 mt-3 flex-wrap">
                  <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest ${STATUS_STYLE(claim.status)}`}>
                    {STATUS_LABEL(claim.status)}
                  </span>
                  {claim.periode_nama && (
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#f0f7f3] text-[#046137] border border-[#d4ebe0]">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {claim.periode_nama}
                    </span>
                  )}
                  {reward && (
                    <span className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap ${REWARD_STYLE[reward.reward_status] ?? "bg-gray-100 text-gray-600"}`}>
                      Reward: {REWARD_LABEL[reward.reward_status] ?? reward.reward_status}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-widest">ID #{claim.id}</p>
              </div>
            </div>

            {/* Penolakan */}
            {claim.status === "ditolak" && (
              <div className="bg-red-50 border border-red-200 rounded-2xl px-6 py-5 flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div>
                  <p className="text-[13px] font-black text-red-800 uppercase tracking-wide">Klaim Tidak Lolos Verifikasi</p>
                  {claim.catatan_penolakan ? (
                    <>
                      <p className="text-[11px] font-bold text-red-500 uppercase tracking-widest mt-2 mb-1">Alasan dari Operator:</p>
                      <p className="text-[13px] text-red-700 leading-relaxed">{claim.catatan_penolakan}</p>
                    </>
                  ) : (
                    <p className="text-[12px] text-red-500 mt-1">Hubungi Divisi Bakat Minat UKDW untuk informasi lebih lanjut.</p>
                  )}
                </div>
              </div>
            )}

            {/* Grid utama */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

              {/* Kolom kiri — Sertifikat */}
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-white rounded-[28px] shadow-sm border border-gray-100 p-7">
                  <SectionTitle>Preview Sertifikat</SectionTitle>
                  <CertPreview url={fileUrl} filename={claim.sertifikat_filename} />
                  <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                     className="mt-5 inline-flex items-center gap-2 text-[11px] font-black text-gray-400 hover:text-[#046137] transition-colors uppercase tracking-widest">
                    BUKA DI TAB BARU
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>

                {/* Info dasar */}
                <div className="bg-white rounded-[28px] shadow-sm border border-gray-100 p-7">
                  <SectionTitle>Info Klaim</SectionTitle>
                  <div className="space-y-4">
                    <InfoRow label="Tingkat"         value={claim.tingkat} />
                    <InfoRow label="Peringkat"        value={claim.peringkat} />
                    <InfoRow label="Tanggal Kegiatan" value={formatTanggal(claim.tanggal)} />
                    {pengajuan?.created_at && <InfoRow label="Tanggal Pengajuan" value={formatTanggal(pengajuan.created_at)} />}
                    {claim.verified_at && <InfoRow label="Diverifikasi" value={formatDatetime(claim.verified_at)} />}
                    {claim.verified_by_nama && <InfoRow label="Oleh" value={claim.verified_by_nama} />}
                  </div>
                </div>

                {/* Estimasi */}
                {pengajuan?.estimasi_reward != null && (
                  <div className="rounded-[28px] p-7 bg-[#f0f7f3] border border-[#d4ebe0]">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#046137]/60 mb-1.5">Estimasi Dana Penghargaan</p>
                    <p className="text-2xl font-black tabular-nums text-[#046137]">
                      {"Rp " + Number(pengajuan.estimasi_reward).toLocaleString("id-ID")}
                    </p>
                    <p className="text-[10px] text-[#046137]/50 mt-2">SK Rektor No. 078/B.02/UKDW/2023</p>
                  </div>
                )}
              </div>

              {/* Kolom kanan — Detail */}
              <div className="lg:col-span-8 space-y-6">
                <div className="bg-white rounded-[28px] shadow-sm border border-gray-100 p-8">
                  {pengajuan ? (() => {
                    const ef      = editOpen ? editForm : pengajuan;
                    const efLomba = isLombaMandiri(ef.kategori_simkatmawa);
                    const efKarya = ef.kategori_kegiatan?.startsWith("Karya Mahasiswa");
                    const efKelompok = ef.jenis_kepesertaan === "kelompok";
                    return (
                      <>
                        {/* Card header dengan tombol edit */}
                        <div className="flex items-center justify-between border-b border-gray-50 pb-5 mb-6">
                          <div>
                            <h2 className="text-[16px] font-black text-gray-900">Data Pengajuan</h2>
                            <p className="text-[12px] text-gray-400 mt-0.5">
                              {editOpen ? "File tidak dapat diubah melalui form ini." : "Detail lengkap pengajuan klaim."}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            {saveMsg && (
                              <span className={`text-[12px] font-bold ${saveMsg.includes("Gagal") ? "text-red-500" : "text-[#046137] animate-pulse"}`}>
                                {saveMsg.includes("Gagal") ? saveMsg : "✓ TERSIMPAN"}
                              </span>
                            )}
                            {editOpen ? (
                              <>
                                <button onClick={cancelEdit}
                                  className="px-4 py-2 text-[12px] font-bold rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
                                  BATAL
                                </button>
                                <button onClick={handleSaveEdit} disabled={saving}
                                  className="px-5 py-2 text-[12px] font-black rounded-xl bg-[#046137] text-white hover:bg-[#035230] disabled:opacity-50 transition-all shadow-lg shadow-green-100">
                                  {saving ? "MENYIMPAN..." : "SIMPAN PERUBAHAN"}
                                </button>
                              </>
                            ) : canEdit && (
                              <button onClick={openEdit}
                                className="px-4 py-2 text-[12px] font-black rounded-xl border border-gray-900 text-gray-900 hover:bg-gray-50 transition-all flex items-center gap-2">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                EDIT DATA
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Rincian Kegiatan */}
                        <SectionTitle>Rincian Kegiatan</SectionTitle>
                        <div className="grid grid-cols-2 gap-5">
                          {editOpen ? (
                            <>
                              <div className="col-span-2">
                                <EditInput label="Nama Lengkap Kegiatan" name="nama_kegiatan" value={ef.nama_kegiatan} onChange={setField} />
                              </div>
                              <EditSelect label="Kategori SIMKATMAWA" name="kategori_simkatmawa" value={ef.kategori_simkatmawa} onChange={setField} options={OPT_KATEGORI_SIMKATMAWA} />
                              <EditSelect label="Jenis Kepesertaan"   name="jenis_kepesertaan"   value={ef.jenis_kepesertaan}   onChange={setField} options={OPT_JENIS_KEPESERTAAN} />
                              <EditSelect label="Tahun Kegiatan"      name="tahun_kegiatan"      value={ef.tahun_kegiatan}      onChange={setField} options={OPT_TAHUN} />
                              <div className="col-span-2">
                                <EditSelect label="Kategori Kegiatan" name="kategori_kegiatan" value={ef.kategori_kegiatan} onChange={setField}
                                  options={efLomba ? OPT_KATEGORI_LOMBA : OPT_KATEGORI_REKOGNISI} />
                              </div>
                              {!efLomba && <EditSelect label="Tingkatan" name="tingkatan" value={ef.tingkatan} onChange={setField} options={OPT_TINGKATAN} />}
                              {efLomba  && <EditSelect label="Model Pelaksanaan" name="model_pelaksanaan" value={ef.model_pelaksanaan} onChange={setField} options={OPT_MODEL_PELAKSANAAN} />}
                              {efLomba  && <EditInput  label="Jumlah Peserta"    name="jumlah_peserta"    value={ef.jumlah_peserta}    onChange={setField} type="number" />}
                              {efLomba  && <div className="col-span-2"><EditSelect label="Capaian / Peringkat" name="capaian" value={ef.capaian} onChange={setField} options={OPT_CAPAIAN} /></div>}
                              <EditInput label="Tanggal Mulai"   name="tanggal_mulai"   value={ef.tanggal_mulai}   onChange={setField} type="date" />
                              <EditInput label="Tanggal Selesai" name="tanggal_selesai" value={ef.tanggal_selesai} onChange={setField} type="date" />
                              <div className="col-span-2">
                                <EditInput label="URL Website Penyelenggara" name="url_penyelenggara" value={ef.url_penyelenggara} onChange={setField} />
                              </div>
                              <div className="col-span-2">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Keterangan Tambahan</p>
                                <textarea rows={3} value={ef.keterangan ?? ""}
                                  onChange={e => setField("keterangan", e.target.value)}
                                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#046137]/30 resize-none transition-all" />
                              </div>
                            </>
                          ) : (
                            <>
                              <InfoRow label="Kategori SIMKATMAWA" value={
                                pengajuan.kategori_simkatmawa === "lomba_mandiri_puspresnas"     ? "Lomba Mandiri — Puspresnas (DIKTI)" :
                                pengajuan.kategori_simkatmawa === "lomba_mandiri_non_puspresnas" ? "Lomba Mandiri — Non Puspresnas (Non DIKTI)" :
                                "Rekognisi Non-Lomba"
                              } />
                              <InfoRow label="Jenis Kepesertaan"   value={pengajuan.jenis_kepesertaan} />
                              <InfoRow label="Tahun Kegiatan"      value={pengajuan.tahun_kegiatan} />
                              <InfoRow label="Kategori Kegiatan"   value={pengajuan.kategori_kegiatan} />
                              <div className="col-span-2"><InfoRow label="Nama Lengkap Kegiatan" value={pengajuan.nama_kegiatan} /></div>
                              {!efLomba && <InfoRow label="Tingkatan" value={pengajuan.tingkatan} />}
                              {efLomba && <>
                                <InfoRow label="Model Pelaksanaan" value={pengajuan.model_pelaksanaan} />
                                <InfoRow label="Jumlah Peserta"    value={pengajuan.jumlah_peserta} />
                                <InfoRow label="Capaian"           value={pengajuan.capaian} />
                              </>}
                              <InfoRow label="Tanggal Mulai"   value={formatTanggal(pengajuan.tanggal_mulai)} />
                              <InfoRow label="Tanggal Selesai" value={formatTanggal(pengajuan.tanggal_selesai)} />
                              {pengajuan.url_penyelenggara && (
                                <div className="col-span-2">
                                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">URL Penyelenggara</p>
                                  <a href={pengajuan.url_penyelenggara} target="_blank" rel="noopener noreferrer"
                                     className="text-[13px] text-[#046137] hover:underline mt-0.5 inline-block break-all">
                                    {pengajuan.url_penyelenggara}
                                  </a>
                                </div>
                              )}
                              {pengajuan.keterangan && <div className="col-span-2"><InfoRow label="Keterangan" value={pengajuan.keterangan} /></div>}
                            </>
                          )}
                        </div>

                        {/* Dosen Pembimbing */}
                        <SectionTitle>Dosen Pembimbing</SectionTitle>
                        <div className="grid grid-cols-2 gap-5">
                          <InfoRow label="Menggunakan Dospem" value={pengajuan.ada_dospem === "ya" ? "Ya" : "Tidak"} />
                          {pengajuan.ada_dospem === "ya" && <InfoRow label="NIK/NIDN/NIDK" value={pengajuan.nidn_dospem} />}
                        </div>
                        <div className="mt-4">
                          <FileLink label="Surat Tugas Dospem" path={pengajuan.surat_tugas_path} />
                        </div>

                        {/* Karya Mahasiswa */}
                        {efKarya && (
                          <>
                            <SectionTitle>Data Karya Mahasiswa</SectionTitle>
                            <div className="grid grid-cols-2 gap-5">
                              {editOpen ? (
                                <>
                                  <EditInput label="Nama Lembaga/Mitra"    name="nama_lembaga"        value={ef.nama_lembaga}        onChange={setField} />
                                  <EditInput label="Judul/Jenis Karya"      name="jenis_karya_teks"    value={ef.jenis_karya_teks}    onChange={setField} />
                                  <EditSelect label="Kategori Karya"        name="jenis_karya_pilihan" value={ef.jenis_karya_pilihan} onChange={setField} options={OPT_JENIS_KARYA} />
                                  <EditInput label="Nomor Surat Keterangan" name="nomor_surat"         value={ef.nomor_surat}         onChange={setField} />
                                  <EditInput label="Tanggal Surat"          name="tanggal_surat"       value={ef.tanggal_surat}       onChange={setField} type="date" />
                                  <div className="col-span-2"><EditInput label="Deskripsi Karya" name="deskripsi_karya" value={ef.deskripsi_karya} onChange={setField} /></div>
                                  <div className="col-span-2"><EditInput label="Manfaat Karya"   name="manfaat_karya"   value={ef.manfaat_karya}   onChange={setField} /></div>
                                </>
                              ) : (
                                <>
                                  <InfoRow label="Nama Lembaga/Mitra" value={pengajuan.nama_lembaga} />
                                  <InfoRow label="Jenis Karya"        value={pengajuan.jenis_karya_teks} />
                                  <InfoRow label="Nomor Surat"        value={pengajuan.nomor_surat} />
                                  <InfoRow label="Tanggal Surat"      value={formatTanggal(pengajuan.tanggal_surat)} />
                                  <div className="col-span-2"><InfoRow label="Deskripsi Karya" value={pengajuan.deskripsi_karya} /></div>
                                  <div className="col-span-2"><InfoRow label="Manfaat Karya"   value={pengajuan.manfaat_karya} /></div>
                                </>
                              )}
                            </div>
                          </>
                        )}

                        {/* Kelompok */}
                        {efKelompok && (
                          <>
                            <SectionTitle>Data Kelompok</SectionTitle>
                            <div className="grid grid-cols-2 gap-5 mb-4">
                              {editOpen ? (
                                <>
                                  <EditInput label="Nama Lengkap Ketua"  name="nama_ketua"          value={ef.nama_ketua}          onChange={setField} />
                                  <EditInput label="Peran Pengeclaim"    name="peran_pengeclaim"    value={ef.peran_pengeclaim}    onChange={setField} />
                                  <div className="col-span-2"><EditInput label="Keterangan Kelompok" name="keterangan_kelompok" value={ef.keterangan_kelompok} onChange={setField} /></div>
                                </>
                              ) : (
                                <>
                                  <InfoRow label="Nama Ketua" value={pengajuan.nama_ketua} />
                                  <InfoRow label="Peran Anda" value={pengajuan.peran_pengeclaim} />
                                  {pengajuan.keterangan_kelompok && <div className="col-span-2"><InfoRow label="Keterangan Kelompok" value={pengajuan.keterangan_kelompok} /></div>}
                                </>
                              )}
                            </div>
                            {(pengajuan.nama_ketua || anggota.length > 0) && (
                              <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Daftar Anggota</p>
                                <div className="space-y-1.5">
                                  {pengajuan.nama_ketua && (
                                    <div className="flex gap-4 text-sm bg-gray-50 rounded-xl px-4 py-2.5 items-center">
                                      <span className="text-gray-400 font-semibold w-5">1.</span>
                                      <span className="font-semibold text-gray-900">{pengajuan.nama_ketua}</span>
                                      <span className="text-gray-400 font-mono">{pengajuan.mahasiswa_email?.split("@")[0]}</span>
                                      <span className="ml-auto text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#046137]/10 text-[#046137]">Ketua</span>
                                    </div>
                                  )}
                                  {anggota.map((a, i) => (
                                    <div key={i} className="flex gap-4 text-sm bg-gray-50 rounded-xl px-4 py-2.5">
                                      <span className="text-gray-400 font-semibold w-5">{i + 2}.</span>
                                      <span className="font-semibold text-gray-900">{a.nama}</span>
                                      <span className="text-gray-400 font-mono">{a.nim}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {/* Dokumen */}
                        <SectionTitle>Dokumen Tambahan</SectionTitle>
                        <div className="grid grid-cols-2 gap-5">
                          <FileLink label="Foto Penyerahan" path={pengajuan.foto_penyerahan_path} />
                          <FileLink label="Dokumen Lainnya" path={pengajuan.dokumen_lainnya_path} />
                        </div>
                      </>
                    );
                  })() : (
                    <div className="space-y-4">
                      <SectionTitle>Info Kegiatan</SectionTitle>
                      <div className="grid grid-cols-2 gap-5">
                        <InfoRow label="Nama Lomba" value={claim.nama_lomba} />
                        <InfoRow label="Tingkat"    value={claim.tingkat} />
                        <InfoRow label="Peringkat"  value={claim.peringkat} />
                        <InfoRow label="Tanggal"    value={formatTanggal(claim.tanggal)} />
                      </div>
                      <p className="text-[12px] text-gray-400 mt-4 italic">Data pengajuan lengkap belum tersedia.</p>
                    </div>
                  )}
                </div>

                {/* Timeline — mengisi ruang kosong di bawah sejajar estimasi */}
                <div className="bg-white rounded-[28px] shadow-sm border border-gray-100 p-7">
                  <SectionTitle>Riwayat Status</SectionTitle>
                  <div className="flex items-start gap-0">
                    {[
                      {
                        label: "Klaim Diajukan",
                        sub: pengajuan?.created_at ? formatDatetime(pengajuan.created_at) : formatTanggal(claim.tanggal),
                        done: true,
                        color: "bg-[#046137]",
                      },
                      {
                        label: claim.status === "ditolak" ? "Tidak Lolos" : "Sudah Dicek",
                        sub: claim.verified_at ? formatDatetime(claim.verified_at) : "Menunggu verifikasi operator",
                        done: claim.status === "sudah dicek" || claim.status === "ditolak",
                        color: claim.status === "ditolak" ? "bg-red-500" : "bg-[#046137]",
                      },
                      {
                        label: "Data Rekening Diajukan",
                        sub: reward ? formatDatetime(reward.created_at) : "Belum diisi mahasiswa",
                        done: !!reward && claim.status !== "ditolak",
                        color: "bg-[#046137]",
                      },
                      {
                        label: "Reward Dikirim",
                        sub: reward?.reward_status === "selesai" ? "Reward telah dikirim" : "Menunggu pengiriman",
                        done: reward?.reward_status === "selesai",
                        color: "bg-[#046137]",
                      },
                    ].map((step, i, arr) => (
                      <div key={i} className="flex-1 flex flex-col items-center text-center relative">
                        {/* garis penghubung */}
                        {i < arr.length - 1 && (
                          <div className={`absolute top-3.5 left-1/2 w-full h-0.5 ${step.done ? "bg-[#d4ebe0]" : "bg-gray-100"}`} />
                        )}
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center z-10 ${step.done ? step.color : "bg-gray-100"}`}>
                          {step.done ? (
                            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-gray-300" />
                          )}
                        </div>
                        <p className={`text-[12px] font-bold mt-2 ${step.done ? "text-gray-900" : "text-gray-300"}`}>{step.label}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 leading-snug px-2">{step.sub}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>

    </div>
  );
}
