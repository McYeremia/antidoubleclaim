// Panel profil mahasiswa: menampilkan info NIM/akademik dan form pengisian data rekening BNI.
"use client";

import { useState, useEffect } from "react";
import { API_URL, apiFetch } from "./shared";

// ─── VALIDASI ─────────────────────────────────────────────────────────────────

// Memvalidasi format nomor WhatsApp: harus diawali 08, panjang 10–13 digit.
function validateNomorWA(nomor) {
  if (!nomor) return { status: "empty", msg: "" };
  const digits = nomor.replace(/\D/g, "");
  if (digits.length === 0)   return { status: "invalid", msg: "Hanya boleh berisi angka" };
  if (!digits.startsWith("08")) return { status: "invalid", msg: "Harus diawali 08" };
  if (digits.length < 10)    return { status: "invalid", msg: `Kurang ${10 - digits.length} digit lagi (min. 10 digit)` };
  if (digits.length > 13)    return { status: "invalid", msg: "Terlalu panjang — maksimal 13 digit" };
  return { status: "valid", msg: "Format nomor WhatsApp valid" };
}

// Memvalidasi format nomor rekening BNI: harus tepat 10 digit angka.
function validateRekeningBNI(nomor) {
  if (!nomor) return { status: "empty", msg: "" };
  const digits = nomor.replace(/\D/g, "");
  if (digits.length === 0)  return { status: "invalid", msg: "Hanya boleh berisi angka" };
  if (digits.length < 10)   return { status: "invalid", msg: `Kurang ${10 - digits.length} digit lagi (BNI: 10 digit)` };
  if (digits.length > 10)   return { status: "invalid", msg: `Terlalu panjang — BNI hanya 10 digit` };
  return { status: "valid", msg: "Format nomor rekening BNI valid" };
}

// ─── KOMPONEN UTAMA ──────────────────────────────────────────────────────────

