"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { API, apiFetch, ARSIP_STATUS_STYLE, STATUS_BADGE, KATEGORI_LABEL, formatTanggal, ConfirmModal, formatDatetime } from "./shared";
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
  const [confirmModal,  setConfirmModal]  = useState(null);

  const fetchPeriode = async () => {
    setLoading(true);
    try {
      const res  = await apiFetch(`${API}/periode`);
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
        apiFetch(`${API}/periode/${p.id}/claims`),
        apiFetch(`${API}/periode/${p.id}/rewards`),
      ]);
      setClaims(await rClaims.json());
      setRewards(await rRewards.json());
    } catch { setClaims([]); setRewards([]); }
    finally  { setDataLoading(false); }
  };

  const handleTutup = (p) => {
    setConfirmModal({
      title:        "Tutup Periode?",
      message:      `Periode "${p.nama}" akan ditutup. Mahasiswa tidak dapat mengajukan klaim baru, namun proses reward dapat dilanjutkan.`,
      variant:      "warning",
      confirmLabel: "YA, TUTUP PERIODE",
      onConfirm:    async () => {
        setConfirmModal(null);
        setActionLoading(true);
        const opId = localStorage.getItem("operator_id");
        const res = await apiFetch(`${API}/periode/${p.id}?status=ditutup`, {
          method: "PUT",
          headers: opId ? { "x-operator-id": opId } : {},
        });
        setActionLoading(false);
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          alert(d.detail || "Gagal menutup periode.");
          return;
        }
        fetchPeriode();
        if (selected?.id === p.id) setSelected(prev => ({ ...prev, status: "ditutup" }));
      },
    });
  };

  const handleArsip = (p) => {
    setConfirmModal({
      title:        "Arsipkan Periode?",
      message:      `Periode "${p.nama}" akan diarsipkan. Pastikan semua proses reward sudah selesai sebelum mengarsipkan.`,
      variant:      "warning",
      confirmLabel: "YA, ARSIPKAN",
      onConfirm:    async () => {
        setConfirmModal(null);
        const opId = localStorage.getItem("operator_id");
        setActionLoading(true);
        const res = await apiFetch(`${API}/periode/${p.id}/arsip`, {
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
      },
    });
  };

  const closable   = (p) => p.status === "aktif";
  const archivable = (p) => p.status === "tutup" || p.status === "ditutup";

  const exportPDF = async (data, periodeName, type) => {
    if (!data || data.length === 0) { alert("Tidak ada data untuk diekspor."); return; }

    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;

    const doc    = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const PW     = 297;
    const PH     = 210;
    const M      = 12;
    const GREEN  = [4, 97, 55];
    const _BULAN = ["Januari","Februari","Maret","April","Mei","Juni",
                    "Juli","Agustus","September","Oktober","November","Desember"];

    const fmtNow = () => {
      const d = new Date();
      return `${d.getDate()} ${_BULAN[d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
    };

    const typeLabel = type === "claims" ? "Data Klaim" : "Data Reward";

    const drawHeader = () => {
      doc.setFillColor(...GREEN);
      doc.rect(0, 0, PW, 22, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(255, 255, 255);
      doc.text("UKDW", M, 9);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(180, 220, 200);
      doc.text("Universitas Kristen Duta Wacana", M, 14);
      doc.text("Kemahasiswaan — Divisi Bakat Minat", M, 18.5);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text(`LAPORAN ARSIP PERIODE — ${typeLabel.toUpperCase()}`, PW - M, 8.5, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(180, 220, 200);
      doc.text(periodeName, PW - M, 14, { align: "right" });
      doc.setFontSize(7);
      doc.text(`Digenerate pada: ${fmtNow()}`, PW - M, 19.5, { align: "right" });
    };

    const drawFooter = (pageNum, totalPages) => {
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(M, PH - 8, PW - M, PH - 8);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(156, 163, 175);
      doc.text(`Kemahasiswaan UKDW  ·  Arsip Periode: ${periodeName}  ·  ${typeLabel}`, M, PH - 4.5);
      doc.text(`Halaman ${pageNum} dari ${totalPages}`, PW - M, PH - 4.5, { align: "right" });
    };

    drawHeader();

    // ── Summary boxes ─────────────────────────────────────────────────────────
    const BOX_Y = 25;
    const BOX_H = 14;

    let summaryItems;
    if (type === "claims") {
      const total      = data.length;
      const disetujui  = data.filter(c => c.status === "sudah dicek").length;
      const ditolak    = data.filter(c => c.status === "ditolak").length;
      const lainnya    = total - disetujui - ditolak;
      summaryItems = [
        { label: "Total Klaim",  value: total,      color: [55, 65, 81]  },
        { label: "Disetujui",    value: disetujui,  color: [4, 97, 55]   },
        { label: "Ditolak",      value: ditolak,    color: [185, 28, 28] },
        { label: "Lainnya",      value: lainnya,    color: [107, 114, 128] },
      ];
    } else {
      const total   = data.length;
      const selesai = data.filter(r => r.reward_status === "selesai").length;
      const totalDana = data.reduce((s, r) => s + (Number(r.estimasi_reward) || 0), 0);
      summaryItems = [
        { label: "Total Reward",  value: total,    color: [55, 65, 81]  },
        { label: "Selesai",       value: selesai,  color: [4, 97, 55]   },
        { label: "Total Dana",    value: `Rp ${totalDana.toLocaleString("id-ID")}`, color: [79, 70, 229] },
      ];
    }

    const BOX_W = (PW - M * 2 - (summaryItems.length - 1) * 3) / summaryItems.length;
    summaryItems.forEach((item, i) => {
      const x = M + i * (BOX_W + 3);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, BOX_Y, BOX_W, BOX_H, 2, 2, "FD");
      doc.setFillColor(...item.color);
      doc.roundedRect(x, BOX_Y, 2.5, BOX_H, 1, 1, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(type === "rewards" && i === 2 ? 9 : 13);
      doc.setTextColor(...item.color);
      doc.text(String(item.value), x + BOX_W / 2 + 1.25, BOX_Y + 8.5, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(107, 114, 128);
      doc.text(item.label, x + BOX_W / 2 + 1.25, BOX_Y + 12.5, { align: "center" });
    });

    // ── Tabel ─────────────────────────────────────────────────────────────────
    let headCols, colW, body;

    if (type === "claims") {
      headCols = ["No.", "ID", "Nama Lomba", "Mahasiswa", "Email", "Tingkat", "Peringkat", "Status", "Tgl. Kegiatan", "Kepesertaan"];
      colW     = [7, 10, 50, 28, 45, 18, 18, 22, 25, 20];
      body = data.map((c, i) => [
        i + 1, `#${c.id}`,
        c.nama_lomba     ?? "",
        c.nama_display   ?? "",
        c.mahasiswa_email ?? "",
        c.tingkat        ?? "",
        c.peringkat      ?? "",
        c.status         ?? "",
        formatTanggal(c.tanggal),
        c.jenis_kepesertaan ?? "",
      ]);
    } else {
      headCols = ["No.", "ID Klaim", "Nama Ketua", "NIM", "Nama Lomba", "Kategori", "Bank", "No. Rekening", "Dana (Rp)", "Status"];
      colW     = [7, 14, 30, 18, 50, 28, 16, 24, 26, 18];
      body = data.map((r, i) => [
        i + 1, `#${r.claim_id}`,
        r.nama_ketua    ?? "",
        r.nim           ?? "",
        r.nama_lomba    ?? "",
        KATEGORI_LABEL[r.kategori_lomba] ?? r.kategori_lomba ?? "",
        (r.bank ?? "").toUpperCase(),
        r.nomor_rekening ?? "",
        r.estimasi_reward ? Number(r.estimasi_reward).toLocaleString("id-ID") : "—",
        r.reward_status  ?? "",
      ]);
    }

    autoTable(doc, {
      head: [headCols],
      body,
      startY: BOX_Y + BOX_H + 4,
      margin: { left: M, right: M, bottom: 14 },
      styles: {
        fontSize: 7,
        cellPadding: { top: 2, bottom: 2, left: 2, right: 2 },
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
        textColor: [55, 65, 81],
        font: "helvetica",
        overflow: "ellipsize",
      },
      headStyles: {
        fillColor: GREEN,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7,
        halign: "center",
      },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: Object.fromEntries(
        colW.map((w, i) => [i, { cellWidth: w, halign: i === 0 || i === 8 ? "center" : "left" }])
      ),
      didParseCell: (info) => {
        if (info.section !== "body") return;
        const statusCol = type === "claims" ? 7 : 9;
        if (info.column.index === statusCol) {
          const s = info.cell.raw;
          if (s === "sudah dicek" || s === "selesai")
            { info.cell.styles.textColor = [4, 97, 55];   info.cell.styles.fontStyle = "bold"; }
          else if (s === "ditolak")
            { info.cell.styles.textColor = [185, 28, 28]; info.cell.styles.fontStyle = "bold"; }
        }
      },
      didDrawPage: ({ pageNumber }) => { if (pageNumber > 1) drawHeader(); },
    });

    const totalPages = doc.getNumberOfPages();
    for (let pg = 1; pg <= totalPages; pg++) {
      doc.setPage(pg);
      drawFooter(pg, totalPages);
    }

    doc.save(`${type === "claims" ? "klaim" : "reward"}_${periodeName}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const exportClaims = (data, periodeName) => {
    const rows = data.map((c, i) => {
      const isKelompok = c.jenis_kepesertaan === "kelompok";
      const anggotaParts = [];
      if (isKelompok && c.nama_ketua) {
        const nimKetua = c.mahasiswa_email?.split("@")[0] ?? "";
        anggotaParts.push(`${c.nama_ketua} (${nimKetua}) - Ketua`);
      }
      if (isKelompok && c.anggota_list) {
        c.anggota_list.split(";;").forEach(entry => {
          const [nama, nim] = entry.split("|");
          anggotaParts.push(nim ? `${nama} (${nim})` : nama);
        });
      }
      return {
        "No.":              i + 1,
        "ID Klaim":         c.id,
        "Nama Lomba":       c.nama_lomba ?? "",
        "Mahasiswa":        c.nama_display ?? "",
        "Email":            c.mahasiswa_email ?? "",
        "Tingkat":          c.tingkat ?? "",
        "Peringkat":        c.peringkat ?? "",
        "Status":           c.status ?? "",
        "Tanggal Kegiatan": formatTanggal(c.tanggal),
        "Tanggal Mulai":    formatTanggal(c.tanggal_mulai),
        "Tanggal Selesai":  formatTanggal(c.tanggal_selesai),
        "Jenis Kepesertaan": c.jenis_kepesertaan ?? "",
        "Anggota Kelompok": anggotaParts.join(", "),
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 5 }, { wch: 10 }, { wch: 35 }, { wch: 25 }, { wch: 28 },
      { wch: 15 }, { wch: 15 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
      { wch: 14 }, { wch: 18 }, { wch: 40 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Klaim");
    XLSX.writeFile(wb, `klaim_${periodeName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportRewards = (data, periodeName) => {
    const rows = data.map((r, i) => ({
      "No.":                   i + 1,
      "ID Klaim":              r.claim_id,
      "Nama Ketua":            r.nama_ketua ?? "",
      "NIM":                   r.nim ?? "",
      "Nama Lomba":            r.nama_lomba ?? "",
      "Kategori":              KATEGORI_LABEL[r.kategori_lomba] ?? r.kategori_lomba ?? "",
      "Nama Pemilik Rekening": r.nama_pemilik_rekening ?? r.nama_rekening ?? "",
      "Bank":                  r.bank ?? "",
      "Nomor Rekening":        r.nomor_rekening ?? "",
      "Estimasi Dana (Rp)":    r.estimasi_reward ?? "",
      "Status Reward":         r.reward_status ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 5 }, { wch: 10 }, { wch: 25 }, { wch: 14 }, { wch: 35 }, { wch: 22 }, { wch: 25 }, { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reward");
    XLSX.writeFile(wb, `reward_${periodeName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

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
            <p className="text-gray-400 mt-2 text-[14px]">{formatTanggal(selected.tanggal_mulai)} → {formatTanggal(selected.tanggal_selesai)}</p>
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
            { label: "Klaim Ditolak",   value: selected.klaim_ditolak ?? 0,   color: "text-red-600" },
            { label: "Reward Selesai",  value: selected.reward_selesai ?? 0,  color: "text-[#046137]" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{s.label}</p>
              <p className={`text-4xl font-black mt-2 leading-none ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {selected.status !== "aktif" && (
          <div className="space-y-3">
            {(selected.klaim_pending ?? 0) > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-2xl px-6 py-4 flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-[13px] font-semibold text-red-900">
                  Masih ada <strong>{selected.klaim_pending} klaim</strong> yang belum diverifikasi (belum dicek / perlu ditinjau). Selesaikan semua klaim sebelum mengarsipkan.
                </p>
              </div>
            )}
            {(selected.reward_pending ?? 0) > 0 && (
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
          </div>
        )}

        {(() => {
          const q = searchQuery.toLowerCase().trim();
          const filteredClaims  = q ? claims.filter(c =>
            (c.nama_lomba || "").toLowerCase().includes(q) ||
            (c.nama_display || "").toLowerCase().includes(q) ||
            (c.mahasiswa_email || "").toLowerCase().includes(q) ||
            (c.tingkat || "").toLowerCase().includes(q) ||
            (c.peringkat || "").toLowerCase().includes(q) ||
            (c.status || "").toLowerCase().includes(q) ||
            String(c.id).includes(q)
          ) : claims;
          const filteredRewards = q ? rewards.filter(r =>
            (r.nama_lomba || "").toLowerCase().includes(q) ||
            (r.nama_rekening || "").toLowerCase().includes(q) ||
            (r.nama_ketua || "").toLowerCase().includes(q) ||
            (r.bank || "").toLowerCase().includes(q) ||
            (r.nomor_rekening || "").toLowerCase().includes(q) ||
            (r.reward_status || "").toLowerCase().includes(q) ||
            String(r.claim_id).includes(q) ||
            String(r.estimasi_reward || "").includes(q)
          ) : rewards;
          const currentData = activeTab === "claims" ? filteredClaims : filteredRewards;
          const periodeName  = selected.nama.replace(/\s+/g, "_").toLowerCase();
          return (
            <>
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
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => activeTab === "claims" ? exportClaims(filteredClaims, periodeName) : exportRewards(filteredRewards, periodeName)}
                    disabled={currentData.length === 0}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-[12px] font-black rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    </svg>
                    EXCEL
                  </button>
                  <button
                    onClick={() => activeTab === "claims" ? exportPDF(filteredClaims, periodeName, "claims") : exportPDF(filteredRewards, periodeName, "rewards")}
                    disabled={currentData.length === 0}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#046137] text-white text-[12px] font-black rounded-xl hover:bg-[#035230] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    PDF
                  </button>
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text" value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder={activeTab === "claims" ? "Cari nama lomba, mahasiswa, email..." : "Cari nama lomba, rekening, bank..."}
                      className="pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[13px] text-gray-900 w-[280px] focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all placeholder:text-gray-300"
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
                  ) : filteredClaims.length === 0 ? (
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
                        {filteredClaims.map(c => (
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
                            <td className="px-6 py-4 text-[12px] text-gray-400">{formatTanggal(c.tanggal)}</td>
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
                  )}
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
                  ) : filteredRewards.length === 0 ? (
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
                        {filteredRewards.map(r => {
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
                                  : r.reward_status === "diproses" ? "bg-[#d4ebe0] text-[#046137]"
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
                  )}
                </div>
              )}
            </>
          );
        })()}

      <ConfirmModal
        isOpen={!!confirmModal}
        title={confirmModal?.title ?? ""}
        message={confirmModal?.message ?? ""}
        variant={confirmModal?.variant ?? "warning"}
        confirmLabel={confirmModal?.confirmLabel ?? "Konfirmasi"}
        onConfirm={() => confirmModal?.onConfirm?.()}
        onCancel={() => setConfirmModal(null)}
      />
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
                    <td className="px-4 py-4 text-gray-500 text-[12px]">{formatTanggal(p.tanggal_mulai)} → {formatTanggal(p.tanggal_selesai)}</td>
                    <td className="px-4 py-4">
                      <p className="font-black text-gray-900">{p.jumlah_klaim ?? 0}</p>
                      <p className="text-[11px] text-gray-400">{p.klaim_disetujui ?? 0} disetujui</p>
                      {(p.klaim_ditolak ?? 0) > 0 && (
                        <p className="text-[11px] text-red-500">{p.klaim_ditolak} ditolak</p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-black text-green-700">{p.reward_selesai ?? 0} selesai</p>
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

      <ConfirmModal
        isOpen={!!confirmModal}
        title={confirmModal?.title ?? ""}
        message={confirmModal?.message ?? ""}
        variant={confirmModal?.variant ?? "warning"}
        confirmLabel={confirmModal?.confirmLabel ?? "Konfirmasi"}
        onConfirm={() => confirmModal?.onConfirm?.()}
        onCancel={() => setConfirmModal(null)}
      />
    </div>
  );
}
