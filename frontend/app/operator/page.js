"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API = "http://127.0.0.1:8000";

// ── Ikon Sidebar ──────────────────────────────────────────────────────────────
const IconClaim = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);
const IconReward = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
  </svg>
);
const IconUsers = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);
const IconCalendar = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

// ── Badge status claim ────────────────────────────────────────────────────────
const STATUS_BADGE = {
  "perlu ditinjau": "bg-orange-100 text-orange-700",
  "belum dicek":    "bg-blue-100 text-blue-700",
  "sudah dicek":    "bg-green-100 text-green-700",
};

// ── Konten: Pengajuan Claim ───────────────────────────────────────────────────
function PengajuanClaim({ router }) {
  const [claims, setClaims]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [opId,    setOpId]    = useState(null);

  useEffect(() => {
    setOpId(sessionStorage.getItem("operator_id"));
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/claims`);
      const data = await res.json();
      setClaims(data);
    } catch {
      setClaims([]);
    } finally {
      setLoading(false);
    }
  };

  const opHeaders = (extra = {}) => ({
    ...extra,
    ...(opId ? { "x-operator-id": opId } : {}),
  });

  const handleApprove = async (id, e) => {
    e.stopPropagation();
    await fetch(`${API}/claims/${id}/approve`, { method: "PATCH", headers: opHeaders() });
    fetchClaims();
  };

  const handleDiscard = async (id, e) => {
    e.stopPropagation();
    if (!confirm("Yakin ingin menghapus klaim ini?")) return;
    await fetch(`${API}/claims/${id}`, { method: "DELETE", headers: opHeaders() });
    fetchClaims();
  };

  const perluDitinjau = claims.filter(c => c.status === "perlu ditinjau");
  const belumDicek    = claims.filter(c => c.status === "belum dicek");
  const sudahDicek    = claims.filter(c => c.status === "sudah dicek");

  const Section = ({ title, color, items, showActions, showMirip, showVerified }) => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
      <div className={`px-6 py-4 border-b flex items-center justify-between border-gray-50 ${color}`}>
        <h2 className="font-bold text-[11px] uppercase tracking-widest">{title}</h2>
        <span className="text-[11px] font-black bg-white/50 px-2 py-0.5 rounded-full">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-center text-gray-400 text-[13px] py-12">Tidak ada data untuk kategori ini.</p>
      ) : (
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-gray-50">
              <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest w-16">ID</th>
              <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Nama Lomba</th>
              <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Tingkat</th>
              <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Peringkat</th>
              <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Tanggal</th>
              {showMirip    && <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Mirip Dengan</th>}
              {showVerified && <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Diverifikasi Oleh</th>}
              {showActions  && <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest text-right">Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {items.map(claim => (
              <tr key={claim.id}
                  onClick={() => router.push(`/operator/${claim.id}`)}
                  className="hover:bg-gray-50/60 cursor-pointer transition-colors border-b border-gray-50 last:border-0">
                <td className="px-6 py-4 font-mono text-[12px] text-gray-300 font-bold tabular-nums">#{claim.id}</td>
                <td className="px-6 py-4">
                   <p className="font-bold text-gray-900 text-[13px]">{claim.nama_lomba}</p>
                   <p className="text-[11px] text-gray-400 mt-0.5 font-medium">{claim.nama_display}</p>
                </td>
                <td className="px-6 py-4 text-[13px] text-gray-500 font-medium">{claim.tingkat}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black bg-gray-900 text-white">
                    {claim.peringkat}
                  </span>
                </td>
                <td className="px-6 py-4 text-[12px] text-gray-400 font-medium">{claim.tanggal}</td>
                {showMirip && (
                  <td className="px-6 py-4">
                    {claim.mirip_dengan_id ? (
                      <button
                        onClick={e => { e.stopPropagation(); router.push(`/operator/${claim.mirip_dengan_id}`); }}
                        className="px-2.5 py-1 rounded-full text-[11px] font-black bg-orange-100 text-orange-700 hover:bg-orange-200"
                      >
                        #{claim.mirip_dengan_id}
                      </button>
                    ) : <span className="text-gray-200">—</span>}
                  </td>
                )}
                {showVerified && (
                  <td className="px-6 py-4">
                    {claim.verified_by_nama ? (
                      <div>
                        <p className="font-bold text-gray-900 text-[13px]">{claim.verified_by_nama}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5 font-medium">{claim.verified_at ?? "—"}</p>
                      </div>
                    ) : (
                      <span className="text-gray-200">—</span>
                    )}
                  </td>
                )}
                {showActions && (
                  <td className="px-6 py-4 text-right space-x-2" onClick={e => e.stopPropagation()}>
                    <button onClick={e => handleApprove(claim.id, e)}
                      className="px-3 py-1.5 rounded-xl text-[11px] font-black bg-gray-900 text-white hover:bg-gray-700 transition-colors">
                      APPROVE
                    </button>
                    <button onClick={e => handleDiscard(claim.id, e)}
                      className="px-3 py-1.5 rounded-xl text-[11px] font-black bg-red-50 text-red-600 hover:bg-red-100 transition-colors border border-red-100">
                      DISCARD
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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-black text-gray-900 leading-none tracking-tight">Pengajuan Claim</h1>
          <p className="text-gray-400 mt-3 text-[14px]">Tinjau dan verifikasi klaim sertifikat prestasi mahasiswa.</p>
        </div>
        <button
          onClick={fetchClaims}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-500 text-[12px] font-bold rounded-xl hover:bg-gray-50 transition-colors mt-1"
        >
          <svg className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          REFRESH
        </button>
      </div>

      {/* Statistik */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <p className="text-[10px] font-black text-orange-400 uppercase tracking-[0.2em]">Perlu Ditinjau</p>
          <p className="text-5xl font-black text-gray-900 mt-3 leading-none">{perluDitinjau.length}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Belum Dicek</p>
          <p className="text-5xl font-black text-gray-900 mt-3 leading-none">{belumDicek.length}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <p className="text-[10px] font-black text-green-400 uppercase tracking-[0.2em]">Sudah Dicek</p>
          <p className="text-5xl font-black text-gray-900 mt-3 leading-none">{sudahDicek.length}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <svg className="w-8 h-8 text-gray-200 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : (
        <div>
          <Section title="Terdeteksi Mirip (Perlu Ditinjau)"
            color="bg-orange-50/30 text-orange-600 border-orange-50"
            items={perluDitinjau} showActions={true}  showMirip={true}  showVerified={false} />
          <Section title="Menunggu Verifikasi (Belum Dicek)"
            color="bg-blue-50/30 text-blue-600 border-blue-50"
            items={belumDicek}    showActions={true}  showMirip={false} showVerified={false} />
          <Section title="Riwayat Verifikasi (Sudah Dicek)"
            color="bg-green-50/30 text-green-600 border-green-50"
            items={sudahDicek}    showActions={false} showMirip={false} showVerified={true} />
        </div>
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
  menunggu:     "bg-blue-100 text-blue-700",
  diproses:     "bg-blue-100 text-blue-700",
  selesai:      "bg-green-100 text-green-700",
  ditolak:      "bg-red-100 text-red-700",
  dikembalikan: "bg-orange-100 text-orange-700",
};

// ── Helper ────────────────────────────────────────────────────────────────────
function InfoRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div>
      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{label}</p>
      <p className="text-gray-900 mt-1 text-[13px] font-medium">{value}</p>
    </div>
  );
}

function DocLink({ label, path }) {
  if (!path) return null;
  const filename = path.split(/[\\/]/).pop();
  return (
    <div>
      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{label}</p>
      <a href={`http://127.0.0.1:8000/uploads/${filename}`} target="_blank" rel="noopener noreferrer"
         className="text-[13px] font-bold text-gray-900 underline underline-offset-2 hover:text-blue-600 mt-1 inline-block">
        {filename} ↗
      </a>
    </div>
  );
}

// ── Modal Detail Reward ───────────────────────────────────────────────────────
function RewardDetailModal({ reward, onClose, onStatusUpdate }) {
  const [claim,       setClaim]       = useState(null);
  const [pengajuan,   setPengajuan]   = useState(null);
  const [updating,    setUpdating]    = useState(false);
  const [catatan,     setCatatan]     = useState(reward.catatan_operator ?? "");

  useEffect(() => {
    if (reward.claim_id) {
      fetch(`http://127.0.0.1:8000/claims/${reward.claim_id}`)
        .then(r => r.ok ? r.json() : null)
        .then(setClaim)
        .catch(() => {});
      fetch(`http://127.0.0.1:8000/pengajuan/by-claim/${reward.claim_id}`)
        .then(r => r.ok ? r.json() : null)
        .then(setPengajuan)
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
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
           onClick={e => e.stopPropagation()}>

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
            <div className="bg-gray-900 rounded-2xl p-6 text-white shadow-xl shadow-gray-200">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Klaim Terkait</p>
              <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Nama Lomba</p>
                  <p className="font-bold text-white mt-0.5">{claim.nama_lomba}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Mahasiswa</p>
                  <p className="font-bold text-white mt-0.5">{claim.nama_display}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Peringkat & Tingkat</p>
                  <p className="text-gray-200 mt-0.5">{claim.peringkat} · {claim.tingkat}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tanggal Klaim</p>
                  <p className="text-gray-200 mt-0.5">{claim.tanggal}</p>
                </div>
              </div>
            </div>
          )}

          {/* Estimasi Dana */}
          {pengajuan?.estimasi_reward != null && (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black text-blue-700 uppercase tracking-wider">Estimasi Dana Penghargaan</p>
                <p className="text-[11px] text-blue-400 mt-1 font-medium italic">SK Rektor No. 078/B.02/UKDW/2023</p>
              </div>
              <p className="text-3xl font-black text-blue-700 tracking-tight">
                {"Rp " + Number(pengajuan.estimasi_reward).toLocaleString("id-ID")}
              </p>
            </div>
          )}

          {/* Grid data */}
          <div className="space-y-8">
            <section>
              <h4 className="text-[11px] font-black text-gray-300 uppercase tracking-[0.3em] border-b border-gray-50 pb-2 mb-4">Data Diri</h4>
              <div className="grid grid-cols-3 gap-6">
                <InfoRow label="Nama Ketua"    value={reward.nama_ketua} />
                <InfoRow label="NIM"           value={reward.nim} />
                <InfoRow label="Nomor WA"      value={reward.nomor_wa} />
              </div>
            </section>

            <section>
              <h4 className="text-[11px] font-black text-gray-300 uppercase tracking-[0.3em] border-b border-gray-50 pb-2 mb-4">Info Pengajuan</h4>
              <div className="grid grid-cols-2 gap-6">
                <InfoRow label="Kategori"      value={KATEGORI_LABEL[reward.kategori_lomba] ?? reward.kategori_lomba} />
                {isPuspresnas && <InfoRow label="Kompetisi"   value={reward.kompetisi_puspresnas} />}
                {(isPuspresnas || isNonPuspresnas) && <InfoRow label="Judul Lomba" value={reward.judul_lomba} />}
                <InfoRow label="Tahun Klaim"   value={reward.tahun_klaim} />
                <InfoRow label="Tahun Kegiatan" value={reward.tahun_kegiatan} />
                <InfoRow label="Periode"        value={`Periode ${reward.periode}`} />
                <InfoRow label="No. Urut Lampiran" value={reward.nomor_urut_lampiran} />
              </div>
            </section>

            <section>
              <h4 className="text-[11px] font-black text-gray-300 uppercase tracking-[0.3em] border-b border-gray-50 pb-2 mb-4">Data Rekening</h4>
              <div className="grid grid-cols-3 gap-6">
                <InfoRow label="Nama Pemilik"  value={reward.nama_pemilik_rekening} />
                <InfoRow label="Bank"          value={reward.bank} />
                <InfoRow label="No. Rekening"  value={reward.nomor_rekening ?? "—"} />
              </div>
            </section>

            <section>
              <h4 className="text-[11px] font-black text-gray-300 uppercase tracking-[0.3em] border-b border-gray-50 pb-2 mb-4">Dokumen</h4>
              <div className="grid grid-cols-2 gap-y-6 gap-x-12">
                <DocLink label="Buku Tabungan"     path={reward.foto_buku_tabungan_path} />
                <DocLink label="Kartu Tanda Mahasiswa" path={reward.foto_ktm_path} />
                <DocLink label="Kartu Tanda Penduduk"  path={reward.foto_ktp_path} />
                <DocLink label="Pakta Integritas"  path={reward.pakta_integritas_path} />
                <DocLink label="Laporan Akhir"     path={reward.laporan_akhir_path} />
                <DocLink label="Karya Publikasi"   path={reward.karya_publikasi_path} />
              </div>
            </section>

            <section>
              <h4 className="text-[11px] font-black text-gray-300 uppercase tracking-[0.3em] border-b border-gray-50 pb-2 mb-4">Catatan Verifikasi</h4>
              <textarea
                rows={3}
                value={catatan}
                onChange={e => setCatatan(e.target.value)}
                placeholder="Tulis catatan revisi atau penolakan..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all"
              />
            </section>
          </div>
        </div>

        {/* Footer Aksi */}
        {reward.reward_status !== "selesai" && reward.reward_status !== "ditolak" && (
          <div className="px-8 py-6 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between flex-shrink-0">
            <div className="flex gap-2">
               <button onClick={() => handleStatus("dikembalikan")} disabled={updating}
                className="px-4 py-2.5 rounded-xl text-[12px] font-black bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors">
                KEMBALIKAN
              </button>
              <button onClick={() => handleStatus("ditolak")} disabled={updating}
                className="px-4 py-2.5 rounded-xl text-[12px] font-black bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
                TOLAK
              </button>
            </div>
            <button onClick={() => handleStatus("selesai")} disabled={updating}
              className="px-8 py-2.5 rounded-xl text-[12px] font-black bg-gray-900 text-white hover:bg-gray-700 transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-gray-200">
              {updating ? "MEMPROSES..." : "APPROVE DATA REKENING"}
            </button>
          </div>
        )}
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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
      <div className={`px-6 py-4 border-b flex items-center justify-between border-gray-50 ${color}`}>
        <h3 className="font-bold text-[11px] uppercase tracking-widest">{title}</h3>
        <span className="text-[11px] font-black bg-white/50 px-2 py-0.5 rounded-full">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-center text-gray-400 text-[13px] py-12">Tidak ada data.</p>
      ) : (
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-gray-50">
              <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Ketua & Institusi</th>
              <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Nama Lomba</th>
              <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Kategori</th>
              <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Rekening</th>
              <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Tgl. Pengajuan</th>
              <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {items.map(r => (
              <tr key={r.id} className="hover:bg-gray-50/60 transition-colors border-b border-gray-50 last:border-0">
                <td className="px-6 py-4">
                  <p className="font-bold text-gray-900 text-[13px]">{r.nama_ketua}</p>
                  <p className="text-[11px] font-mono text-gray-400 mt-0.5">{r.nim}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-[13px] text-gray-700 font-medium truncate max-w-xs">{r.nama_lomba ?? "—"}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5 font-medium italic">Periode {r.periode}</p>
                </td>
                <td className="px-6 py-4">
                   <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black bg-gray-50 text-gray-500 border border-gray-100 uppercase tracking-wider">
                    {KATEGORI_LABEL[r.kategori_lomba] ?? r.kategori_lomba}
                   </span>
                </td>
                <td className="px-6 py-4">
                   <p className="text-[12px] font-black text-gray-900 uppercase">{r.bank}</p>
                   <p className="text-[12px] font-mono text-gray-400 mt-0.5 font-bold">{r.nomor_rekening ?? "—"}</p>
                </td>
                <td className="px-6 py-4 text-[12px] text-gray-400 font-medium">{r.created_at}</td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => setSelectedReward(r)}
                    className="px-4 py-1.5 rounded-xl text-[11px] font-black bg-gray-900 text-white hover:bg-gray-700 transition-all hover:scale-105"
                  >
                    DETAIL
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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-black text-gray-900 leading-none tracking-tight">Pengajuan Reward</h1>
          <p className="text-gray-400 mt-3 text-[14px]">Data rekening mahasiswa untuk pencairan dana penghargaan.</p>
        </div>
        <button
          onClick={fetchRewards}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-500 text-[12px] font-bold rounded-xl hover:bg-gray-50 transition-colors mt-1"
        >
          <svg className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          REFRESH
        </button>
      </div>

      {/* Statistik */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <p className="text-[10px] font-black text-orange-400 uppercase tracking-[0.2em]">Menunggu</p>
          <p className="text-5xl font-black text-gray-900 mt-3 leading-none">{menunggu.length}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Diproses</p>
          <p className="text-5xl font-black text-gray-900 mt-3 leading-none">{diproses.length}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <p className="text-[10px] font-black text-green-400 uppercase tracking-[0.2em]">Selesai</p>
          <p className="text-5xl font-black text-gray-900 mt-3 leading-none">{selesai.length}</p>
        </div>
      </div>

      {loading ? (
         <div className="flex items-center justify-center py-24">
            <svg className="w-8 h-8 text-gray-200 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
      ) : (
        <div>
          <Section title="Antrian Menunggu Verifikasi" color="bg-orange-50/30 text-orange-600 border-orange-50" items={menunggu} />
          <Section title="Data Dalam Proses"            color="bg-blue-50/30 text-blue-600 border-blue-50"       items={diproses} />
          <Section title="Arsip Selesai"                color="bg-green-50/30 text-green-600 border-green-50"    items={selesai}  />
        </div>
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

// ── Konten: Kelola Operator (Super Admin only) ────────────────────────────────
function KelolаOperator({ operatorId }) {
  const [operators, setOperators] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({ username: "", password: "", nama: "", email: "", role: "operator" });

  const headers = { "Content-Type": "application/json", "x-operator-id": String(operatorId) };

  const fetchOperators = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/operators`, { headers });
      const data = await res.json();
      setOperators(data);
    } catch {
      setOperators([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOperators(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      const res = await fetch(`${API}/operators`, {
        method: "POST",
        headers,
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setFormError(d.detail || "Gagal menambah operator.");
        return;
      }
      setForm({ username: "", password: "", nama: "", email: "", role: "operator" });
      setShowForm(false);
      fetchOperators();
    } catch {
      setFormError("Tidak dapat terhubung ke server.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, nama) => {
    if (!confirm(`Hapus akun "${nama}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    const res = await fetch(`${API}/operators/${id}`, { method: "DELETE", headers });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.detail || "Gagal menghapus.");
      return;
    }
    fetchOperators();
  };

  const ROLE_BADGE = {
    superadmin: "bg-purple-100 text-purple-700",
    operator:   "bg-blue-100 text-blue-700",
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-black text-gray-900 leading-none tracking-tight">Kelola Operator</h1>
          <p className="text-gray-400 mt-3 text-[14px]">Manajemen hak akses pengelola sistem.</p>
        </div>
        <button
          onClick={() => { setShowForm(v => !v); setFormError(""); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-[13px] font-bold rounded-xl hover:bg-gray-700 transition-all hover:scale-105 mt-1"
        >
          {showForm ? "BATALKAN" : "+ TAMBAH OPERATOR"}
        </button>
      </div>

      {/* Form Tambah */}
      {showForm && (
        <div className="bg-white rounded-[32px] shadow-2xl shadow-gray-200/50 border border-gray-100 p-10 animate-in slide-in-from-top duration-500">
          <h3 className="text-[16px] font-black text-gray-900 mb-8 uppercase tracking-tight">Akun Pengelola Baru</h3>
          <form onSubmit={handleAdd} className="grid grid-cols-2 gap-6">
            {[
              { label: "Nama Lengkap", name: "nama",     type: "text",     required: true },
              { label: "Email",        name: "email",    type: "email",    required: true },
              { label: "Username",     name: "username", type: "text",     required: true },
              { label: "Password",     name: "password", type: "password", required: true },
            ].map(f => (
              <div key={f.name}>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">{f.label}</label>
                <input
                  type={f.type}
                  required={f.required}
                  value={form[f.name]}
                  onChange={e => setForm(v => ({ ...v, [f.name]: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all"
                />
              </div>
            ))}
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Peran Akun</label>
              <select
                value={form.role}
                onChange={e => setForm(v => ({ ...v, role: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all"
              >
                <option value="operator">Operator (Verifikator)</option>
                <option value="superadmin">Super Admin (Manajer)</option>
              </select>
            </div>
            <div className="col-span-2 flex items-center justify-between mt-4">
              {formError && <p className="text-[13px] font-bold text-red-600 italic">! {formError}</p>}
              <button
                type="submit"
                disabled={saving}
                className="ml-auto px-10 py-3.5 rounded-2xl text-[14px] font-black bg-gray-900 text-white hover:bg-gray-700 transition-all shadow-xl shadow-gray-200"
              >
                {saving ? "MENYIMPAN..." : "SIMPAN OPERATOR"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabel Operator */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
           <div className="flex items-center justify-center py-24">
              <svg className="w-8 h-8 text-gray-200 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
        ) : operators.length === 0 ? (
          <p className="text-center text-gray-400 text-[13px] py-12 font-medium">Belum ada data operator.</p>
        ) : (
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Nama Lengkap</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Username</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Email</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Hak Akses</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {operators.map(op => (
                <tr key={op.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-6 py-4 font-bold text-gray-900 text-[13px]">{op.nama}</td>
                  <td className="px-6 py-4 font-mono text-[12px] font-bold text-gray-400 uppercase tabular-nums">{op.username}</td>
                  <td className="px-6 py-4 text-[13px] text-gray-500 font-medium">{op.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${ROLE_BADGE[op.role] ?? "bg-gray-100 text-gray-600"}`}>
                      {op.role === "superadmin" ? "SUPER ADMIN" : "OPERATOR"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {String(op.id) !== String(operatorId) ? (
                      <button
                        onClick={() => handleDelete(op.id, op.nama)}
                        className="px-3 py-1.5 rounded-xl text-[11px] font-black bg-red-50 text-red-600 hover:bg-red-100 transition-colors border border-red-100"
                      >
                        HAPUS
                      </button>
                    ) : (
                      <span className="text-[11px] text-gray-300 font-black italic tracking-widest uppercase px-3">AKUN ANDA</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Pengaturan Periode ────────────────────────────────────────────────────────
function PengaturanPeriode({ operatorNama }) {
  const [periodeList,    setPeriodeList]    = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [showForm,       setShowForm]       = useState(false);
  const [editingPeriode, setEditingPeriode] = useState(null); // null = mode buat, object = mode edit
  const [saving,         setSaving]         = useState(false);
  const [form, setForm] = useState({
    nama: "", tanggal_mulai: "", tanggal_selesai: "",
  });

  const openCreate = () => {
    setEditingPeriode(null);
    setForm({ nama: "", tanggal_mulai: "", tanggal_selesai: "" });
    setShowForm(true);
  };

  const openEdit = (p) => {
    setEditingPeriode(p);
    setForm({ nama: p.nama, tanggal_mulai: p.tanggal_mulai, tanggal_selesai: p.tanggal_selesai });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingPeriode(null);
    setForm({ nama: "", tanggal_mulai: "", tanggal_selesai: "" });
  };

  const fetchPeriode = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/periode`);
      const data = await res.json();
      setPeriodeList(data);
    } catch { setPeriodeList([]); }
    finally  { setLoading(false); }
  };

  useEffect(() => { fetchPeriode(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nama.trim() || !form.tanggal_mulai || !form.tanggal_selesai) {
      alert("Nama, tanggal mulai, dan tanggal selesai wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      if (editingPeriode) {
        await fetch(`${API}/periode/${editingPeriode.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      } else {
        await fetch(`${API}/periode`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, dibuat_oleh: operatorNama }),
        });
      }
      closeForm();
      fetchPeriode();
    } catch { alert(editingPeriode ? "Gagal menyimpan perubahan." : "Gagal membuat periode."); }
    finally  { setSaving(false); }
  };

  const handleToggle = async (p) => {
    const newStatus = p.status === "aktif" ? "tutup" : "aktif";
    const label     = newStatus === "aktif" ? "membuka" : "menutup";
    if (!confirm(`Yakin ingin ${label} periode "${p.nama}"?`)) return;
    await fetch(`${API}/periode/${p.id}?status=${newStatus}`, { method: "PUT" });
    fetchPeriode();
  };

  const today = new Date().toISOString().slice(0, 10);

  const getPeriodeState = (p) => {
    if (p.status !== "aktif") return "tutup";
    if (today < p.tanggal_mulai) return "belum_mulai";
    if (today > p.tanggal_selesai) return "kadaluarsa";
    return "aktif";
  };

  const STATE_STYLE = {
    aktif:        { badge: "bg-green-100 text-green-700",  label: "Aktif" },
    tutup:        { badge: "bg-gray-100 text-gray-500",    label: "Tutup" },
    belum_mulai:  { badge: "bg-blue-100 text-blue-600",    label: "Belum Dimulai" },
    kadaluarsa:   { badge: "bg-red-100 text-red-600",      label: "Kadaluarsa" },
  };

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <h1 className="text-4xl font-black text-gray-900 leading-none tracking-tight">Pengaturan Periode</h1>
          <p className="text-gray-400 mt-2 text-[14px]">Kelola periode klaim yang dapat diakses mahasiswa.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-[13px] font-semibold rounded-xl hover:bg-gray-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Buat Periode Baru
        </button>
      </div>

      {/* Form buat periode */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <h2 className="text-[13px] font-bold text-gray-700 mb-5 uppercase tracking-widest">
            {editingPeriode ? `Edit Periode — ${editingPeriode.nama}` : "Periode Baru"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                  Nama Periode <span className="text-red-400">*</span>
                </label>
                <input
                  type="text" value={form.nama}
                  onChange={e => setForm(f => ({ ...f, nama: e.target.value }))}
                  placeholder="Contoh: Periode 1 2025"
                  className="block w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                  Tanggal Mulai <span className="text-red-400">*</span>
                </label>
                <input type="date" value={form.tanggal_mulai}
                  onChange={e => setForm(f => ({ ...f, tanggal_mulai: e.target.value }))}
                  className="block w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                  Tanggal Selesai <span className="text-red-400">*</span>
                </label>
                <input type="date" value={form.tanggal_selesai}
                  onChange={e => setForm(f => ({ ...f, tanggal_selesai: e.target.value }))}
                  className="block w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button type="submit" disabled={saving}
                className="px-5 py-2.5 bg-gray-900 text-white text-[13px] font-semibold rounded-xl hover:bg-gray-700 disabled:opacity-50 transition-colors">
                {saving ? "Menyimpan..." : (editingPeriode ? "Simpan Perubahan" : "Simpan Periode")}
              </button>
              <button type="button" onClick={closeForm}
                className="px-5 py-2.5 text-[13px] font-semibold text-gray-500 hover:text-gray-900 transition-colors">
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabel periode */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-gray-400">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <span className="text-sm">Memuat data...</span>
          </div>
        ) : periodeList.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[13px] text-gray-400">Belum ada periode yang dibuat.</p>
            <p className="text-[12px] text-gray-300 mt-1">Klik "Buat Periode Baru" untuk memulai.</p>
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-gray-50 text-left">
                <th className="px-6 py-4 text-[10px] font-black text-gray-300 uppercase tracking-widest">Nama Periode</th>
                <th className="px-4 py-4 text-[10px] font-black text-gray-300 uppercase tracking-widest">Rentang Tanggal</th>
                <th className="px-4 py-4 text-[10px] font-black text-gray-300 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-300 uppercase tracking-widest">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {periodeList.map(p => {
                const state = getPeriodeState(p);
                const style = STATE_STYLE[state];
                return (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{p.nama}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">Dibuat oleh {p.dibuat_oleh || "—"}</p>
                    </td>
                    <td className="px-4 py-4 text-gray-600">
                      {p.tanggal_mulai} <span className="text-gray-300 mx-1">→</span> {p.tanggal_selesai}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold ${style.badge}`}>
                        {style.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(p)}
                          className="px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggle(p)}
                          className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${
                            p.status === "aktif"
                              ? "bg-red-50 text-red-600 hover:bg-red-100"
                              : "bg-green-50 text-green-700 hover:bg-green-100"
                          }`}
                        >
                          {p.status === "aktif" ? "Tutup" : "Aktifkan"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Halaman Utama ─────────────────────────────────────────────────────────────
export default function OperatorDashboard() {
  const router = useRouter();
  const [activeMenu,    setActiveMenu]    = useState("claim");
  const [operatorNama,  setOperatorNama]  = useState("");
  const [operatorRole,  setOperatorRole]  = useState("");
  const [operatorId,    setOperatorId]    = useState(null);
  const [showUserMenu,  setShowUserMenu]  = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("role") !== "operator") {
      router.replace("/");
      return;
    }
    setOperatorNama(sessionStorage.getItem("operator_nama") || "Operator");
    setOperatorRole(sessionStorage.getItem("operator_role") || "operator");
    setOperatorId(sessionStorage.getItem("operator_id"));

    // Sinkronisasi menu dengan URL query param
    const getMenuFromUrl = () =>
      new URLSearchParams(window.location.search).get("menu") || "claim";
    setActiveMenu(getMenuFromUrl());

    const handlePop = () => setActiveMenu(getMenuFromUrl());
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, [router]);

  const navigateTo = (key) => {
    setActiveMenu(key);
    const url = key === "claim"
      ? window.location.pathname
      : `${window.location.pathname}?menu=${key}`;
    window.history.pushState({ menu: key }, "", url);
  };

  const handleLogout = () => {
    ["role","operator_id","operator_nama","operator_username","operator_role"].forEach(k =>
      sessionStorage.removeItem(k)
    );
    router.push("/");
  };

  const isSuperAdmin = operatorRole === "superadmin";

  const menus = [
    { key: "claim",  label: "Pengajuan Claim",  icon: <IconClaim />  },
    { key: "reward", label: "Pengajuan Reward",  icon: <IconReward /> },
    ...(isSuperAdmin ? [
      { key: "operators", label: "Kelola Operator",    icon: <IconUsers />    },
      { key: "periode",   label: "Pengaturan Periode", icon: <IconCalendar /> },
    ] : []),
  ];

  return (
    <div className="min-h-screen bg-[#f7f7f8] flex" style={{ fontFamily: "var(--font-poppins, sans-serif)" }}>

      {/* ── Sidebar ── */}
      <aside className="w-[240px] bg-white flex flex-col flex-shrink-0 border-r border-gray-100">
        {/* Logo */}
        <div className="px-7 pt-9 pb-8">
          <div>
            <p className="text-[22px] font-black text-gray-900 leading-none tracking-tight uppercase">
              ANTI<br />DOUBLE<br />CLAIM
            </p>
            <p className="text-[10px] font-semibold text-gray-400 mt-2.5 tracking-widest uppercase">Portal Pengelola</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 space-y-0.5">
          {menus.map((m) => (
            <button
              key={m.key}
              onClick={() => navigateTo(m.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] text-left transition-colors
                ${activeMenu === m.key
                  ? "text-gray-900 font-bold bg-gray-50 shadow-sm"
                  : "text-gray-400 font-normal hover:text-gray-700 hover:bg-gray-50"
                }`}
            >
              {m.icon}
              {m.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* ── Area Kanan ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-8 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
            <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em]">{activeMenu} node active</h2>
          </div>

          {/* User Profile */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(v => !v)}
              className="flex items-center gap-3 px-3 py-1.5 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
                 <span className="text-xs font-bold text-white uppercase">
                    {operatorNama.split(" ").map(w => w[0]).join("").slice(0,2)}
                 </span>
              </div>
              <div className="text-left">
                <p className="text-[13px] font-bold text-gray-900 leading-tight">{operatorNama}</p>
                <p className="text-[10px] font-black text-gray-400 leading-tight uppercase tracking-widest mt-0.5">
                  {isSuperAdmin ? "Super Admin" : "Operator"}
                </p>
              </div>
              <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showUserMenu ? "rotate-180" : ""}`}
                   fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl border border-gray-100 shadow-2xl z-20 overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="p-1.5">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 transition-colors text-left"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Keluar Sesi
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Konten */}
        <main className="flex-1 px-10 py-10 overflow-y-auto">
          {activeMenu === "claim"     && <PengajuanClaim  router={router} />}
          {activeMenu === "reward"    && <PengajuanReward />}
          {activeMenu === "operators" && isSuperAdmin && <KelolаOperator operatorId={operatorId} />}
          {activeMenu === "periode"   && isSuperAdmin && <PengaturanPeriode operatorNama={operatorNama} />}
        </main>
      </div>

    </div>
  );
}
