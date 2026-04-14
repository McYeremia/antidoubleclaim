"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// ── Ikon ──────────────────────────────────────────────────────────────────────
const IconClaim = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const IconReward = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
  </svg>
);

// ── Badge status claim ────────────────────────────────────────────────────────
const STATUS_BADGE = {
  "perlu ditinjau": "bg-yellow-100 text-yellow-800",
  "belum dicek":    "bg-blue-100 text-blue-800",
  "sudah dicek":    "bg-green-100 text-green-800",
};

// ── Konten: Pengajuan Claim ───────────────────────────────────────────────────
function PengajuanClaim({ router }) {
  const [claims, setClaims]   = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const res  = await fetch("http://127.0.0.1:8000/claims");
      const data = await res.json();
      setClaims(data);
    } catch {
      setClaims([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClaims(); }, []);

  const handleApprove = async (id, e) => {
    e.stopPropagation();
    await fetch(`http://127.0.0.1:8000/claims/${id}/approve`, { method: "PATCH" });
    fetchClaims();
  };

  const handleDiscard = async (id, e) => {
    e.stopPropagation();
    if (!confirm("Yakin ingin menghapus klaim ini?")) return;
    await fetch(`http://127.0.0.1:8000/claims/${id}`, { method: "DELETE" });
    fetchClaims();
  };

  const perluDitinjau = claims.filter(c => c.status === "perlu ditinjau");
  const belumDicek    = claims.filter(c => c.status === "belum dicek");
  const sudahDicek    = claims.filter(c => c.status === "sudah dicek");

  const Section = ({ title, color, items, showActions, showMirip }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className={`px-5 py-3 border-b flex items-center justify-between ${color}`}>
        <h2 className="font-semibold text-sm uppercase tracking-wide">{title}</h2>
        <span className="text-xs font-bold">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-8">Tidak ada data.</p>
      ) : (
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-2">ID</th>
              <th className="px-4 py-2">Nama Lomba</th>
              <th className="px-4 py-2">Tingkat</th>
              <th className="px-4 py-2">Peringkat</th>
              <th className="px-4 py-2">Tanggal</th>
              {showMirip   && <th className="px-4 py-2">Mirip Dengan</th>}
              {showActions && <th className="px-4 py-2 text-right">Aksi</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map(claim => (
              <tr key={claim.id}
                  onClick={() => router.push(`/operator/${claim.id}`)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors">
                <td className="px-4 py-3 font-mono text-gray-400">#{claim.id}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{claim.nama_lomba}</td>
                <td className="px-4 py-3 text-gray-600">{claim.tingkat}</td>
                <td className="px-4 py-3 text-gray-600">{claim.peringkat}</td>
                <td className="px-4 py-3 text-gray-600">{claim.tanggal}</td>
                {showMirip && (
                  <td className="px-4 py-3">
                    {claim.mirip_dengan_id ? (
                      <button
                        onClick={e => { e.stopPropagation(); router.push(`/operator/${claim.mirip_dengan_id}`); }}
                        className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                      >
                        #{claim.mirip_dengan_id}
                      </button>
                    ) : "—"}
                  </td>
                )}
                {showActions && (
                  <td className="px-4 py-3 text-right space-x-2" onClick={e => e.stopPropagation()}>
                    <button onClick={e => handleApprove(claim.id, e)}
                      className="px-3 py-1 rounded-md text-xs font-semibold bg-green-600 text-white hover:bg-green-700">
                      Approve
                    </button>
                    <button onClick={e => handleDiscard(claim.id, e)}
                      className="px-3 py-1 rounded-md text-xs font-semibold bg-red-100 text-red-700 hover:bg-red-200">
                      Discard
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Pengajuan Claim</h2>
          <p className="text-sm text-gray-500 mt-0.5">Tinjau dan verifikasi klaim sertifikat mahasiswa</p>
        </div>
        <button onClick={fetchClaims} className="text-sm text-blue-600 hover:underline">Refresh</button>
      </div>

      {/* Statistik */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5 border border-yellow-200">
          <p className="text-xs text-gray-500 uppercase">Perlu Ditinjau</p>
          <p className="text-4xl font-bold text-yellow-600 mt-1">{perluDitinjau.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border border-blue-200">
          <p className="text-xs text-gray-500 uppercase">Belum Dicek</p>
          <p className="text-4xl font-bold text-blue-600 mt-1">{belumDicek.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border border-green-200">
          <p className="text-xs text-gray-500 uppercase">Sudah Dicek</p>
          <p className="text-4xl font-bold text-green-600 mt-1">{sudahDicek.length}</p>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-12">Memuat data...</p>
      ) : (
        <>
          <Section title="Perlu Ditinjau"
            color="bg-yellow-50 text-yellow-800 border-yellow-200"
            items={perluDitinjau} showActions={true} showMirip={true} />
          <Section title="Belum Dicek"
            color="bg-blue-50 text-blue-800 border-blue-200"
            items={belumDicek} showActions={true} showMirip={false} />
          <Section title="Sudah Dicek"
            color="bg-green-50 text-green-800 border-green-200"
            items={sudahDicek} showActions={false} showMirip={false} />
        </>
      )}
    </div>
  );
}

// ── Konstanta ─────────────────────────────────────────────────────────────────
const KATEGORI_LABEL = {
  puspresnas:     "PUSPRESNAS",
  non_puspresnas: "Non PUSPRESNAS",
  publikasi:      "Publikasi / Karya / HKI",
};

const REWARD_STATUS_BADGE = {
  menunggu: "bg-yellow-100 text-yellow-800",
  diproses: "bg-blue-100 text-blue-800",
  selesai:  "bg-green-100 text-green-800",
  ditolak:  "bg-red-100 text-red-800",
};

// ── Helper ────────────────────────────────────────────────────────────────────
function InfoRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-gray-900 mt-0.5 text-sm">{value}</p>
    </div>
  );
}

function DocLink({ label, path }) {
  if (!path) return null;
  const filename = path.split(/[\\/]/).pop();
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase">{label}</p>
      <a href={`http://127.0.0.1:8000/uploads/${filename}`} target="_blank" rel="noopener noreferrer"
         className="text-sm text-blue-600 hover:underline mt-0.5 inline-block">
        {filename} ↗
      </a>
    </div>
  );
}

// ── Modal Detail Reward ───────────────────────────────────────────────────────
function RewardDetailModal({ reward, onClose, onStatusUpdate }) {
  const [claim,       setClaim]       = useState(null);
  const [updating,    setUpdating]    = useState(false);
  const [catatan,     setCatatan]     = useState(reward.catatan_operator ?? "");

  useEffect(() => {
    if (reward.claim_id) {
      fetch(`http://127.0.0.1:8000/claims/${reward.claim_id}`)
        .then(r => r.ok ? r.json() : null)
        .then(setClaim)
        .catch(() => {});
    }
  }, [reward.claim_id]);

  const handleStatus = async (status) => {
    setUpdating(true);
    await fetch(`http://127.0.0.1:8000/reward-konfirmasi/${reward.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, catatan: catatan || null }),
    });
    setUpdating(false);
    onStatusUpdate();
    onClose();
  };

  const isPuspresnas    = reward.kategori_lomba === "puspresnas";
  const isNonPuspresnas = reward.kategori_lomba === "non_puspresnas";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
         onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
           onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-bold text-gray-900">Detail Pengajuan Reward</h3>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${REWARD_STATUS_BADGE[reward.reward_status] ?? "bg-gray-100 text-gray-600"}`}>
              {reward.reward_status}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-6 space-y-6">

          {/* Klaim Terkait */}
          {claim && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-blue-600 uppercase mb-2">Klaim Terkait</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-blue-400">Nama Lomba</p>
                  <p className="font-medium text-blue-900">{claim.nama_lomba}</p>
                </div>
                <div>
                  <p className="text-xs text-blue-400">Mahasiswa</p>
                  <p className="font-medium text-blue-900">{claim.nama_display}</p>
                </div>
                <div>
                  <p className="text-xs text-blue-400">Peringkat</p>
                  <p className="text-blue-800">{claim.peringkat} · {claim.tingkat}</p>
                </div>
                <div>
                  <p className="text-xs text-blue-400">Tanggal Klaim</p>
                  <p className="text-blue-800">{claim.tanggal}</p>
                </div>
              </div>
            </div>
          )}

          {/* Data Diri */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase border-b pb-1.5 mb-3">Data Diri</p>
            <div className="grid grid-cols-3 gap-4">
              <InfoRow label="Nama Ketua"    value={reward.nama_ketua} />
              <InfoRow label="NIM"           value={reward.nim} />
              <InfoRow label="Nomor WA"      value={reward.nomor_wa} />
            </div>
          </div>

          {/* Info Pengajuan */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase border-b pb-1.5 mb-3">Info Pengajuan</p>
            <div className="grid grid-cols-2 gap-4">
              <InfoRow label="Kategori"      value={KATEGORI_LABEL[reward.kategori_lomba] ?? reward.kategori_lomba} />
              {isPuspresnas && <InfoRow label="Kompetisi"   value={reward.kompetisi_puspresnas} />}
              {(isPuspresnas || isNonPuspresnas) && <InfoRow label="Judul Lomba" value={reward.judul_lomba} />}
              <InfoRow label="Tahun Klaim"   value={reward.tahun_klaim} />
              <InfoRow label="Tahun Kegiatan" value={reward.tahun_kegiatan} />
              <InfoRow label="Periode"        value={`Periode ${reward.periode}`} />
              <InfoRow label="No. Urut Lampiran" value={reward.nomor_urut_lampiran} />
            </div>
          </div>

          {/* Data Rekening */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase border-b pb-1.5 mb-3">Data Rekening</p>
            <div className="grid grid-cols-3 gap-4">
              <InfoRow label="Nama Pemilik"  value={reward.nama_pemilik_rekening} />
              <InfoRow label="Bank"          value={reward.bank} />
              <InfoRow label="No. Rekening"  value={reward.nomor_rekening ?? "—"} />
            </div>
          </div>

          {/* Dokumen */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase border-b pb-1.5 mb-3">Dokumen</p>
            <div className="grid grid-cols-2 gap-4">
              <DocLink label="Buku Tabungan"     path={reward.foto_buku_tabungan_path} />
              <DocLink label="KTM"               path={reward.foto_ktm_path} />
              <DocLink label="KTP"               path={reward.foto_ktp_path} />
              <DocLink label="Pakta Integritas"  path={reward.pakta_integritas_path} />
              <DocLink label="Laporan Akhir"     path={reward.laporan_akhir_path} />
              <DocLink label="Karya Publikasi"   path={reward.karya_publikasi_path} />
            </div>
          </div>

          {/* Catatan Operator */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase border-b pb-1.5 mb-3">Catatan Operator</p>
            <textarea
              rows={3}
              value={catatan}
              onChange={e => setCatatan(e.target.value)}
              placeholder="Tulis catatan jika diperlukan..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Tombol Approve / Tolak */}
          {reward.reward_status !== "selesai" && reward.reward_status !== "ditolak" && (
            <div className="flex gap-3 pt-1">
              <button onClick={() => handleStatus("selesai")} disabled={updating}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors">
                {updating ? "Memproses..." : "Approve Data Rekening"}
              </button>
              <button onClick={() => handleStatus("ditolak")} disabled={updating}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 transition-colors">
                {updating ? "Memproses..." : "Tolak"}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ── Konten: Pengajuan Reward ──────────────────────────────────────────────────
function PengajuanReward() {
  const [rewards,        setRewards]        = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [selectedReward, setSelectedReward] = useState(null);

  const fetchRewards = async () => {
    setLoading(true);
    try {
      const res  = await fetch("http://127.0.0.1:8000/reward-konfirmasi");
      const data = await res.json();
      setRewards(data);
    } catch {
      setRewards([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRewards(); }, []);

  const menunggu = rewards.filter(r => r.reward_status === "menunggu");
  const diproses = rewards.filter(r => r.reward_status === "diproses");
  const selesai  = rewards.filter(r => r.reward_status === "selesai");

  const Section = ({ title, color, items }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className={`px-5 py-3 border-b flex items-center justify-between ${color}`}>
        <h3 className="font-semibold text-sm uppercase tracking-wide">{title}</h3>
        <span className="text-xs font-bold">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-8">Tidak ada data.</p>
      ) : (
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-2">Nama Ketua</th>
              <th className="px-4 py-2">NIM</th>
              <th className="px-4 py-2">Kategori</th>
              <th className="px-4 py-2">Periode</th>
              <th className="px-4 py-2">Bank</th>
              <th className="px-4 py-2">No. Rekening</th>
              <th className="px-4 py-2">Tgl. Pengajuan</th>
              <th className="px-4 py-2">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map(r => (
              <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{r.nama_ketua}</td>
                <td className="px-4 py-3 font-mono text-gray-600">{r.nim}</td>
                <td className="px-4 py-3 text-gray-600">{KATEGORI_LABEL[r.kategori_lomba] ?? r.kategori_lomba}</td>
                <td className="px-4 py-3 text-gray-600">Periode {r.periode}</td>
                <td className="px-4 py-3 text-gray-600">{r.bank}</td>
                <td className="px-4 py-3 font-mono text-gray-700">{r.nomor_rekening ?? "—"}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{r.created_at}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setSelectedReward(r)}
                    className="px-3 py-1.5 rounded-md text-xs font-semibold bg-gray-800 text-white hover:bg-gray-700 transition-colors"
                  >
                    Detail
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Pengajuan Reward</h2>
          <p className="text-sm text-gray-500 mt-0.5">Data rekening mahasiswa penerima reward prestasi</p>
        </div>
        <button onClick={fetchRewards} className="text-sm text-blue-600 hover:underline">Refresh</button>
      </div>

      {/* Statistik */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5 border border-yellow-200">
          <p className="text-xs text-gray-500 uppercase">Menunggu</p>
          <p className="text-4xl font-bold text-yellow-600 mt-1">{menunggu.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border border-blue-200">
          <p className="text-xs text-gray-500 uppercase">Diproses</p>
          <p className="text-4xl font-bold text-blue-600 mt-1">{diproses.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border border-green-200">
          <p className="text-xs text-gray-500 uppercase">Selesai</p>
          <p className="text-4xl font-bold text-green-600 mt-1">{selesai.length}</p>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-12">Memuat data...</p>
      ) : (
        <>
          <Section title="Menunggu" color="bg-yellow-50 text-yellow-800 border-yellow-200" items={menunggu} />
          <Section title="Diproses" color="bg-blue-50 text-blue-800 border-blue-200"       items={diproses} />
          <Section title="Selesai"  color="bg-green-50 text-green-800 border-green-200"    items={selesai}  />
        </>
      )}

      {selectedReward && (
        <RewardDetailModal
          reward={selectedReward}
          onClose={() => setSelectedReward(null)}
          onStatusUpdate={fetchRewards}
        />
      )}
    </div>
  );
}

// ── Halaman Utama ─────────────────────────────────────────────────────────────
export default function OperatorDashboard() {
  const router = useRouter();
  const [activeMenu, setActiveMenu] = useState("claim");

  const handleLogout = () => {
    sessionStorage.removeItem("role");
    router.push("/");
  };

  useEffect(() => {
    if (sessionStorage.getItem("role") !== "operator") {
      router.replace("/");
    }
  }, [router]);

  const menus = [
    { key: "claim",  label: "Pengajuan Claim",  icon: <IconClaim />  },
    { key: "reward", label: "Pengajuan Reward",  icon: <IconReward /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* ── Sidebar ── */}
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-gray-100">
          <h1 className="text-base font-bold text-gray-900">Anti-Double Claim</h1>
          <p className="text-xs text-gray-400 mt-0.5">Portal Operator</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
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
          <button onClick={handleLogout} className="text-xs text-red-500 hover:text-red-700">
            Keluar
          </button>
        </div>
      </aside>

      {/* ── Area Kanan ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-8 flex-shrink-0">
          <h2 className="text-sm font-semibold text-gray-700">
            {menus.find(m => m.key === activeMenu)?.label}
          </h2>
        </header>

        {/* Konten */}
        <main className="flex-1 px-8 py-8 overflow-y-auto">
          {activeMenu === "claim"  && <PengajuanClaim  router={router} />}
          {activeMenu === "reward" && <PengajuanReward />}
        </main>
      </div>

    </div>
  );
}
