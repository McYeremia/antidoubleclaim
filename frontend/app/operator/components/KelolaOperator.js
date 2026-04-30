"use client";

import { useEffect, useState } from "react";
import { API, ConfirmModal } from "./shared";

const ROLE_BADGE = {
  superadmin: "bg-purple-100 text-purple-700",
  operator:   "bg-[#d4ebe0] text-[#046137]",
};

export default function KelolaOperator({ operatorId }) {
  const [operators, setOperators] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [formError, setFormError] = useState("");
  const [form,        setForm]        = useState({ username: "", password: "", nama: "", email: "", role: "operator" });
  const [deleteModal,   setDeleteModal]   = useState(null); // { id, nama }
  const [passwordModal, setPasswordModal] = useState(null); // { id, nama }
  const [pwForm,        setPwForm]        = useState({ new_password: "", confirm: "" });
  const [pwError,       setPwError]       = useState("");
  const [pwSaving,      setPwSaving]      = useState(false);

  const headers = { "Content-Type": "application/json", "x-operator-id": String(operatorId) };

  const fetchOperators = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/operators`, { headers });
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
      const res = await fetch(`${API}/operators`, {
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
    setDeleteModal({ id, nama });
  };

  const handleResetPassword = (op) => {
    setPasswordModal({ id: op.id, nama: op.nama });
    setPwForm({ new_password: "", confirm: "" });
    setPwError("");
  };

  const handleResetPasswordConfirm = async (e) => {
    e.preventDefault();
    if (pwForm.new_password.length < 6) { setPwError("Password minimal 6 karakter."); return; }
    if (pwForm.new_password !== pwForm.confirm) { setPwError("Konfirmasi password tidak cocok."); return; }
    setPwSaving(true);
    try {
      const res = await fetch(`${API}/operators/${passwordModal.id}/password`, {
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

  const handleDeleteConfirm = async () => {
    const { id } = deleteModal;
    setDeleteModal(null);
    const res = await fetch(`${API}/operators/${id}`, { method: "DELETE", headers });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.detail || "Gagal menghapus.");
      return;
    }
    fetchOperators();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-black text-gray-900 leading-none tracking-tight">Kelola Operator</h1>
          <p className="text-gray-400 mt-3 text-[14px]">Manajemen hak akses pengelola sistem.</p>
        </div>
        <button
          onClick={() => { setShowForm(v => !v); setFormError(""); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#046137] text-white text-[13px] font-bold rounded-xl hover:bg-[#035230] transition-all hover:scale-105 mt-1"
        >
          {showForm ? "BATALKAN" : "+ TAMBAH OPERATOR"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-[32px] shadow-2xl shadow-gray-200/50 border border-gray-100 p-10 animate-in slide-in-from-top duration-500">
          <h3 className="text-[16px] font-black text-gray-900 mb-8 uppercase tracking-tight">Akun Pengelola Baru</h3>
          <form onSubmit={handleAdd} className="grid grid-cols-2 gap-6">
            {[
              { label: "Nama Lengkap", name: "nama",     type: "text",     required: true },
              { label: "Email",        name: "email",    type: "email",    required: true },
              { label: "Username",     name: "username", type: "text",     required: true },
              { label: "Password",     name: "password", type: "password", required: true },
            ].map(f => (
              <div key={f.name}>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">{f.label}</label>
                <input
                  type={f.type}
                  required={f.required}
                  value={form[f.name]}
                  onChange={e => setForm(v => ({ ...v, [f.name]: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all"
                />
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
              <button
                type="submit"
                disabled={saving}
                className="ml-auto px-10 py-3.5 rounded-2xl text-[14px] font-black bg-[#046137] text-white hover:bg-[#035230] transition-all shadow-xl shadow-gray-200"
              >
                {saving ? "MENYIMPAN..." : "SIMPAN OPERATOR"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <svg className="w-8 h-8 text-gray-200 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : operators.length === 0 ? (
          <p className="text-center text-gray-400 text-[13px] py-12 font-medium">Belum ada data operator.</p>
        ) : (
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Nama Lengkap</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Username</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Email</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Hak Akses</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {operators.map(op => (
                <tr key={op.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-6 py-4 font-bold text-gray-900 text-[13px]">{op.nama}</td>
                  <td className="px-6 py-4 font-mono text-[12px] font-bold text-gray-400 uppercase tabular-nums">{op.username}</td>
                  <td className="px-6 py-4 text-[13px] text-gray-500 font-medium">{op.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${ROLE_BADGE[op.role] ?? "bg-gray-100 text-gray-600"}`}>
                      {op.role === "superadmin" ? "SUPER ADMIN" : "OPERATOR"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleResetPassword(op)}
                        className="px-3 py-1.5 rounded-xl text-[11px] font-black bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors border border-blue-100"
                      >
                        GANTI PASSWORD
                      </button>
                      {String(op.id) !== String(operatorId) ? (
                        <button
                          onClick={() => handleDelete(op.id, op.nama)}
                          className="px-3 py-1.5 rounded-xl text-[11px] font-black bg-red-50 text-red-600 hover:bg-red-100 transition-colors border border-red-100"
                        >
                          HAPUS
                        </button>
                      ) : (
                        <span className="text-[11px] text-gray-300 font-black italic tracking-widest uppercase px-3">AKUN ANDA</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmModal
        isOpen={!!deleteModal}
        title="Hapus Akun Operator?"
        message={`Akun "${deleteModal?.nama}" akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`}
        variant="danger"
        confirmLabel="YA, HAPUS"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteModal(null)}
      />

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
                <input
                  type="password"
                  required
                  autoFocus
                  value={pwForm.new_password}
                  onChange={e => { setPwForm(v => ({ ...v, new_password: e.target.value })); setPwError(""); }}
                  placeholder="Minimal 6 karakter"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  Konfirmasi Password Baru <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={pwForm.confirm}
                  onChange={e => { setPwForm(v => ({ ...v, confirm: e.target.value })); setPwError(""); }}
                  placeholder="Ulangi password baru"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                />
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