// Menampilkan info akademik dari NIM dan form simpan data rekening mahasiswa.
export default function ProfilPanel({ session, onBack, onProfilSaved }) {

  // ─── STATE ────────────────────────────────────────────────────────────────
  const [nimInfo, setNimInfo] = useState(null);
  const [profil,  setProfil]  = useState(null);
  const [form,    setForm]    = useState({ nomor_wa: "", nama_pemilik_rekening: "", nomor_rekening: "" });
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);

  // ─── DATA FETCHING ────────────────────────────────────────────────────────
  // Mengambil info NIM (fakultas, prodi, angkatan) dan data profil tersimpan secara paralel.
  useEffect(() => {
    Promise.all([
      apiFetch(`${API_URL}/nim-info?email=${encodeURIComponent(session.user.email)}`),
      apiFetch(`${API_URL}/profil?email=${encodeURIComponent(session.user.email)}`),
    ]).then(async ([nimRes, profilRes]) => {
      const nim  = nimRes.ok    ? await nimRes.json()    : {};
      const prof = profilRes.ok ? await profilRes.json() : {};
      setNimInfo(nim);
      setProfil(prof);
      // Isi form dari data profil yang sudah tersimpan sebelumnya.
      setForm({
        nomor_wa:              prof.nomor_wa              ?? "",
        nama_pemilik_rekening: prof.nama_pemilik_rekening ?? "",
        nomor_rekening:        prof.nomor_rekening        ?? "",
      });
    }).finally(() => setLoading(false));
  }, [session.user.email]);

  // ─── HANDLER ──────────────────────────────────────────────────────────────

  // Memperbarui state form dan mereset indikator "tersimpan" saat ada perubahan input.
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    setSaved(false);
  };

  // Menyimpan perubahan profil ke API lalu memanggil callback agar parent ikut diperbarui.
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch(`${API_URL}/profil?email=${encodeURIComponent(session.user.email)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setSaved(true);
      onProfilSaved?.(form);
    } catch {
      alert("Gagal menyimpan. Coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-4xl font-black text-gray-900 leading-none tracking-tight">Profil</h1>
          <p className="text-gray-400 mt-1.5 text-[14px]">Data diri dan informasi rekening.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-gray-400 py-16 justify-center">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <span className="text-sm">Memuat profil...</span>
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-5 items-start">

          <div className="col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-[#046137] flex items-center justify-center flex-shrink-0 overflow-hidden mb-4">
                {session.user.image
                  ? <img src={session.user.image} alt="avatar" className="w-20 h-20 rounded-full object-cover" />
                  : <span className="text-2xl font-black text-white">
                      {session.user.name?.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase()}
                    </span>
                }
              </div>
              <p className="text-[16px] font-bold text-gray-900 leading-snug">{session.user.name}</p>
              <p className="text-[12px] text-gray-400 mt-1 break-all">{session.user.email}</p>
              {nimInfo?.nim && (
                <span className="inline-block mt-3 px-3 py-1 bg-gray-100 rounded-full text-[11px] font-semibold text-gray-500 tracking-wider">
                  NIM {nimInfo.nim}
                </span>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-4">Data Akademik</p>
              <div className="space-y-2.5">
                {[
                  { label: "Angkatan",      value: nimInfo?.angkatan ?? "—" },
                  { label: "Program Studi", value: nimInfo?.prodi    ?? "—" },
                  { label: "Fakultas",      value: nimInfo?.fakultas ?? "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="px-4 py-3 bg-gray-50 rounded-xl">
                    <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">{label}</p>
                    <p className="text-[13px] font-semibold text-gray-800 mt-1">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <form onSubmit={handleSave} className="col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-7 space-y-6">
            <div>
              <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-0.5">Rekening & Kontak</p>
              <p className="text-[12px] text-gray-400">Digunakan untuk mengisi form reward secara otomatis.</p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                Nomor WhatsApp
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </span>
                <input
                  type="text"
                  name="nomor_wa"
                  value={form.nomor_wa}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setForm(f => ({ ...f, nomor_wa: val }));
                    setSaved(false);
                  }}
                  placeholder="Contoh: 08123456789"
                  maxLength={13}
                  inputMode="tel"
                  className={`block w-full pl-10 pr-4 py-3.5 border rounded-xl text-[15px] text-gray-900 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                    (() => {
                      const v = validateNomorWA(form.nomor_wa);
                      if (v.status === "valid")   return "border-green-300 focus:ring-green-400";
                      if (v.status === "invalid") return "border-red-300 focus:ring-red-400";
                      return "border-gray-200 focus:ring-blue-500";
                    })()
                  }`}
                />
              </div>
              {(() => {
                const v = validateNomorWA(form.nomor_wa);
                if (v.status === "valid") return (
                  <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-green-50 border border-green-200 rounded-xl">
                    <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-[12px] font-bold text-green-700">{v.msg}</p>
                  </div>
                );
                if (v.status === "invalid") return (
                  <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl">
                    <div className="w-4 h-4 rounded-full bg-red-400 flex items-center justify-center flex-shrink-0">
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <p className="text-[12px] font-bold text-red-600">{v.msg}</p>
                  </div>
                );
                return null;
              })()}
            </div>

            <div className="border-t border-gray-100 pt-5 space-y-4">
              <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Rekening Bank</p>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Bank</label>
                <div className="flex items-center gap-3 px-4 py-3.5 bg-amber-50 border border-amber-100 rounded-xl">
                  <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
                  </svg>
                  <span className="flex-1 text-[15px] font-bold text-amber-700">BNI</span>
                  <span className="text-[10px] font-semibold text-amber-500 uppercase tracking-widest bg-amber-100 px-2 py-0.5 rounded-md">
                    Satu-satunya bank
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Nama Pemilik Rekening
                </label>
                <input
                  type="text"
                  name="nama_pemilik_rekening"
                  value={form.nama_pemilik_rekening}
                  onChange={handleChange}
                  placeholder="Nama sesuai buku tabungan"
                  className="block w-full px-4 py-3.5 border border-gray-200 rounded-xl text-[15px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Nomor Rekening
                </label>
                <input
                  type="text"
                  name="nomor_rekening"
                  value={form.nomor_rekening}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setForm(f => ({ ...f, nomor_rekening: val }));
                    setSaved(false);
                  }}
                  placeholder="Contoh: 0123456789"
                  maxLength={10}
                  inputMode="numeric"
                  className={`block w-full px-4 py-3.5 border rounded-xl text-[15px] text-gray-900 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                    (() => {
                      const v = validateRekeningBNI(form.nomor_rekening);
                      if (v.status === "valid")   return "border-green-300 focus:ring-green-400";
                      if (v.status === "invalid") return "border-red-300   focus:ring-red-400";
                      return "border-gray-200 focus:ring-blue-500";
                    })()
                  }`}
                />

                {(() => {
                  const v = validateRekeningBNI(form.nomor_rekening);
                  const hasName = (form.nama_pemilik_rekening || "").trim().length >= 3;

                  if (v.status === "valid") return (
                    <div className="mt-2.5 rounded-xl overflow-hidden border border-green-200">
                      <div className="flex items-center gap-2.5 px-4 py-2.5 bg-green-50">
                        <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-[12px] font-bold text-green-700">Format Rekening BNI Valid</p>
                          <p className="text-[11px] text-green-600 mt-0.5">10 digit · Bank BNI</p>
                        </div>
                        <span className="text-[10px] font-black text-green-600 bg-green-100 px-2 py-0.5 rounded-full uppercase tracking-wider">BNI ✓</span>
                      </div>
                      {!hasName && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-t border-green-100">
                          <svg className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-[11px] text-amber-700">Lengkapi nama pemilik rekening di atas</p>
                        </div>
                      )}
                    </div>
                  );

                  if (v.status === "invalid") return (
                    <div className="flex items-center gap-2.5 mt-2.5 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl">
                      <div className="w-5 h-5 rounded-full bg-red-400 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-[12px] font-bold text-red-700">Format Tidak Valid</p>
                        <p className="text-[11px] text-red-500 mt-0.5">{v.msg}</p>
                      </div>
                    </div>
                  );

                  return (
                    <div className="flex items-start gap-2.5 mt-2.5 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl">
                      <svg className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-[11px] text-amber-700 leading-relaxed">
                        Nomor rekening BNI terdiri dari <span className="font-bold">10 digit angka</span>. Rekening bank lain tidak dapat diproses.
                      </p>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-[#046137] text-white text-[14px] font-semibold rounded-xl hover:bg-[#035230] disabled:opacity-50 transition-colors"
              >
                {saving ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
              {saved && (
                <span className="text-[12px] text-green-600 font-medium flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Tersimpan
                </span>
              )}
            </div>
          </form>

        </div>
      )}
    </div>
  );
}
