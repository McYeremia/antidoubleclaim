"use client";

import { useEffect, useState } from "react";
import { API, ConfirmModal, AlertModal } from "./shared";
import ClaimSection from "./ClaimSection";

export default function PengajuanClaim({ router }) {
  const [claims,        setClaims]        = useState([]);
  const [ditolakClaims, setDitolakClaims] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [opId,          setOpId]          = useState(null);
  const [discardModal,  setDiscardModal]  = useState(null); // { id, name }
  const [approveModal,  setApproveModal]  = useState(null); // { id, name }
  const [alertModal,    setAlertModal]    = useState(null); // { title, message }
  const [search,        setSearch]        = useState("");

  useEffect(() => {
    setOpId(localStorage.getItem("operator_id"));
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const [res, resDitolak] = await Promise.all([
        fetch(`${API}/claims`),
        fetch(`${API}/claims/ditolak`),
      ]);
      setClaims(res.ok ? await res.json() : []);
      setDitolakClaims(resDitolak.ok ? await resDitolak.json() : []);
    } catch {
      setClaims([]);
      setDitolakClaims([]);
    } finally {
      setLoading(false);
    }
  };

  const opHeaders = (extra = {}) => ({
    ...extra,
    ...(opId ? { "x-operator-id": opId } : {}),
  });

  const handleApprove = (id, e) => {
    e.stopPropagation();
    const claim = claims.find(c => c.id === id);

    // Validasi Rekognisi: Harus ada estimasi dana
    if (claim?.kategori === "rekognisi" && (!claim.estimasi_reward || Number(claim.estimasi_reward) === 0)) {
      setAlertModal({
        title: "Estimasi Dana Belum Diisi",
        message: <>Klaim &ldquo;{claim.nama_lomba}&rdquo; adalah kategori Rekognisi. Harap isi <strong>estimasi dana</strong> di halaman detail terlebih dahulu sebelum menyetujui.</>,
      });
      return;
    }

    setApproveModal({ id, name: claim?.nama_lomba ?? `Klaim #${id}` });
  };

  const handleApproveConfirm = async () => {
    const { id } = approveModal;
    setApproveModal(null);
    const res = await fetch(`${API}/claims/${id}/approve`, { method: "PATCH", headers: opHeaders() });
    if (!res.ok) { alert("Gagal menyetujui klaim."); return; }
    fetchClaims();
  };

  const handleDiscard = (id, e) => {
    e.stopPropagation();
    const claim = claims.find(c => c.id === id);
    setDiscardModal({ id, name: claim?.nama_lomba ?? `Klaim #${id}` });
  };

  const handleDiscardConfirm = async (note) => {
    const { id } = discardModal;
    setDiscardModal(null);
    const res = await fetch(`${API}/claims/${id}`, {
      method: "DELETE",
      headers: opHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ catatan: note || null }),
    });
    if (!res.ok) { alert("Gagal menghapus klaim."); return; }
    fetchClaims();
  };

  const q = search.trim().toLowerCase();
  const filterList = (list) => q
    ? list.filter(c =>
        c.nama_lomba.toLowerCase().includes(q) ||
        c.nama_display.toLowerCase().includes(q) ||
        c.mahasiswa_email.toLowerCase().includes(q)
      )
    : list;

  const perluDitinjau   = filterList(claims.filter(c => c.status === "perlu ditinjau"));
  const belumDicek      = filterList(claims.filter(c => c.status === "belum dicek"));
  const sudahDicek      = filterList(claims.filter(c => c.status === "sudah dicek"));
  const ditolakFiltered = filterList(ditolakClaims);

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

      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <p className="text-[10px] font-black text-orange-400 uppercase tracking-[0.2em]">Perlu Ditinjau</p>
          <p className="text-5xl font-black text-gray-900 mt-3 leading-none">{claims.filter(c => c.status === "perlu ditinjau").length}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <p className="text-[10px] font-black text-[#046137] uppercase tracking-[0.2em]">Belum Dicek</p>
          <p className="text-5xl font-black text-gray-900 mt-3 leading-none">{claims.filter(c => c.status === "belum dicek").length}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <p className="text-[10px] font-black text-green-400 uppercase tracking-[0.2em]">Sudah Dicek</p>
          <p className="text-5xl font-black text-gray-900 mt-3 leading-none">{claims.filter(c => c.status === "sudah dicek").length}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <p className="text-[10px] font-black text-red-400 uppercase tracking-[0.2em]">Ditolak</p>
          <p className="text-5xl font-black text-gray-900 mt-3 leading-none">{ditolakClaims.length}</p>
        </div>
      </div>

      {/* Search / Filter */}
      <div className="relative">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none"
             fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
            d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari nama kegiatan, nama mahasiswa, atau email…"
          className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-[13px] text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#046137]/30 focus:border-[#046137] transition-all shadow-sm"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      {q && (
        <p className="text-[12px] text-gray-400 font-medium -mt-4">
          Menampilkan hasil pencarian untuk <span className="font-black text-gray-700">&ldquo;{search}&rdquo;</span>
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <svg className="w-8 h-8 text-gray-200 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : (
        <div>
          <ClaimSection
            title="Terdeteksi Mirip (Perlu Ditinjau)"
            color="bg-orange-50/30 text-orange-600 border-orange-50"
            items={perluDitinjau} showActions showMirip
            router={router} onApprove={handleApprove} onDiscard={handleDiscard}
          />
          <ClaimSection
            title="Menunggu Verifikasi (Belum Dicek)"
            color="bg-[#f0f7f3]/30 text-[#046137] border-[#f0f7f3]"
            items={belumDicek} showActions
            router={router} onApprove={handleApprove} onDiscard={handleDiscard}
          />
          <ClaimSection
            title="Riwayat Verifikasi (Sudah Dicek)"
            color="bg-green-50/30 text-green-600 border-green-50"
            items={sudahDicek} showVerified
            router={router} onApprove={handleApprove} onDiscard={handleDiscard}
          />

          {/* Riwayat Ditolak */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between bg-red-50/30">
              <h2 className="font-bold text-[11px] uppercase tracking-widest text-red-600">Riwayat Ditolak</h2>
              <span className="text-[11px] font-black bg-white/50 px-2 py-0.5 rounded-full text-red-600">{ditolakFiltered.length}</span>
            </div>
            {ditolakFiltered.length === 0 ? (
              <p className="text-center text-gray-400 text-[13px] py-12">{q ? "Tidak ada hasil." : "Belum ada klaim yang ditolak."}</p>
            ) : (
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest w-16">ID</th>
                    <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Nama Lomba</th>
                    <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Mahasiswa</th>
                    <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Ditolak Oleh</th>
                    <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Alasan</th>
                  </tr>
                </thead>
                <tbody>
                  {ditolakFiltered.map(claim => (
                    <tr key={claim.id}
                        onClick={() => router.push(`/operator/${claim.id}`)}
                        className="hover:bg-gray-50/60 cursor-pointer transition-colors border-b border-gray-50 last:border-0">
                      <td className="px-6 py-4 font-mono text-[12px] text-gray-300 font-bold tabular-nums">#{claim.id}</td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-900 text-[13px]">{claim.nama_lomba}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{claim.tingkat} · {claim.peringkat}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900 text-[13px]">{claim.nama_display}</p>
                        <p className="text-[11px] font-mono text-gray-400 mt-0.5">{claim.mahasiswa_email}</p>
                      </td>
                      <td className="px-6 py-4">
                        {claim.verified_by_nama
                          ? <p className="text-[13px] text-gray-600 font-medium">{claim.verified_by_nama}</p>
                          : <span className="text-gray-200">—</span>}
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        {claim.catatan_penolakan
                          ? <p className="text-[12px] text-gray-500 italic leading-relaxed line-clamp-2">{claim.catatan_penolakan}</p>
                          : <span className="text-gray-200">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!discardModal}
        title="Discard Klaim?"
        message={`Klaim "${discardModal?.name}" akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`}
        variant="danger"
        requireNote
        noteLabel="Alasan discard"
        notePlaceholder="Contoh: Duplikat terdeteksi, sertifikat tidak valid..."
        confirmLabel="YA, DISCARD"
        onConfirm={handleDiscardConfirm}
        onCancel={() => setDiscardModal(null)}
      />

      <ConfirmModal
        isOpen={!!approveModal}
        title="Setujui Klaim?"
        message={`Konfirmasi persetujuan untuk klaim "${approveModal?.name}". Pastikan semua data sudah valid.`}
        variant="success"
        confirmLabel="YA, SETUJUI"
        onConfirm={handleApproveConfirm}
        onCancel={() => setApproveModal(null)}
      />

      <AlertModal
        isOpen={!!alertModal}
        title={alertModal?.title}
        message={alertModal?.message}
        variant="warning"
        onClose={() => setAlertModal(null)}
      />
    </div>
  );
}
