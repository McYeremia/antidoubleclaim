// Halaman kelola operator (superadmin only): tambah, hapus, reset password, dan cari akun operator.
"use client";

import { useEffect, useState } from "react";
import { API, apiFetch } from "./shared";

// Warna badge per role untuk ditampilkan di tabel daftar operator.
const ROLE_BADGE = {
  superadmin: "bg-purple-100 text-purple-700",
  operator:   "bg-[#d4ebe0] text-[#046137]",
};

// Menampilkan daftar operator aktif, form tambah akun baru, dan modal konfirmasi hapus/reset password.
export default function KelolaOperator({ operatorId }) {

  // ─── STATE ────────────────────────────────────────────────────────────────
  const [operators, setOperators] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [formError, setFormError] = useState("");
  const [form,        setForm]        = useState({ username: "", password: "", nama: "", email: "", role: "operator" });
  const [search,       setSearch]       = useState("");
  // Modal hapus: { id, nama, isSelf } — isSelf mencegah superadmin menghapus akunnya sendiri.
  const [deleteModal,  setDeleteModal]  = useState(null);
  const [deletePw,     setDeletePw]     = useState("");
  const [deleteError,  setDeleteError]  = useState("");
  const [deleteSaving, setDeleteSaving] = useState(false);
  // Modal reset password: { id, nama }
  const [passwordModal, setPasswordModal] = useState(null);
  const [pwForm,        setPwForm]        = useState({ new_password: "", confirm: "" });
  const [pwError,       setPwError]       = useState("");
  const [pwSaving,      setPwSaving]      = useState(false);
  const [showFormPw,    setShowFormPw]    = useState(false);
  const [showDeletePw,  setShowDeletePw]  = useState(false);
  const [showResetPw,   setShowResetPw]   = useState({ new: false, confirm: false });

  // Header standar untuk request API yang membutuhkan autentikasi operator.
  const headers = { "Content-Type": "application/json", "x-operator-id": String(operatorId) };

  // ─── DATA FETCHING ────────────────────────────────────────────────────────
  // Mengambil daftar semua operator dari API.
  const fetchOperators = async () => {
    setLoading(true);
    try {
      const res  = await apiFetch(`${API}/operators`, { headers });
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
      const res = await apiFetch(`${API}/operators`, {
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

  const handleDelete = (id, nama) => {
    setDeletePw("");
    setDeleteError("");
    setShowDeletePw(false);
    setDeleteModal({ id, nama, isSelf: String(id) === String(operatorId) });
  };

  const handleResetPassword = (op) => {
    setPasswordModal({ id: op.id, nama: op.nama });
    setPwForm({ new_password: "", confirm: "" });
    setPwError("");
    setShowResetPw({ new: false, confirm: false });
  };

  const handleResetPasswordConfirm = async (e) => {
    e.preventDefault();
    if (pwForm.new_password.length < 8) { setPwError("Password minimal 8 karakter."); return; }
    if (pwForm.new_password !== pwForm.confirm) { setPwError("Konfirmasi password tidak cocok."); return; }
    setPwSaving(true);
    try {
      const res = await apiFetch(`${API}/operators/${passwordModal.id}/password`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ new_password: pwForm.new_password }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setPwError(d.detail || "Gagal mengganti password.");
        return;
      }
      setPasswordModal(null);
    } catch {
      setPwError("Tidak dapat terhubung ke server.");
    } finally {
      setPwSaving(false);
    }
  };

  const handleDeleteConfirm = async (e) => {
    e.preventDefault();
    if (!deletePw) { setDeleteError("Masukkan password terlebih dahulu."); return; }
    setDeleteSaving(true);
    setDeleteError("");
    try {
      const res = await apiFetch(`${API}/operators/${deleteModal.id}`, {
        method: "DELETE",
        headers,
        body: JSON.stringify({ current_password: deletePw }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setDeleteError(d.detail || "Gagal menghapus akun.");
        return;
      }
      if (deleteModal.isSelf) {
        window.location.href = "/operator";
        return;
      }
      setDeleteModal(null);
      fetchOperators();
    } catch {
      setDeleteError("Tidak dapat terhubung ke server.");
    } finally {
      setDeleteSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-black text-gray-900 leading-none tracking-tight">Kelola Operator</h1>
          <p className="text-gray-400 mt-3 text-[14px]">Manajemen hak akses pengelola sistem.</p>
        </div>
        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setFormError(""); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#046137] text-white text-[13px] font-bold rounded-xl hover:bg-[#035230] transition-all hover:scale-105 mt-1"
          >
            + Tambah Operator
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-[32px] shadow-2xl shadow-gray-200/50 border border-gray-100 p-10 animate-in slide-in-from-top duration-500">
          <h3 className="text-[16px] font-black text-gray-900 mb-8 uppercase tracking-tight">Akun Pengelola Baru</h3>
          <form onSubmit={handleAdd} className="grid grid-cols-2 gap-6">
            {[
              { label: "Nama Lengkap", name: "nama",     type: "text",  required: true },
              { label: "Email",        name: "email",    type: "email", required: true },
              { label: "Username",     name: "username", type: "text",  required: true },
              { label: "Password",     name: "password", type: "password", required: true },
            ].map(f => (
              <div key={f.name}>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">{f.label}</label>
                {f.name === "password" ? (
                  <div className="relative">
                    <input
                      type={showFormPw ? "text" : "password"}
                      required={f.required}
                      value={form[f.name]}
                      onChange={e => setForm(v => ({ ...v, [f.name]: e.target.value }))}
                      className="w-full px-4 py-3 pr-10 bg-gray-50 border border-gray-200 rounded-2xl text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowFormPw(v => !v)}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-300 hover:text-gray-700 transition-colors"
                    >
                      {showFormPw ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                ) : (
                  <input
                    type={f.type}
                    required={f.required}
                    value={form[f.name]}
                    onChange={e => setForm(v => ({ ...v, [f.name]: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all"
                  />
                )}
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
              <div className="flex items-center gap-3 ml-auto">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setFormError(""); setForm({ username: "", password: "", nama: "", email: "", role: "operator" }); setShowFormPw(false); }}
                  className="px-7 py-3.5 rounded-2xl text-[14px] font-black bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-10 py-3.5 rounded-2xl text-[14px] font-black bg-[#046137] text-white hover:bg-[#035230] transition-all shadow-xl shadow-gray-200"
                >
                  {saving ? "MENYIMPAN..." : "SIMPAN OPERATOR"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {!loading && operators.length > 0 && (
        <div className="relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama, username, atau email..."
            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-[13px] text-gray-700 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 shadow-sm transition-all"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center py-24">
          <svg className="w-8 h-8 text-gray-200 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : (
        <>
          {[
            { role: "superadmin", label: "Super Admin", headerColor: "bg-purple-50 text-purple-700 border-purple-50" },
            { role: "operator",   label: "Operator",    headerColor: "bg-[#f0f9f4] text-[#046137] border-[#e8f5ee]" },
          ].map(({ role, label, headerColor }) => {
            const q = search.toLowerCase();
            const items = operators.filter(op =>
              op.role === role &&
              (!q || op.nama.toLowerCase().includes(q) || op.username.toLowerCase().includes(q) || (op.email ?? "").toLowerCase().includes(q))
            );
            return (
              <div key={role} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className={`px-6 py-4 border-b flex items-center justify-between ${headerColor}`}>
                  <h2 className="font-bold text-[11px] uppercase tracking-widest">{label}</h2>
                  <span className="text-[11px] font-black bg-white/60 px-2 py-0.5 rounded-full">{items.length}</span>
                </div>
                {items.length === 0 ? (
                  <p className="text-center text-gray-400 text-[13px] py-10 font-medium">Belum ada akun {label.toLowerCase()}.</p>
                ) : (
                  <table className="w-full table-fixed text-sm text-left">
                    <colgroup>
                      <col className="w-[220px]" />
                      <col className="w-[150px]" />
                      <col />
                      <col className="w-[260px]" />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-gray-50">
                        <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Nama Lengkap</th>
                        <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Username</th>
                        <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Email</th>
                        <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest text-right">Tindakan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {items.map(op => (
                        <tr key={op.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900 text-[13px]">{op.nama}</span>
                              {String(op.id) === String(operatorId) && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-gray-100 text-gray-400">Anda</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono text-[12px] font-bold text-gray-400 uppercase tabular-nums">{op.username}</td>
                          <td className="px-6 py-4 text-[13px] text-gray-500 font-medium">{op.email}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {(String(op.id) === String(operatorId) || op.role !== "superadmin") && (
                                <button
                                  onClick={() => handleResetPassword(op)}
                                  className="px-3 py-1.5 rounded-xl text-[11px] font-black bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors border border-blue-100"
                                >
                                  GANTI PASSWORD
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(op.id, op.nama)}
                                className="px-3 py-1.5 rounded-xl text-[11px] font-black bg-red-50 text-red-600 hover:bg-red-100 transition-colors border border-red-100"
                              >
                                HAPUS
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </>
      )}

      {/* Modal Hapus Akun — selalu butuh verifikasi password */}
      {deleteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4"
             onClick={() => setDeleteModal(null)}>
          <div className="bg-white rounded-[28px] shadow-2xl w-full max-w-md p-8"
               onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-5">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h3 className="text-[16px] font-black text-gray-900 mb-1">
              {deleteModal.isSelf ? "Hapus Akun Anda?" : `Hapus Akun "${deleteModal.nama}"?`}
            </h3>
            <p className="text-[13px] text-gray-400 mb-6 leading-relaxed">
              {deleteModal.isSelf
                ? "Akun Anda akan dihapus permanen dan Anda akan otomatis keluar dari sistem."
                : `Akun "${deleteModal.nama}" akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`
              }{" "}
              Masukkan password Anda saat ini untuk mengkonfirmasi.
            </p>
            <form onSubmit={handleDeleteConfirm} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  Password Anda Saat Ini <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showDeletePw ? "text" : "password"}
                    required
                    autoFocus
                    value={deletePw}
                    onChange={e => { setDeletePw(e.target.value); setDeleteError(""); }}
                    placeholder="Masukkan password Anda"
                    className="w-full px-4 py-3 pr-10 bg-gray-50 border border-gray-200 rounded-2xl text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-400 transition-all"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowDeletePw(v => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-300 hover:text-red-400 transition-colors"
                  >
                    {showDeletePw ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              {deleteError && (
                <p className="text-[12px] font-bold text-red-600 italic">! {deleteError}</p>
              )}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteModal(null)}
                  className="px-5 py-2.5 text-[12px] font-bold text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={deleteSaving}
                  className="px-6 py-2.5 rounded-xl text-[12px] font-black bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 transition-colors"
                >
                  {deleteSaving ? "MENGHAPUS..." : "YA, HAPUS"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Reset Password */}
      {passwordModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4"
             onClick={() => setPasswordModal(null)}>
          <div className="bg-white rounded-[28px] shadow-2xl w-full max-w-md p-8"
               onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-5">
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h3 className="text-[16px] font-black text-gray-900 mb-1">Reset Password</h3>
            <p className="text-[13px] text-gray-400 mb-6">
              Atur password baru untuk akun <span className="font-bold text-gray-700">{passwordModal.nama}</span>.
            </p>
            <form onSubmit={handleResetPasswordConfirm} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  Password Baru <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showResetPw.new ? "text" : "password"}
                    required
                    autoFocus
                    value={pwForm.new_password}
                    onChange={e => { setPwForm(v => ({ ...v, new_password: e.target.value })); setPwError(""); }}
                    placeholder="Minimal 8 karakter"
                    className="w-full px-4 py-3 pr-10 bg-gray-50 border border-gray-200 rounded-2xl text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowResetPw(v => ({ ...v, new: !v.new }))}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-300 hover:text-blue-400 transition-colors"
                  >
                    {showResetPw.new ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  Konfirmasi Password Baru <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showResetPw.confirm ? "text" : "password"}
                    required
                    value={pwForm.confirm}
                    onChange={e => { setPwForm(v => ({ ...v, confirm: e.target.value })); setPwError(""); }}
                    placeholder="Ulangi password baru"
                    className="w-full px-4 py-3 pr-10 bg-gray-50 border border-gray-200 rounded-2xl text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowResetPw(v => ({ ...v, confirm: !v.confirm }))}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-300 hover:text-blue-400 transition-colors"
                  >
                    {showResetPw.confirm ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              {pwError && (
                <p className="text-[12px] font-bold text-red-600 italic">! {pwError}</p>
              )}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPasswordModal(null)}
                  className="px-5 py-2.5 text-[12px] font-bold text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={pwSaving}
                  className="px-6 py-2.5 rounded-xl text-[12px] font-black bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
                >
                  {pwSaving ? "MENYIMPAN..." : "SIMPAN PASSWORD"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
