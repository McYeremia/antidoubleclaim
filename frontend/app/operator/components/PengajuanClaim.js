"use client";

import { useEffect, useState } from "react";
import { API, ConfirmModal } from "./shared";
import ClaimSection from "./ClaimSection";

export default function PengajuanClaim({ router }) {
  const [claims,       setClaims]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [opId,         setOpId]         = useState(null);
  const [discardModal, setDiscardModal] = useState(null); // { id, name }

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
    const res = await fetch(`${API}/claims/${id}/approve`, { method: "PATCH", headers: opHeaders() });
    if (!res.ok) { alert("Gagal menyetujui klaim."); return; }
    fetchClaims();
  };

  const handleDiscard = (id, e) => {
    e.stopPropagation();
    const claim = claims.find(c => c.id === id);
    setDiscardModal({ id, name: claim?.nama_lomba ?? `Klaim #${id}` });
  };

  const handleDiscardConfirm = async () => {
    const { id } = discardModal;
    setDiscardModal(null);
    const res = await fetch(`${API}/claims/${id}`, { method: "DELETE", headers: opHeaders() });
    if (!res.ok) { alert("Gagal menghapus klaim."); return; }
    fetchClaims();
  };

  const perluDitinjau = claims.filter(c => c.status === "perlu ditinjau");
  const belumDicek    = claims.filter(c => c.status === "belum dicek");
  const sudahDicek    = claims.filter(c => c.status === "sudah dicek");

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
          <ClaimSection
            title="Terdeteksi Mirip (Perlu Ditinjau)"
            color="bg-orange-50/30 text-orange-600 border-orange-50"
            items={perluDitinjau} showActions showMirip
            router={router} onApprove={handleApprove} onDiscard={handleDiscard}
          />
          <ClaimSection
            title="Menunggu Verifikasi (Belum Dicek)"
            color="bg-blue-50/30 text-blue-600 border-blue-50"
            items={belumDicek} showActions
            router={router} onApprove={handleApprove} onDiscard={handleDiscard}
          />
          <ClaimSection
            title="Riwayat Verifikasi (Sudah Dicek)"
            color="bg-green-50/30 text-green-600 border-green-50"
            items={sudahDicek} showVerified
            router={router} onApprove={handleApprove} onDiscard={handleDiscard}
          />
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
    </div>
  );
}
