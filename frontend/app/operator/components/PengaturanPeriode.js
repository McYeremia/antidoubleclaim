"use client";

import { useEffect, useState } from "react";
import { API, formatTanggal, ConfirmModal } from "./shared";

const STATE_STYLE = {
  aktif:       { badge: "bg-green-100 text-green-700",   label: "Aktif" },
  tutup:       { badge: "bg-gray-100 text-gray-500",     label: "Tutup" },
  belum_mulai: { badge: "bg-blue-100 text-blue-600",     label: "Belum Dimulai" },
  kadaluarsa:  { badge: "bg-red-100 text-red-600",       label: "Kadaluarsa" },
  diarsipkan:  { badge: "bg-purple-100 text-purple-700", label: "Diarsipkan" },
};

export default function PengaturanPeriode({ operatorNama }) {
  const [periodeList,    setPeriodeList]    = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [showForm,       setShowForm]       = useState(false);
  const [editingPeriode, setEditingPeriode] = useState(null);
  const [saving,         setSaving]         = useState(false);
  const [form,         setForm]         = useState({ nama: "", tanggal_mulai: "", tanggal_selesai: "" });
  const [confirmModal, setConfirmModal] = useState(null); // { title, message, variant, requireExactText, confirmLabel, onConfirm }

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
        const res = await fetch(`${API}/periode/${editingPeriode.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) { alert("Gagal menyimpan perubahan."); return; }
      } else {
        const res = await fetch(`${API}/periode`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, dibuat_oleh: operatorNama }),
        });
        if (!res.ok) { alert("Gagal membuat periode."); return; }
      }
      closeForm();
      fetchPeriode();
    } catch { alert(editingPeriode ? "Gagal menyimpan perubahan." : "Gagal membuat periode."); }
    finally  { setSaving(false); }
  };

  const handleToggle = (p) => {
    const newStatus = p.status === "aktif" ? "tutup" : "aktif";
    const label     = newStatus === "aktif" ? "membuka" : "menutup";
    setConfirmModal({
      title:        `${newStatus === "aktif" ? "Aktifkan" : "Tutup"} Periode?`,
      message:      `Yakin ingin ${label} periode "${p.nama}"?`,
      variant:      newStatus === "aktif" ? "default" : "warning",
      confirmLabel: newStatus === "aktif" ? "YA, AKTIFKAN" : "YA, TUTUP",
      onConfirm:    async () => {
        setConfirmModal(null);
        const res = await fetch(`${API}/periode/${p.id}?status=${newStatus}`, { method: "PUT" });
        if (!res.ok) { alert("Gagal mengubah status periode."); return; }
        fetchPeriode();
      },
    });
  };

  const handleHapusPeriode = (p) => {
    setConfirmModal({
      title:        "Hapus Periode?",
      message:      `Periode "${p.nama}" akan dihapus. Data reward yang sudah tercatat tidak akan terhapus.`,
      variant:      "danger",
      confirmLabel: "YA, HAPUS",
      onConfirm:    async () => {
        setConfirmModal(null);
        const opId = sessionStorage.getItem("operator_id");
        const res  = await fetch(`${API}/periode/${p.id}`, {
          method: "DELETE",
          headers: opId ? { "x-operator-id": opId } : {},
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          alert(err.detail || "Gagal menghapus periode.");
          return;
        }
        fetchPeriode();
      },
    });
  };

  const handleResetData = () => {
    setConfirmModal({
      title:           "Reset Semua Data?",
      message:         "Semua data klaim, pengajuan, reward, profil mahasiswa, dan periode akan dihapus permanen. Akun operator tetap utuh.",
      variant:         "danger",
      requireExactText: "RESET",
      confirmLabel:    "RESET SEMUA DATA",
      onConfirm:       async () => {
        setConfirmModal(null);
        const opId = sessionStorage.getItem("operator_id");
        const res  = await fetch(`${API}/admin/reset-data`, {
          method: "POST",
          headers: opId ? { "x-operator-id": opId } : {},
        });
        if (res.ok) {
          alert("Semua data berhasil dihapus.");
          fetchPeriode();
        } else {
          alert("Gagal melakukan reset.");
        }
      },
    });
  };

  const today = new Date().toISOString().slice(0, 10);

  const getPeriodeState = (p) => {
    if (p.status === "diarsipkan") return "diarsipkan";
    if (p.status !== "aktif") return "tutup";
    if (today < p.tanggal_mulai) return "belum_mulai";
    if (today > p.tanggal_selesai) return "kadaluarsa";
    return "aktif";
  };

  return (
    <div className="max-w-4xl">
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

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-gray-400">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
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
                      {formatTanggal(p.tanggal_mulai)} <span className="text-gray-300 mx-1">→</span> {formatTanggal(p.tanggal_selesai)}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold ${style.badge}`}>
                        {style.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {p.status === "diarsipkan" ? (
                          <span className="text-[11px] font-black text-purple-400 italic tracking-widest uppercase px-1">
                            Diarsipkan
                          </span>
                        ) : (
                          <>
                            <button onClick={() => openEdit(p)}
                              className="px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors">
                              Edit
                            </button>
                            <button onClick={() => handleToggle(p)}
                              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${
                                p.status === "aktif"
                                  ? "bg-red-50 text-red-600 hover:bg-red-100"
                                  : "bg-green-50 text-green-700 hover:bg-green-100"
                              }`}>
                              {p.status === "aktif" ? "Tutup" : "Aktifkan"}
                            </button>
                            <button
                              onClick={() => handleHapusPeriode(p)}
                              disabled={p.status === "aktif"}
                              className="px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-red-50 text-red-500 hover:bg-red-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                              Hapus
                            </button>
                          </>
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

      {/* Zona Bahaya */}
      <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-6 mt-6">
        <h2 className="text-[13px] font-bold text-red-500 uppercase tracking-widest mb-1">Zona Bahaya</h2>
        <p className="text-[12px] text-gray-400 mb-5">Tindakan di bawah bersifat permanen dan tidak dapat dibatalkan.</p>
        <div className="flex items-center justify-between p-4 rounded-xl border border-red-100 bg-red-50/50">
          <div>
            <p className="text-[13px] font-semibold text-gray-800">Reset Semua Data</p>
            <p className="text-[12px] text-gray-400 mt-0.5">
              Hapus semua klaim, pengajuan, reward, profil mahasiswa, dan periode. Akun operator tetap utuh.
            </p>
          </div>
          <button
            onClick={handleResetData}
            className="flex-shrink-0 ml-6 px-4 py-2 bg-red-600 text-white text-[12px] font-bold rounded-xl hover:bg-red-700 transition-colors"
          >
            Reset Data
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!confirmModal}
        title={confirmModal?.title ?? ""}
        message={confirmModal?.message ?? ""}
        variant={confirmModal?.variant ?? "danger"}
        requireExactText={confirmModal?.requireExactText ?? null}
        confirmLabel={confirmModal?.confirmLabel ?? "Konfirmasi"}
        onConfirm={() => confirmModal?.onConfirm?.()}
        onCancel={() => setConfirmModal(null)}
      />
    </div>
  );
}
