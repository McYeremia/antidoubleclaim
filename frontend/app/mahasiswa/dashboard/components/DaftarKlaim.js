"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  API_URL, apiFetch,
  STATUS_LABEL, STATUS_STYLE,
  REWARD_LABEL, REWARD_STYLE,
  formatTanggal, formatDatetime,
  InfoRow,
} from "./shared";


export default function DaftarKlaim({ session, search, onOpenForm, onTambahKlaim, onGoProfil, profilLengkap, profil }) {
  const router = useRouter();
  const [claims, setClaims]              = useState([]);
  const [rewardMap, setRewardMap]        = useState({});
  const [pengajuanMap, setPengajuanMap]  = useState({});
  const [loading, setLoading]            = useState(true);
  const [showProfilGate, setShowProfilGate] = useState(false);
  const fetchClaims = async () => {
    setLoading(true);
    try {
      const [claimRes, rewardRes, pengajuanRes, anggotaRes] = await Promise.all([
        apiFetch(`${API_URL}/claims?email=${encodeURIComponent(session.user.email)}`),
        apiFetch(`${API_URL}/reward-konfirmasi?email=${encodeURIComponent(session.user.email)}`),
        apiFetch(`${API_URL}/pengajuan?email=${encodeURIComponent(session.user.email)}`),
        apiFetch(`${API_URL}/klaim-sebagai-anggota?email=${encodeURIComponent(session.user.email)}`),
      ]);
      const claimData     = claimRes.ok     ? await claimRes.json()     : [];
      const rewardData    = rewardRes.ok    ? await rewardRes.json()    : [];
      const pengajuanData = pengajuanRes.ok ? await pengajuanRes.json() : [];
      const anggotaData   = anggotaRes.ok   ? await anggotaRes.json()   : [];

      // Merge: klaim sendiri + klaim sebagai anggota, hindari duplikat by id
      const ownIds = new Set(claimData.map(c => c.id));
      const merged = [
        ...claimData,
        ...anggotaData.filter(c => !ownIds.has(c.id)),
      ];
      setClaims(merged);

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

  const filterFn = (c) =>
    [c.nama_lomba, c.tingkat, c.peringkat, c.status].some((v) =>
      (v ?? "").toLowerCase().includes(search.toLowerCase())
    );

  const ownClaims     = claims.filter(c => !c.is_anggota);
  const anggotaClaims = claims.filter(c =>  c.is_anggota);
  const filteredOwn     = ownClaims.filter(filterFn);
  const filteredAnggota = anggotaClaims.filter(filterFn);

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 leading-none tracking-tight">Daftar Klaim</h1>
        </div>
        <button
          onClick={profilLengkap ? onTambahKlaim : () => setShowProfilGate(true)}
          className={`flex items-center gap-2 px-5 py-2.5 text-white text-[13px] font-semibold rounded-xl transition-colors flex-shrink-0 mt-1 ${
            profilLengkap ? "bg-[#046137] hover:bg-[#035230]" : "bg-gray-400 hover:bg-gray-500"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Tambah Klaim
        </button>
      </div>

      {profilLengkap === false && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 mb-6">
          <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-[13px] font-bold text-amber-800">Profil belum lengkap</p>
            <p className="text-[12px] text-amber-700 mt-0.5">Lengkapi nomor WhatsApp dan data rekening BNI sebelum mengajukan klaim.</p>
          </div>
          <button onClick={onGoProfil} className="text-[12px] font-black text-amber-700 hover:text-amber-900 underline underline-offset-2 flex-shrink-0">
            Lengkapi Profil →
          </button>
        </div>
      )}

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
      ) : claims.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-gray-100">
          <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-600">Belum ada klaim yang diajukan</p>
          <p className="text-xs text-gray-400 mt-1.5">Klik tombol &quot;Tambah Klaim&quot; untuk mulai mengajukan</p>
        </div>
      ) : (filteredOwn.length === 0 && filteredAnggota.length === 0) ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-gray-100">
          <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-600">Tidak ada hasil pencarian</p>
        </div>
      ) : (
        <div className="space-y-8">

          {/* ── Klaim Saya ──────────────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[11px] font-bold text-gray-400 tracking-widest uppercase">
                {anggotaClaims.length > 0 ? "Klaim Saya" : "Riwayat Aktivitas"}
              </h2>
            </div>

            {filteredOwn.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-100">
                <p className="text-sm font-semibold text-gray-500">Belum ada klaim yang diajukan sendiri</p>
                <p className="text-xs text-gray-400 mt-1">Klik &quot;Tambah Klaim&quot; untuk mulai mengajukan</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <table className="w-full table-fixed text-sm text-left">
                  <colgroup>
                    <col className="w-14" />
                    <col className="w-[160px]" />
                    <col className="w-[120px]" />
                    <col className="w-[160px]" />
                    <col className="w-[120px]" />
                    <col className="w-[130px]" />
                    <col className="w-[140px]" />
                    <col className="w-[80px]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-5 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">No</th>
                      <th className="px-5 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Nama Lomba</th>
                      <th className="px-5 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Tingkat</th>
                      <th className="px-5 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Peringkat</th>
                      <th className="px-5 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Tgl. Pengajuan</th>
                      <th className="px-5 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Status Klaim</th>
                      <th className="px-5 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Status Reward</th>
                      <th className="px-5 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOwn.map((claim, idx) => (
                      <tr key={claim.id}
                          onClick={() => router.push(`/mahasiswa/klaim/${claim.id}`)}
                          className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 cursor-pointer transition-colors">
                        <td className="px-5 py-4 text-gray-300 text-[12px] font-semibold tabular-nums">{String(idx + 1).padStart(2, "0")}</td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-gray-900 text-[13px]">{claim.nama_lomba}</p>
                        </td>
                        <td className="px-5 py-4 text-[13px] text-gray-500">{claim.tingkat}</td>
                        <td className="px-5 py-4">
                          <span className="inline-block max-w-full truncate px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#046137] text-white">
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
                                className="px-3 py-1.5 rounded-xl text-[11px] font-black bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors border border-orange-200"
                              >
                                Isi Data Rekening
                              </button>
                            )
                          )}
                        </td>
                        <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => router.push(`/mahasiswa/klaim/${claim.id}`)}
                            className="px-3 py-1.5 rounded-xl text-[11px] font-black bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors border border-gray-200"
                          >
                            DETAIL
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-5 py-3 border-t border-gray-50">
                  <p className="text-[11px] text-gray-300 font-medium">{filteredOwn.length} klaim ditemukan</p>
                </div>
              </div>
            )}
          </div>

          {/* ── Klaim Tim (Anggota) ─────────────────────────────────────── */}
          {filteredAnggota.length > 0 && (
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <h2 className="text-[11px] font-bold text-gray-400 tracking-widest uppercase">
                  Klaim Tim
                </h2>
              </div>
              <p className="text-[12px] text-gray-400 mb-4">
               Anda ditambahkan sebagai anggota oleh ketua tim anda.
              </p>
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <table className="w-full table-fixed text-sm text-left">
                  <colgroup>
                    <col className="w-14" />
                    <col className="w-[160px]" />
                    <col className="w-[120px]" />
                    <col className="w-[160px]" />
                    <col className="w-[120px]" />
                    <col className="w-[130px]" />
                    <col className="w-[140px]" />
                    <col className="w-[80px]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-5 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">No</th>
                      <th className="px-5 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Nama Lomba</th>
                      <th className="px-5 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Tingkat</th>
                      <th className="px-5 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Peringkat</th>
                      <th className="px-5 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Tgl. Pengajuan</th>
                      <th className="px-5 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Status Klaim</th>
                      <th className="px-5 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Status Reward</th>
                      <th className="px-5 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAnggota.map((claim, idx) => (
                      <tr key={claim.id}
                          onClick={() => router.push(`/mahasiswa/klaim/${claim.id}?readonly=true`)}
                          className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 cursor-pointer transition-colors">
                        <td className="px-5 py-4 text-gray-300 text-[12px] font-semibold tabular-nums">{String(idx + 1).padStart(2, "0")}</td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-gray-900 text-[13px]">{claim.nama_lomba}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">Ketua: {claim.nama_display}</p>
                        </td>
                        <td className="px-5 py-4 text-[13px] text-gray-500">{claim.tingkat}</td>
                        <td className="px-5 py-4">
                          <span className="inline-block max-w-full truncate px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#046137] text-white">
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
                            claim.reward_status_tim ? (
                              <span className={`inline-flex items-center whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-semibold ${REWARD_STYLE[claim.reward_status_tim] ?? "bg-gray-100 text-gray-600"}`}>
                                {REWARD_LABEL[claim.reward_status_tim] ?? claim.reward_status_tim}
                              </span>
                            ) : (
                              <span className="text-gray-300 text-[12px]">Menunggu ketua</span>
                            )
                          )}
                        </td>
                        <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => router.push(`/mahasiswa/klaim/${claim.id}?readonly=true`)}
                            className="px-3 py-1.5 rounded-xl text-[11px] font-black bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors border border-gray-200"
                          >
                            DETAIL
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-5 py-3 border-t border-gray-50">
                  <p className="text-[11px] text-gray-300 font-medium">{filteredAnggota.length} klaim tim ditemukan</p>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {showProfilGate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setShowProfilGate(false)}>
          <div className="bg-white rounded-[28px] shadow-2xl w-full max-w-sm p-8" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mb-5">
              <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-[16px] font-black text-gray-900 mb-2">Profil Belum Lengkap</h3>
            <p className="text-[13px] text-gray-500 leading-relaxed mb-6">
              Sebelum mengajukan klaim, lengkapi terlebih dahulu data berikut di halaman <span className="font-bold text-gray-700">Profil</span>:
            </p>
            {(() => {
              const checks = [
                { label: "Nomor WhatsApp",          ok: !!profil?.nomor_wa },
                { label: "Nama Pemilik Rekening",    ok: !!profil?.nama_pemilik_rekening },
                { label: "Nomor Rekening BNI (10 digit)", ok: profil?.nomor_rekening?.length === 10 },
              ];
              const allDone = checks.every(c => c.ok);
              return (
                <>
                  <ul className="space-y-2 mb-5">
                    {checks.map(({ label, ok }) => (
                      <li key={label} className="flex items-center gap-2.5 text-[13px]">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${ok ? "bg-green-100" : "bg-red-100"}`}>
                          {ok ? (
                            <svg className="w-2.5 h-2.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-2.5 h-2.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                        </div>
                        <span className={ok ? "text-gray-400 line-through" : "text-gray-700"}>{label}</span>
                      </li>
                    ))}
                  </ul>
                  {allDone && (
                    <p className="text-[12px] text-green-600 font-semibold mb-5">Semua data sudah lengkap! Kamu bisa mengajukan klaim sekarang.</p>
                  )}
                </>
              );
            })()}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowProfilGate(false)}
                className="flex-1 px-4 py-2.5 text-[12px] font-bold text-gray-500 hover:text-gray-900 transition-colors"
              >
                Nanti Saja
              </button>
              <button
                onClick={() => { setShowProfilGate(false); onGoProfil(); }}
                className="flex-1 px-4 py-2.5 bg-[#046137] text-white text-[12px] font-black rounded-xl hover:bg-[#035230] transition-colors"
              >
                Lengkapi Profil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
