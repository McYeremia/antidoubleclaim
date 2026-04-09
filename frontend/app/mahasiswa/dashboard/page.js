"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_STYLE = {
  "belum dicek":    "bg-blue-100 text-blue-700",
  "perlu ditinjau": "bg-yellow-100 text-yellow-700",
  "sudah dicek":    "bg-green-100 text-green-700",
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

// ── Popup: Form Tambah Klaim (Gmail-style) ─────────────────────────────────────
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
function DetailModal({ claim, onClose }) {
  if (!claim) return null;
  const fileUrl = `http://127.0.0.1:8000/uploads/${claim.sertifikat_filename}`;
  const isPdf   = claim.sertifikat_filename?.toLowerCase().endsWith(".pdf");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
           onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-bold text-gray-900">Detail Klaim #{claim.id}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="p-6 space-y-5">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[claim.status] ?? "bg-gray-100 text-gray-700"}`}>
            {claim.status}
          </span>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-400 uppercase">Nama Lomba</p>
              <p className="text-gray-900 font-medium mt-0.5">{claim.nama_lomba}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase">Tanggal</p>
              <p className="text-gray-900 mt-0.5">{claim.tanggal}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase">Tingkat</p>
              <p className="text-gray-900 mt-0.5">{claim.tingkat}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase">Peringkat</p>
              <p className="text-gray-900 mt-0.5">{claim.peringkat}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase mb-2">Preview Sertifikat</p>
            {isPdf
              ? <iframe src={fileUrl} className="w-full h-72 rounded-lg border border-gray-200" title="Preview" />
              : <img src={fileUrl} alt="Sertifikat" className="w-full rounded-lg border border-gray-200 object-contain max-h-72" />
            }
            <a href={fileUrl} target="_blank" rel="noopener noreferrer"
               className="mt-2 inline-block text-sm text-blue-600 hover:underline">
              Buka di tab baru ↗
            </a>
          </div>
          {claim.verified_at && (
            <div className="text-sm">
              <p className="text-xs text-gray-400 uppercase">Diverifikasi Pada</p>
              <p className="text-gray-700 mt-0.5">{claim.verified_at}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Konten: Daftar Klaim ──────────────────────────────────────────────────────
function DaftarKlaim({ session, search }) {
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
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[claim.status] ?? "bg-gray-100 text-gray-700"}`}>
                      {claim.status}
                    </span>
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
    { key: "daftar",      label: "Daftar Klaim",     icon: <IconList /> },
    { key: "visualisasi", label: "Visualisasi Data",  icon: <IconChart /> },
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
          {activeMenu === "daftar" && (
            <DaftarKlaim key={claimsRefreshKey} session={session} search={search} />
          )}
          {activeMenu === "visualisasi" && <VisualisasiData />}
        </main>
      </div>

      {/* ── Popup Tambah Klaim ── */}
      {showTambah && (
        <TambahKlaimModal
          session={session}
          onClose={() => setShowTambah(false)}
          onSuccess={handleClaimSuccess}
        />
      )}
    </div>
  );
}
