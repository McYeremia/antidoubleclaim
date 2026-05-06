"use client";

import { useState, useEffect } from "react";
import KonfirmasiRewardFormPanel from "../KonfirmasiRewardFormPanel";
import {
  API_URL, apiFetch,
  REWARD_LABEL, REWARD_STYLE,
  KATEGORI_LABEL,
  InfoRow,
} from "./shared";

function RewardDetailModal({ claim, reward, onClose }) {
  if (!claim || !reward) return null;
  const filename = (path) => path ? path.split(/[\\/]/).pop() : null;
  const fileUrl  = (path) => { const f = filename(path); return f ? `/api/file?name=${f}` : null; };

  const docs = [
    { label: "Buku Tabungan",    path: reward.foto_buku_tabungan_path },
    { label: "KTM",              path: reward.foto_ktm_path },
    { label: "KTP",              path: reward.foto_ktp_path },
    { label: "Pakta Integritas", path: reward.pakta_integritas_path },
    { label: "Laporan Akhir",    path: reward.laporan_akhir_path },
    { label: "Karya Publikasi",  path: reward.karya_publikasi_path },
  ].filter(d => d.path);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
           onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
          <div>
            <h3 className="text-base font-bold text-gray-900">Detail Data Reward</h3>
            <p className="text-xs text-gray-400 mt-0.5">{claim.nama_lomba}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-semibold ${REWARD_STYLE[reward.reward_status] ?? "bg-gray-100 text-gray-600"}`}>
              {REWARD_LABEL[reward.reward_status] ?? reward.reward_status}
            </span>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {reward.catatan_operator && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-orange-700 mb-0.5">Catatan dari Operator:</p>
              <p className="text-sm text-orange-800">{reward.catatan_operator}</p>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-1 mb-3">Info Pengajuan</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <InfoRow label="Kategori"          value={KATEGORI_LABEL[reward.kategori_lomba] ?? reward.kategori_lomba} />
              <InfoRow label="Periode"           value={reward.periode ? `Periode ${reward.periode}` : null} />
              <InfoRow label="No. Urut Lampiran" value={reward.nomor_urut_lampiran} />
              <InfoRow label="Tahun Klaim"       value={reward.tahun_klaim} />
              <InfoRow label="Tahun Kegiatan"    value={reward.tahun_kegiatan} />
              {reward.judul_lomba && <div className="col-span-2"><InfoRow label="Judul Lomba" value={reward.judul_lomba} /></div>}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-1 mb-3">Data Diri</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <InfoRow label="Nama Ketua" value={reward.nama_ketua} />
              <InfoRow label="NIM"        value={reward.nim} />
              <InfoRow label="Nomor WA"   value={reward.nomor_wa} />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-1 mb-3">Data Rekening</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <InfoRow label="Nama Pemilik" value={reward.nama_pemilik_rekening} />
              <InfoRow label="Bank"         value={reward.bank} />
              <div className="col-span-2"><InfoRow label="Nomor Rekening" value={reward.nomor_rekening} /></div>
            </div>
          </div>

          {docs.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-1 mb-3">Dokumen Terupload</p>
              <div className="grid grid-cols-2 gap-3">
                {docs.map(d => (
                  <div key={d.label}>
                    <p className="text-xs text-gray-400 uppercase">{d.label}</p>
                    <a href={fileUrl(d.path)} target="_blank" rel="noopener noreferrer"
                       className="text-sm text-blue-600 hover:underline mt-0.5 inline-block truncate max-w-full">
                      {filename(d.path)} ↗
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function KonfirmasiReward({ session, initialClaimId = null, onClearInitial }) {
  const [claims,            setClaims]            = useState([]);
  const [rewardMap,         setRewardMap]         = useState({});
  const [pengajuanMap,      setPengajuanMap]      = useState({});
  const [loading,           setLoading]           = useState(true);
  const [selectedClaimId,   setSelectedClaimId]   = useState(initialClaimId);
  const [detailRewardClaim, setDetailRewardClaim] = useState(null);

  // Fix: tambah onClearInitial ke dependency array
  useEffect(() => {
    if (initialClaimId) {
      setSelectedClaimId(initialClaimId);
      onClearInitial?.();
    }
  }, [initialClaimId, onClearInitial]);

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      apiFetch(`${API_URL}/claims?email=${encodeURIComponent(session.user.email)}`),
      apiFetch(`${API_URL}/reward-konfirmasi?email=${encodeURIComponent(session.user.email)}`),
      apiFetch(`${API_URL}/pengajuan?email=${encodeURIComponent(session.user.email)}`),
    ]).then(async ([claimRes, rewardRes, pengajuanRes]) => {
      const claimData     = await claimRes.json();
      const rewardData    = rewardRes.ok    ? await rewardRes.json()    : [];
      const pengajuanData = pengajuanRes.ok ? await pengajuanRes.json() : [];
      setClaims(claimData.filter(c => c.status === "sudah dicek"));
      const rMap = {};
      rewardData.forEach(r => { rMap[r.claim_id] = r; });
      setRewardMap(rMap);
      const pMap = {};
      pengajuanData.forEach(p => { if (p.claim_id) pMap[p.claim_id] = p; });
      setPengajuanMap(pMap);
    }).catch(() => setClaims([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  const belumDiisi   = claims.filter(c => !rewardMap[c.id]);
  const dikembalikan = claims.filter(c => rewardMap[c.id]?.reward_status === "dikembalikan");
  const sudahDiisi   = claims.filter(c => rewardMap[c.id] && rewardMap[c.id].reward_status !== "dikembalikan");

  const ClaimTable = ({ items, mode, onDetail }) => (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider w-10">No.</th>
            <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Nama Lomba</th>
            <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Tingkat</th>
            <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Peringkat</th>
            <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Estimasi Dana</th>
            <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">
              {mode === "status" ? "Status Reward" : "Aksi"}
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((claim, idx) => {
            const estimasi = pengajuanMap[claim.id]?.estimasi_reward;
            const reward   = rewardMap[claim.id];
            return (
              <tr key={claim.id} className="border-b border-gray-50 hover:bg-blue-50/40 transition-colors">
                <td className="px-4 py-3.5 text-gray-400 text-xs font-medium">{idx + 1}</td>
                <td className="px-4 py-3.5 font-semibold text-gray-900">{claim.nama_lomba}</td>
                <td className="px-4 py-3.5 text-gray-500">{claim.tingkat}</td>
                <td className="px-4 py-3.5 text-gray-500">{claim.peringkat}</td>
                <td className="px-4 py-3.5">
                  {estimasi != null
                    ? <span className="font-semibold text-blue-600">{"Rp " + Number(estimasi).toLocaleString("id-ID")}</span>
                    : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3.5 text-right">
                  {mode === "isi" && (
                    <button
                      onClick={() => setSelectedClaimId(claim.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#046137] text-white hover:bg-[#035230] transition-colors"
                    >
                      + Isi Data Reward
                    </button>
                  )}
                  {mode === "kembali" && (
                    <button
                      onClick={() => setSelectedClaimId(claim.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                    >
                      Perbaiki & Kirim Ulang
                    </button>
                  )}
                  {mode === "status" && (
                    <div className="flex items-center justify-end gap-2">
                      <span className={`inline-flex items-center whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-semibold ${REWARD_STYLE[reward?.reward_status] ?? "bg-gray-100 text-gray-600"}`}>
                        {REWARD_LABEL[reward?.reward_status] ?? "—"}
                      </span>
                      <button
                        onClick={() => onDetail?.(claim)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                      >
                        Detail
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  if (selectedClaimId) {
    return (
      <KonfirmasiRewardFormPanel
        claimId={selectedClaimId}
        session={session}
        onBack={() => setSelectedClaimId(null)}
        onSuccess={() => { setSelectedClaimId(null); fetchAll(); }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-black text-gray-900 leading-none tracking-tight">Pencairan Reward</h1>
        <p className="text-gray-400 mt-3 text-[14px]">
          Data rekening dibutuhkan untuk proses pencairan dana reward setelah klaim disetujui.
        </p>
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-16">Memuat data...</p>
      ) : claims.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 bg-white rounded-xl border border-dashed border-gray-200">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mb-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-500">Belum ada klaim yang disetujui</p>
          <p className="text-xs text-gray-400 mt-0.5">Klaim perlu diverifikasi operator terlebih dahulu</p>
        </div>
      ) : (
        <>
          {dikembalikan.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-orange-700 mb-2 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-orange-500"></span>
                Perlu Diperbaiki ({dikembalikan.length})
              </h3>
              <div className="space-y-3">
                {dikembalikan.map(claim => {
                  const reward = rewardMap[claim.id];
                  return (
                    <div key={claim.id} className="rounded-xl border border-orange-200 overflow-hidden">
                      {reward?.catatan_operator && (
                        <div className="bg-orange-50 px-4 py-3 border-b border-orange-200 flex gap-3">
                          <svg className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
                            <p className="text-xs font-semibold text-orange-700 mb-0.5">Catatan dari Operator:</p>
                            <p className="text-sm text-orange-800">{reward.catatan_operator}</p>
                          </div>
                        </div>
                      )}
                      <ClaimTable items={[claim]} mode="kembali" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {belumDiisi.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-orange-600 mb-2">
                Belum Diisi ({belumDiisi.length})
              </h3>
              <ClaimTable items={belumDiisi} mode="isi" />
            </div>
          )}

          {sudahDiisi.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-2">
                Sudah Diisi ({sudahDiisi.length})
              </h3>
              <ClaimTable items={sudahDiisi} mode="status" onDetail={c => setDetailRewardClaim(c)} />
            </div>
          )}
        </>
      )}

      {detailRewardClaim && (
        <RewardDetailModal
          claim={detailRewardClaim}
          reward={rewardMap[detailRewardClaim.id]}
          onClose={() => setDetailRewardClaim(null)}
        />
      )}
    </div>
  );
}
