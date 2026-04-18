"use client";

import { useEffect, useState } from "react";
import { API, ARSIP_STATUS_STYLE, STATUS_BADGE } from "./shared";
import ArsipDetailView from "./ArsipDetailView";

export default function ArsipPeriode() {
  const [periodeList,   setPeriodeList]   = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [selected,      setSelected]      = useState(null);
  const [claims,        setClaims]        = useState([]);
  const [rewards,       setRewards]       = useState([]);
  const [activeTab,     setActiveTab]     = useState("claims");
  const [dataLoading,   setDataLoading]   = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [detailItem,    setDetailItem]    = useState(null);
  const [searchQuery,   setSearchQuery]   = useState("");
  const [periodeSearch, setPeriodeSearch] = useState("");

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

  const openPeriode = async (p) => {
    setSelected(p);
    setActiveTab("claims");
    setDetailItem(null);
    setDataLoading(true);
    try {
      const [rClaims, rRewards] = await Promise.all([
        fetch(`${API}/periode/${p.id}/claims`),
        fetch(`${API}/periode/${p.id}/rewards`),
      ]);
      setClaims(await rClaims.json());
      setRewards(await rRewards.json());
    } catch { setClaims([]); setRewards([]); }
    finally  { setDataLoading(false); }
  };

  const handleTutup = async (p) => {
    if (!confirm(`Tutup periode "${p.nama}"? Mahasiswa tidak dapat mengajukan klaim baru, namun proses reward dapat dilanjutkan.`)) return;
    setActionLoading(true);
    const res = await fetch(`${API}/periode/${p.id}?status=ditutup`, { method: "PUT" });
    setActionLoading(false);
    if (!res.ok) { alert("Gagal menutup periode."); return; }
    fetchPeriode();
    if (selected?.id === p.id) setSelected(prev => ({ ...prev, status: "ditutup" }));
  };

  const handleArsip = async (p) => {
    const opId = sessionStorage.getItem("operator_id");
    if (!confirm(`Arsipkan periode "${p.nama}"? Pastikan semua proses reward sudah selesai.`)) return;
    setActionLoading(true);
    const res = await fetch(`${API}/periode/${p.id}/arsip`, {
      method: "POST",
      headers: opId ? { "x-operator-id": opId } : {},
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.detail || "Tidak dapat mengarsipkan periode ini.");
    }
    setActionLoading(false);
    fetchPeriode();
    if (selected?.id === p.id) openPeriode({ ...p, status: "diarsipkan" });
  };

  const closable   = (p) => p.status === "aktif";
  const archivable = (p) => p.status === "tutup" || p.status === "ditutup";

  if (detailItem) {
    return <ArsipDetailView detailItem={detailItem} rewards={rewards} onBack={() => setDetailItem(null)} />;
  }

  if (selected) {
    const style = ARSIP_STATUS_STYLE[selected.status] ?? { badge: "bg-gray-100 text-gray-500", label: selected.status };
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center gap-4">
          <button onClick={() => setSelected(null)}
            className="text-[11px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-900 transition-colors flex items-center gap-2">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
            </svg>
            Kembali
          </button>
        </div>

        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-black text-gray-900 leading-none tracking-tight">{selected.nama}</h1>
            <p className="text-gray-400 mt-2 text-[14px]">{selected.tanggal_mulai} → {selected.tanggal_selesai}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest ${style.badge}`}>{style.label}</span>
            {closable(selected) && (
              <button onClick={() => handleTutup(selected)} disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-[12px] font-black bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors">
                TUTUP PERIODE
              </button>
            )}
            {archivable(selected) && (
              <button onClick={() => handleArsip(selected)} disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-[12px] font-black bg-purple-900 text-white hover:bg-purple-800 transition-colors">
                ARSIPKAN
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total Klaim",     value: selected.jumlah_klaim ?? 0,    color: "text-gray-900" },
            { label: "Klaim Disetujui", value: selected.klaim_disetujui ?? 0, color: "text-green-600" },
            { label: "Reward Selesai",  value: selected.reward_selesai ?? 0,  color: "text-blue-600" },
            { label: "Reward Pending",  value: selected.reward_pending ?? 0,  color: "text-orange-600" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{s.label}</p>
              <p className={`text-4xl font-black mt-2 leading-none ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {(selected.reward_pending ?? 0) > 0 && selected.status !== "aktif" && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl px-6 py-4 flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-[13px] font-semibold text-orange-900">
              Masih ada <strong>{selected.reward_pending} reward</strong> yang belum selesai. Selesaikan transfer dana sebelum mengarsipkan.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
            {[{ key: "claims", label: `Klaim (${claims.length})` }, { key: "rewards", label: `Reward (${rewards.length})` }].map(tab => (
              <button key={tab.key} onClick={() => { setActiveTab(tab.key); setSearchQuery(""); }}
                className={`px-5 py-2 rounded-lg text-[12px] font-black transition-all ${
                  activeTab === tab.key ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
                }`}>
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text" value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={activeTab === "claims" ? "Cari nama lomba, mahasiswa, email..." : "Cari nama lomba, rekening, bank..."}
              className="pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[13px] text-gray-900 w-[340px] focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all placeholder:text-gray-300"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-600 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {activeTab === "claims" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {dataLoading ? (
              <div className="flex items-center justify-center py-16">
                <svg className="w-7 h-7 text-gray-200 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            ) : (() => {
              const q = searchQuery.toLowerCase().trim();
              const filtered = q ? claims.filter(c =>
                (c.nama_lomba || "").toLowerCase().includes(q) ||
                (c.nama_display || "").toLowerCase().includes(q) ||
                (c.mahasiswa_email || "").toLowerCase().includes(q) ||
                (c.tingkat || "").toLowerCase().includes(q) ||
                (c.peringkat || "").toLowerCase().includes(q) ||
                (c.status || "").toLowerCase().includes(q) ||
                String(c.id).includes(q)
              ) : claims;
              return filtered.length === 0 ? (
                <p className="text-center text-gray-400 text-[13px] py-12">
                  {q ? `Tidak ada klaim yang cocok dengan "${searchQuery}".` : "Tidak ada klaim pada periode ini."}
                </p>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-gray-50">
                      <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest w-16">ID</th>
                      <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Nama Lomba</th>
                      <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Mahasiswa</th>
                      <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Tanggal</th>
                      <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-6 py-4 font-mono text-[12px] text-gray-300 font-bold">#{c.id}</td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-gray-900 text-[13px]">{c.nama_lomba}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{c.tingkat} · {c.peringkat}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900 text-[13px]">{c.nama_display}</p>
                          <p className="text-[11px] font-mono text-gray-400 mt-0.5">{c.mahasiswa_email}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            STATUS_BADGE[c.status] ?? "bg-gray-100 text-gray-500"
                          }`}>{c.status}</span>
                        </td>
                        <td className="px-6 py-4 text-[12px] text-gray-400">{c.tanggal}</td>
                        <td className="px-6 py-4">
                          <button onClick={() => setDetailItem(c)}
                            className="px-3 py-1.5 rounded-lg text-[11px] font-black bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors uppercase tracking-wide">
                            Detail
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })()}
          </div>
        )}

        {activeTab === "rewards" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {dataLoading ? (
              <div className="flex items-center justify-center py-16">
                <svg className="w-7 h-7 text-gray-200 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            ) : (() => {
              const q = searchQuery.toLowerCase().trim();
              const filtered = q ? rewards.filter(r =>
                (r.nama_lomba || "").toLowerCase().includes(q) ||
                (r.nama_rekening || "").toLowerCase().includes(q) ||
                (r.nama_ketua || "").toLowerCase().includes(q) ||
                (r.bank || "").toLowerCase().includes(q) ||
                (r.nomor_rekening || "").toLowerCase().includes(q) ||
                (r.reward_status || "").toLowerCase().includes(q) ||
                String(r.claim_id).includes(q) ||
                String(r.estimasi_reward || "").includes(q)
              ) : rewards;
              return filtered.length === 0 ? (
                <p className="text-center text-gray-400 text-[13px] py-12">
                  {q ? `Tidak ada reward yang cocok dengan "${searchQuery}".` : "Tidak ada data reward pada periode ini."}
                </p>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-gray-50">
                      <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Nama Lomba</th>
                      <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Rekening</th>
                      <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Estimasi</th>
                      <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map(r => {
                      const claimForReward = claims.find(c => c.id === r.claim_id);
                      return (
                        <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-bold text-gray-900 text-[13px]">{r.nama_lomba}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">Klaim #{r.claim_id}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-medium text-gray-900 text-[13px]">{r.nama_rekening}</p>
                            <p className="text-[11px] font-mono text-gray-400 mt-0.5">{r.bank} · {r.nomor_rekening}</p>
                          </td>
                          <td className="px-6 py-4 text-[12px] text-gray-700 font-semibold">{r.estimasi_reward || "—"}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              r.reward_status === "selesai"  ? "bg-green-100 text-green-700"
                              : r.reward_status === "diproses" ? "bg-blue-100 text-blue-700"
                              : "bg-orange-100 text-orange-600"
                            }`}>{r.reward_status}</span>
                          </td>
                          <td className="px-6 py-4">
                            {claimForReward && (
                              <button onClick={() => setDetailItem(claimForReward)}
                                className="px-3 py-1.5 rounded-lg text-[11px] font-black bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors uppercase tracking-wide">
                                Detail
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              );
            })()}
          </div>
        )}
      </div>
    );
  }

  const pq = periodeSearch.toLowerCase().trim();
  const filteredPeriode = pq ? periodeList.filter(p =>
    (p.nama || "").toLowerCase().includes(pq) ||
    (p.dibuat_oleh || "").toLowerCase().includes(pq) ||
    (p.status || "").toLowerCase().includes(pq) ||
    (p.tanggal_mulai || "").includes(pq) ||
    (p.tanggal_selesai || "").includes(pq)
  ) : periodeList;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-900 leading-none tracking-tight">Arsip Periode</h1>
          <p className="text-gray-400 mt-3 text-[14px]">Riwayat dan arsip periode klaim mahasiswa.</p>
        </div>
        <div className="relative mt-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text" value={periodeSearch}
            onChange={e => setPeriodeSearch(e.target.value)}
            placeholder="Cari nama periode, pembuat..."
            className="pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[13px] text-gray-900 w-[300px] focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all placeholder:text-gray-300"
          />
          {periodeSearch && (
            <button onClick={() => setPeriodeSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-600 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <svg className="w-7 h-7 text-gray-200 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : filteredPeriode.length === 0 ? (
          <p className="text-center text-gray-400 text-[13px] py-12">
            {pq ? `Tidak ada periode yang cocok dengan "${periodeSearch}".` : "Belum ada periode."}
          </p>
        ) : (
          <table className="w-full text-[13px] text-left">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="px-6 py-4 text-[10px] font-black text-gray-300 uppercase tracking-widest">Nama Periode</th>
                <th className="px-4 py-4 text-[10px] font-black text-gray-300 uppercase tracking-widest">Rentang</th>
                <th className="px-4 py-4 text-[10px] font-black text-gray-300 uppercase tracking-widest">Klaim</th>
                <th className="px-4 py-4 text-[10px] font-black text-gray-300 uppercase tracking-widest">Reward</th>
                <th className="px-4 py-4 text-[10px] font-black text-gray-300 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-300 uppercase tracking-widest">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredPeriode.map(p => {
                const style = ARSIP_STATUS_STYLE[p.status] ?? { badge: "bg-gray-100 text-gray-500", label: p.status };
                return (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{p.nama}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">Dibuat oleh {p.dibuat_oleh || "—"}</p>
                    </td>
                    <td className="px-4 py-4 text-gray-500 text-[12px]">{p.tanggal_mulai} → {p.tanggal_selesai}</td>
                    <td className="px-4 py-4">
                      <p className="font-black text-gray-900">{p.jumlah_klaim ?? 0}</p>
                      <p className="text-[11px] text-gray-400">{p.klaim_disetujui ?? 0} disetujui</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-black text-green-700">{p.reward_selesai ?? 0} selesai</p>
                      {(p.reward_pending ?? 0) > 0 && (
                        <p className="text-[11px] text-orange-500">{p.reward_pending} pending</p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold ${style.badge}`}>
                        {style.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => openPeriode(p)}
                          className="px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors">
                          Detail
                        </button>
                        {closable(p) && (
                          <button onClick={() => handleTutup(p)} disabled={actionLoading}
                            className="px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors">
                            Tutup
                          </button>
                        )}
                        {archivable(p) && (
                          <button onClick={() => handleArsip(p)} disabled={actionLoading}
                            className="px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors">
                            Arsipkan
                          </button>
                        )}
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
