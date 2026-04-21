"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  API_URL,
  STATUS_LABEL, STATUS_STYLE,
  REWARD_LABEL, REWARD_STYLE,
  formatTanggal, formatDatetime,
  InfoRow,
} from "./shared";


export default function DaftarKlaim({ session, search, onOpenForm, onTambahKlaim }) {
  const router = useRouter();
  const [claims, setClaims]              = useState([]);
  const [rewardMap, setRewardMap]        = useState({});
  const [pengajuanMap, setPengajuanMap]  = useState({});
  const [loading, setLoading]            = useState(true);
  const fetchClaims = async () => {
    setLoading(true);
    try {
      const [claimRes, rewardRes, pengajuanRes] = await Promise.all([
        fetch(`${API_URL}/claims?email=${encodeURIComponent(session.user.email)}`),
        fetch(`${API_URL}/reward-konfirmasi?email=${encodeURIComponent(session.user.email)}`),
        fetch(`${API_URL}/pengajuan?email=${encodeURIComponent(session.user.email)}`),
      ]);
      const claimData     = await claimRes.json();
      const rewardData    = rewardRes.ok     ? await rewardRes.json()    : [];
      const pengajuanData = pengajuanRes.ok  ? await pengajuanRes.json() : [];
      setClaims(claimData);
      const map = {};
      rewardData.forEach(r => { map[r.claim_id] = r; });
      setRewardMap(map);
      const pMap = {};
      pengajuanData.forEach(p => { if (p.claim_id) pMap[p.claim_id] = p; });
      setPengajuanMap(pMap);
    } catch {
      setClaims([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClaims(); }, []);

  // Fix: null-safe filter agar tidak crash jika field kosong
  const filtered = claims.filter((c) =>
    [c.nama_lomba, c.tingkat, c.peringkat, c.status].some((v) =>
      (v ?? "").toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div>
      <div className="flex items-start justify-between mb-10">
        <div>
          <h1 className="text-4xl font-black text-gray-900 leading-none tracking-tight">Daftar Klaim</h1>
          <p className="text-gray-400 mt-3 text-[14px]">Riwayat klaim sertifikat prestasi yang telah diajukan.</p>
        </div>
        <button
          onClick={onTambahKlaim}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#046137] text-white text-[13px] font-semibold rounded-xl hover:bg-[#035230] transition-colors flex-shrink-0 mt-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Tambah Klaim
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-3 text-gray-400">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <span className="text-sm">Memuat data...</span>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-gray-100">
          <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-600">
            {claims.length === 0 ? "Belum ada klaim yang diajukan" : "Tidak ada hasil pencarian"}
          </p>
          {claims.length === 0 && (
            <p className="text-xs text-gray-400 mt-1.5">Klik tombol "Tambah Klaim" untuk mulai mengajukan</p>
          )}
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[11px] font-bold text-gray-400 tracking-widest uppercase">Riwayat Aktivitas</h2>
            <button className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 hover:text-gray-600 tracking-wider uppercase">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M7 8h10M10 12h4" />
              </svg>
              Filter
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-5 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest w-14">No</th>
                  <th className="px-5 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Nama Lomba</th>
                  <th className="px-5 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Tingkat</th>
                  <th className="px-5 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Peringkat</th>
                  <th className="px-5 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Tgl. Pengajuan</th>
                  <th className="px-5 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Status</th>
                  <th className="px-5 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Status Reward</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((claim, idx) => (
                  <tr key={claim.id} onClick={() => router.push("/mahasiswa/klaim/" + claim.id)}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 cursor-pointer transition-colors">
                    <td className="px-5 py-4 text-gray-300 text-[12px] font-semibold tabular-nums">{String(idx + 1).padStart(2, "0")}</td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-900 text-[13px]">{claim.nama_lomba}</p>
                    </td>
                    <td className="px-5 py-4 text-[13px] text-gray-500">{claim.tingkat}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#046137] text-white">
                        {claim.peringkat}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-[12px] text-gray-400">{pengajuanMap[claim.id]?.created_at ? formatTanggal(pengajuanMap[claim.id].created_at) : formatTanggal(claim.tanggal)}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center whitespace-nowrap px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_STYLE(claim.status)}`}>
                        {STATUS_LABEL(claim.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-[13px]" onClick={(e) => e.stopPropagation()}>
                      {claim.status === "sudah dicek" && (
                        rewardMap[claim.id] ? (
                          <span className={`inline-flex items-center whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-semibold ${REWARD_STYLE[rewardMap[claim.id].reward_status] ?? "bg-gray-100 text-gray-600"}`}>
                            {REWARD_LABEL[rewardMap[claim.id].reward_status] ?? rewardMap[claim.id].reward_status}
                          </span>
                        ) : (
                          <button
                            onClick={() => onOpenForm?.(claim.id)}
                            className="text-[13px] font-semibold text-[#046137] hover:text-[#035230] transition-colors underline underline-offset-2"
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
            <div className="px-5 py-3 border-t border-gray-50">
              <p className="text-[11px] text-gray-300 font-medium">{filtered.length} klaim ditemukan</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
