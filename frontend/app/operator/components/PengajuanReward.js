"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { API, apiFetch, KATEGORI_LABEL, ConfirmModal, AlertModal, formatDatetime } from "./shared";
import RewardSection from "./RewardSection";
import RewardDetailModal from "./RewardDetailModal";

export default function PengajuanReward() {
  const [rewards,           setRewards]           = useState([]);
  const [loading,           setLoading]           = useState(true);
  const [selectedReward,    setSelectedReward]    = useState(null);
  const [bermasalahTarget,  setBermasalahTarget]  = useState(null);
  const [bermasalahCatatan, setBermasalahCatatan] = useState("");
  const [bermasalahLoading, setBermasalahLoading] = useState(false);
  const [confirmKirim,      setConfirmKirim]      = useState(null); // reward object
  const [confirmKirimSemua, setConfirmKirimSemua] = useState(false);
  const [alertModal,        setAlertModal]        = useState(null); // { title, message }

  const fetchRewards = async () => {
    setLoading(true);
    try {
      const res  = await apiFetch(`${API}/reward-konfirmasi`);
      const data = await res.json();
      setRewards(data);
    } catch {
      setRewards([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRewards(); }, []);

  // Deklarasikan filter lebih awal agar handler di bawah bisa menggunakannya
  const menunggu = rewards.filter(r => r.reward_status === "menunggu");
  const diproses = rewards.filter(r => r.reward_status === "diproses");
  const selesai  = rewards.filter(r => r.reward_status === "selesai");

  const opHeaders = () => {
    const opId = localStorage.getItem("operator_id");
    return {
      "Content-Type": "application/json",
      ...(opId ? { "x-operator-id": opId } : {}),
    };
  };

  const doKirimReward = async (id) => {
    const res = await apiFetch(`${API}/reward-konfirmasi/${id}/status`, {
      method: "PATCH",
      headers: opHeaders(),
      body: JSON.stringify({ status: "selesai" }),
    });
    if (!res.ok) { setAlertModal({ title: "Gagal", message: "Gagal memperbarui status reward. Coba lagi." }); return; }
    fetchRewards();
  };

  const doKirimSemuaReward = async () => {
    try {
      await Promise.all(diproses.map(r =>
        apiFetch(`${API}/reward-konfirmasi/${r.id}/status`, {
          method: "PATCH",
          headers: opHeaders(),
          body: JSON.stringify({ status: "selesai" }),
        })
      ));
    } catch {
      setAlertModal({ title: "Gagal", message: "Beberapa reward gagal diperbarui." });
    }
    fetchRewards();
  };

  const handleKonfirmasiBermasalah = async () => {
    if (!bermasalahCatatan.trim()) return;
    setBermasalahLoading(true);
    const res = await apiFetch(`${API}/reward-konfirmasi/${bermasalahTarget.id}/status`, {
      method: "PATCH",
      headers: opHeaders(),
      body: JSON.stringify({ status: "dikembalikan", catatan: bermasalahCatatan }),
    });
    setBermasalahLoading(false);
    if (!res.ok) { setAlertModal({ title: "Gagal", message: "Gagal mengirim notifikasi. Coba lagi." }); return; }
    setBermasalahTarget(null);
    setBermasalahCatatan("");
    fetchRewards();
  };

  const exportToPDF = async (data, sectionTitle, filename) => {
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
    const fmtRupiah = (val) =>
      val ? `Rp ${Number(val).toLocaleString("id-ID")}` : "—";

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
      doc.text("LAPORAN DATA REWARD PENGHARGAAN", PW - M, 8.5, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(180, 220, 200);
      doc.text(sectionTitle, PW - M, 14, { align: "right" });
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
      doc.text(`Kemahasiswaan UKDW  ·  Laporan Data Reward Penghargaan  ·  ${sectionTitle}`, M, PH - 4.5);
      doc.text(`Halaman ${pageNum} dari ${totalPages}`, PW - M, PH - 4.5, { align: "right" });
    };

    drawHeader();

    // ── Summary boxes ─────────────────────────────────────────────────────────
    const totalDana = data.reduce((s, r) => s + (Number(r.estimasi_reward) || 0), 0);
    const summaryItems = [
      { label: "Total Data",    value: `${data.length} mahasiswa`,    color: [55, 65, 81]  },
      { label: "Total Dana",    value: fmtRupiah(totalDana),          color: [4, 97, 55]   },
    ];

    const BOX_Y = 25;
    const BOX_H = 14;
    const BOX_W = (PW - M * 2 - 3) / 2;
    summaryItems.forEach((item, i) => {
      const x = M + i * (BOX_W + 3);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, BOX_Y, BOX_W, BOX_H, 2, 2, "FD");

      doc.setFillColor(...item.color);
      doc.roundedRect(x, BOX_Y, 2.5, BOX_H, 1, 1, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...item.color);
      doc.text(String(item.value), x + BOX_W / 2 + 1.25, BOX_Y + 8, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(107, 114, 128);
      doc.text(item.label, x + BOX_W / 2 + 1.25, BOX_Y + 12.5, { align: "center" });
    });

    // ── Tabel ─────────────────────────────────────────────────────────────────
    const HEAD_COLS = [
      "No.", "Nama Ketua", "NIM", "No. WA",
      "Nama Lomba", "Kategori", "Periode",
      "Nama Pemilik Rekening", "Bank", "Nomor Rekening",
      "Dana (Rp)", "Tgl. Pengajuan",
    ];
    const COL_W = [7, 28, 18, 20, 40, 24, 15, 28, 14, 22, 22, 25];

    const body = data.map((r, i) => [
      i + 1,
      r.nama_ketua            ?? "",
      r.nim                   ?? "",
      r.nomor_wa              ?? "",
      r.nama_lomba            ?? "",
      KATEGORI_LABEL[r.kategori_lomba] ?? r.kategori_lomba ?? "",
      r.periode               ?? "",
      r.nama_pemilik_rekening ?? "",
      (r.bank ?? "").toUpperCase(),
      r.nomor_rekening        ?? "",
      r.estimasi_reward ? Number(r.estimasi_reward).toLocaleString("id-ID") : "—",
      formatDatetime(r.created_at),
    ]);

    autoTable(doc, {
      head: [HEAD_COLS],
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
        COL_W.map((w, i) => [i, { cellWidth: w, halign: i === 0 || i === 10 ? "center" : "left" }])
      ),
      didDrawPage: ({ pageNumber }) => {
        if (pageNumber > 1) drawHeader();
      },
    });

    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      drawFooter(p, totalPages);
    }

    doc.save(`${filename}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const exportToExcel = (data, filename) => {
    const rows = data.map((r, i) => ({
      "No.":                    i + 1,
      "Nama Ketua":             r.nama_ketua ?? "",
      "NIM":                    r.nim ?? "",
      "Nomor WA":               r.nomor_wa ?? "",
      "Nama Lomba":             r.nama_lomba ?? "",
      "Kategori":               KATEGORI_LABEL[r.kategori_lomba] ?? r.kategori_lomba ?? "",
      "Periode":                r.periode ?? "",
      "Tahun Klaim":            r.tahun_klaim ?? "",
      "Tahun Kegiatan":         r.tahun_kegiatan ?? "",
      "No. Urut Lampiran":      r.nomor_urut_lampiran ?? "",
      "Nama Pemilik Rekening":  r.nama_pemilik_rekening ?? "",
      "Bank":                   r.bank ?? "",
      "Nomor Rekening":         r.nomor_rekening ?? "",
      "Dana Penghargaan (Rp)":  r.estimasi_reward ?? "",
      "Tanggal Pengajuan":      formatDatetime(r.created_at),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reward Disetujui");
    ws["!cols"] = [
      { wch: 5 }, { wch: 25 }, { wch: 15 }, { wch: 16 },
      { wch: 35 }, { wch: 22 }, { wch: 12 }, { wch: 12 },
      { wch: 15 }, { wch: 18 }, { wch: 25 }, { wch: 12 },
      { wch: 20 }, { wch: 22 }, { wch: 18 },
    ];
    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `${filename}_${date}.xlsx`);
  };

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

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <p className="text-[10px] font-black text-orange-400 uppercase tracking-[0.2em]">Menunggu</p>
          <p className="text-5xl font-black text-gray-900 mt-3 leading-none">{menunggu.length}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <p className="text-[10px] font-black text-[#046137] uppercase tracking-[0.2em]">Diproses</p>
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
          <RewardSection
            title="Antrean Verifikasi"
            color="bg-orange-50/30 text-orange-600 border-orange-50"
            items={menunggu}
            onSelectReward={setSelectedReward}
          />
          <RewardSection
            title="Approved"
            color="bg-[#f0f7f3]/30 text-[#046137] border-[#f0f7f3]"
            items={diproses}
            onBulkKirim={() => setConfirmKirimSemua(true)}
            onExport={() => exportToExcel(diproses, "reward_approved")}
            onExportPDF={() => exportToPDF(diproses, "Approved", "reward_approved")}
            onSelectReward={setSelectedReward}
            rowActions={(r) => (
              <>
                <button
                  onClick={() => setConfirmKirim(r)}
                  className="px-3 py-1.5 rounded-xl text-[11px] font-black bg-green-600 text-white hover:bg-green-700 transition-colors"
                >
                  REWARD DIKIRIM
                </button>
                <button
                  onClick={() => { setBermasalahTarget(r); setBermasalahCatatan(""); }}
                  className="px-3 py-1.5 rounded-xl text-[11px] font-black bg-red-50 text-red-600 hover:bg-red-100 transition-colors border border-red-100"
                >
                  REKENING BERMASALAH
                </button>
              </>
            )}
          />
          <RewardSection
            title="Arsip Selesai (Dana Terkirim)"
            color="bg-green-50/30 text-green-600 border-green-50"
            items={selesai}
            onExport={() => exportToExcel(selesai, "reward_terkirim")}
            onExportPDF={() => exportToPDF(selesai, "Arsip Selesai (Dana Terkirim)", "reward_terkirim")}
            onSelectReward={setSelectedReward}
          />
        </div>
      )}

      {selectedReward && (
        <RewardDetailModal
          reward={selectedReward}
          onClose={() => setSelectedReward(null)}
          onStatusUpdate={fetchRewards}
        />
      )}

      <ConfirmModal
        isOpen={!!confirmKirim}
        title="Konfirmasi Pengiriman Dana"
        message={confirmKirim ? `Konfirmasi bahwa dana penghargaan sudah dikirim ke rekening ${confirmKirim.nama_ketua}?` : ""}
        variant="success"
        confirmLabel="YA, SUDAH DIKIRIM"
        onConfirm={() => { const id = confirmKirim.id; setConfirmKirim(null); doKirimReward(id); }}
        onCancel={() => setConfirmKirim(null)}
      />

      <ConfirmModal
        isOpen={confirmKirimSemua}
        title="Kirim Semua Dana?"
        message={`Konfirmasi bahwa dana penghargaan sudah dikirim ke semua ${diproses.length} mahasiswa di bagian Approved.`}
        variant="success"
        confirmLabel="YA, SEMUA SUDAH DIKIRIM"
        onConfirm={() => { setConfirmKirimSemua(false); doKirimSemuaReward(); }}
        onCancel={() => setConfirmKirimSemua(false)}
      />

      <AlertModal
        isOpen={!!alertModal}
        title={alertModal?.title ?? ""}
        message={alertModal?.message ?? ""}
        variant="danger"
        onClose={() => setAlertModal(null)}
      />

      {bermasalahTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setBermasalahTarget(null)}
        >
          <div className="bg-white rounded-[28px] shadow-2xl w-full max-w-md p-8" onClick={e => e.stopPropagation()}>
            <h3 className="text-[16px] font-black text-gray-900 mb-1">Rekening Bermasalah</h3>
            <p className="text-[13px] text-gray-400 mb-1">
              Mahasiswa: <span className="font-bold text-gray-700">{bermasalahTarget.nama_ketua}</span>
            </p>
            <p className="text-[13px] text-gray-400 mb-5">
              Rekening: <span className="font-bold text-gray-700 uppercase">{bermasalahTarget.bank}</span> · {bermasalahTarget.nomor_rekening}
            </p>
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">
              Keterangan masalah <span className="text-red-400">*</span>
            </p>
            <textarea
              rows={4}
              value={bermasalahCatatan}
              onChange={e => setBermasalahCatatan(e.target.value)}
              placeholder="Contoh: Nomor rekening tidak ditemukan, nama pemilik tidak sesuai..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-400 transition-all mb-6"
            />
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setBermasalahTarget(null)}
                className="px-5 py-2.5 text-[12px] font-bold text-gray-500 hover:text-gray-900 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleKonfirmasiBermasalah}
                disabled={bermasalahLoading || !bermasalahCatatan.trim()}
                className="px-6 py-2.5 rounded-xl text-[12px] font-black bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-40"
              >
                {bermasalahLoading ? "MENGIRIM..." : "KIRIM NOTIFIKASI"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
