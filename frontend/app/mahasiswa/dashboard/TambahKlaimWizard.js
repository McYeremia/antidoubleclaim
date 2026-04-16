"use client";

import { useState, useEffect, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Konstanta
// ─────────────────────────────────────────────────────────────────────────────
const TAHUN_INI  = new Date().getFullYear();
const TAHUN_OPSI = [String(TAHUN_INI), String(TAHUN_INI - 1)];

const PENGALI_REWARD = 225_000;

const TABEL_NON_PUSPRESNAS = {
  "Provinsi / Wilayah": { peserta: 0.5, juara3: 1,  juara2: 2,  juara1: 4,  terbaik: 5,  terbaikPlus: 6  },
  "Nasional":           { peserta: 0.5, juara3: 2,  juara2: 4,  juara1: 8,  terbaik: 10, terbaikPlus: 12 },
  "Internasional":      { peserta: 0.5, juara3: 3,  juara2: 6,  juara1: 12, terbaik: 15, terbaikPlus: 18 },
};

function capaianKePoin(capaian, tabel) {
  if (!capaian || !tabel) return null;
  if (capaian.includes("Juara 1"))                                      return tabel.juara1;
  if (capaian.includes("Juara 2"))                                      return tabel.juara2;
  if (capaian.includes("Juara 3") || capaian.startsWith("Harapan"))    return tabel.juara3;
  if (capaian.includes("Apresiasi") || capaian.includes("Juara umum")) return tabel.terbaikPlus;
  if (capaian.includes("Partisipasi") || capaian.includes("Peserta"))  return tabel.peserta;
  return null;
}

function hitungReward(data) {
  const { kategori_simkatmawa, kategori_kegiatan, capaian, jenis_kepesertaan, jumlah_anggota } = data;
  if (kategori_simkatmawa !== "lomba_mandiri") return null;
  const tabel = TABEL_NON_PUSPRESNAS[kategori_kegiatan];
  let poin = capaianKePoin(capaian, tabel);
  if (poin == null) return null;
  const n = Math.max(1, parseInt(jumlah_anggota) || 1);
  if (jenis_kepesertaan === "kelompok") {
    const bonus = n <= 5 ? 1 : n <= 10 ? 1.25 : 1.5;
    poin = poin * bonus;
  }
  return { poin: Math.round(poin * 100) / 100, total: Math.round(poin * PENGALI_REWARD), jumlah_anggota: n };
}

function formatRupiah(n) {
  return "Rp " + n.toLocaleString("id-ID");
}

const KATEGORI_REKOGNISI = [
  "Karya Mahasiswa berupa teknologi tepat guna/seni budaya/produk kreatif untuk UMKM dan Industri",
  "Juri/Pelatih/Wasit",
  "Pemakalah/Speaker pada Conference/Seminar Ilmiah",
  "Narasumber pada kegiatan/seminar",
  "Peserta pameran karya seni",
  "Penulisan ISBN",
  "Paten/Paten Sederhana",
  "Publikasi jurnal nasional Sinta 1 dan 2 dan/atau internasional bereputasi sebagai penulis pertama",
  "Tuan rumah kejuaraan/kompetisi mandiri",
];

const CAPAIAN_LOMBA = [
  "Juara 1",
  "Juara 2",
  "Juara 3",
  "Harapan 1",
  "Harapan 2",
  "Harapan 3",
  "Apresiasi kejuaraan / Penghargaan tambahan / Juara umum",
  "Partisipasi / Delegasi / Peserta kejuaraan",
];

// Ukuran file maks
const MAX_FILE_MB = 10;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

function validateFile(file) {
  if (!file) return null;
  if (!ALLOWED_TYPES.includes(file.type)) return "Format tidak didukung. Gunakan JPG, PNG, PDF, atau DOC.";
  if (file.size > MAX_FILE_MB * 1024 * 1024) return `Ukuran file maksimal ${MAX_FILE_MB} MB.`;
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Validasi per-step — returns { [fieldKey]: "pesan error" }
// ─────────────────────────────────────────────────────────────────────────────
function validateStep(step, data, files, showKelompok, totalSteps) {
  const e = {};

  if (step === 1) {
    const wa = (data.nomor_wa || "").replace(/\s|-/g, "");
    if (!wa) {
      e.nomor_wa = "Nomor WhatsApp wajib diisi.";
    } else if (!/^(\+62|62|0)8[0-9]{7,11}$/.test(wa)) {
      e.nomor_wa = "Format tidak valid. Gunakan 08xxxxxxxxxx (10–13 digit, angka saja).";
    }
  }

  if (step === 2) {
    if (!data.ada_dospem) e.ada_dospem = "Pilih salah satu pilihan.";
    if (data.ada_dospem === "ya") {
      const nidn = (data.nidn_dospem || "").trim();
      if (!nidn) {
        e.nidn_dospem = "NIK/NIDN/NIDK wajib diisi jika menggunakan dosen pembimbing.";
      } else if (!/^\d{8,16}$/.test(nidn)) {
        e.nidn_dospem = "Hanya angka, 8–16 digit (NIK = 16 digit, NIDN = 10 digit, NIDK = 8 digit).";
      }
      if (files?.surat_tugas_dospem) {
        const ferr = validateFile(files.surat_tugas_dospem);
        if (ferr) e.surat_tugas_dospem = ferr;
      }
    }
  }

  if (step === 3) {
    if (!data.kategori_simkatmawa) e.kategori_simkatmawa = "Pilih kategori SIMKATMAWA terlebih dahulu.";
  }

  if (step === 4) {
    if (!data.jenis_kepesertaan) e.jenis_kepesertaan = "Pilih jenis kepesertaan.";
    if (!data.kategori_kegiatan) e.kategori_kegiatan = "Pilih kategori kegiatan.";

    const nama = (data.nama_kegiatan || "").trim();
    if (!nama)          e.nama_kegiatan = "Nama kegiatan wajib diisi.";
    else if (nama.length < 5)   e.nama_kegiatan = "Minimal 5 karakter.";
    else if (nama.length > 200) e.nama_kegiatan = "Maksimal 200 karakter.";

    const url = (data.url_penyelenggara || "").trim();
    if (!url)                               e.url_penyelenggara = "URL penyelenggara wajib diisi.";
    else if (!/^https?:\/\/.{4,}/.test(url)) e.url_penyelenggara = "Harus URL valid diawali https:// atau http://";

    if (!files?.dokumen_sertifikat) {
      e.dokumen_sertifikat = "Dokumen sertifikat wajib diunggah.";
    } else {
      const ferr = validateFile(files.dokumen_sertifikat);
      if (ferr) e.dokumen_sertifikat = ferr;
    }
    if (!files?.foto_penyerahan) {
      e.foto_penyerahan = "Foto penyerahan wajib diunggah.";
    } else {
      const ferr = validateFile(files.foto_penyerahan);
      if (ferr) e.foto_penyerahan = ferr;
    }
    if (!files?.dokumen_lainnya) {
      e.dokumen_lainnya = "Dokumen pendukung lainnya wajib diunggah.";
    } else {
      const ferr = validateFile(files.dokumen_lainnya);
      if (ferr) e.dokumen_lainnya = ferr;
    }

    if (data.kategori_simkatmawa === "lomba_mandiri") {
      if (!data.capaian)          e.capaian = "Capaian peserta wajib dipilih.";
      if (!data.model_pelaksanaan) e.model_pelaksanaan = "Model pelaksanaan wajib dipilih.";

      const jp = parseInt(data.jumlah_peserta);
      if (!data.jumlah_peserta)           e.jumlah_peserta = "Jumlah peserta wajib diisi.";
      else if (isNaN(jp) || jp < 2)        e.jumlah_peserta = "Minimal 2 peserta (kompetisi butuh lebih dari 1 peserta).";
      else if (jp > 100_000)               e.jumlah_peserta = "Jumlah peserta terlalu besar, periksa kembali.";

      const _now = new Date();
      const todayStr = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, "0")}-${String(_now.getDate()).padStart(2, "0")}`;
      const _batas = new Date(_now); _batas.setFullYear(_batas.getFullYear() - 1);
      const batasLaluStr = `${_batas.getFullYear()}-${String(_batas.getMonth() + 1).padStart(2, "0")}-${String(_batas.getDate()).padStart(2, "0")}`;

      if (!data.tanggal_mulai) {
        e.tanggal_mulai = "Tanggal mulai wajib diisi.";
      } else {
        if (data.tanggal_mulai > todayStr)     e.tanggal_mulai = "Tanggal mulai tidak boleh di masa depan.";
        else if (data.tanggal_mulai < batasLaluStr) e.tanggal_mulai = "Melebihi batas 12 bulan pengajuan (SK Rektor Pasal 5).";
      }

      if (!data.tanggal_selesai) {
        e.tanggal_selesai = "Tanggal selesai wajib diisi.";
      } else {
        if (data.tanggal_selesai > todayStr) e.tanggal_selesai = "Tanggal selesai tidak boleh di masa depan.";
        else if (data.tanggal_mulai && data.tanggal_selesai < data.tanggal_mulai)
          e.tanggal_selesai = "Tanggal selesai harus sama atau setelah tanggal mulai.";
      }
    } else {
      // rekognisi
      if (!data.tingkatan)      e.tingkatan = "Tingkatan kegiatan wajib dipilih.";
      if (!data.tahun_kegiatan) e.tahun_kegiatan = "Tahun kegiatan wajib dipilih.";

      // Karya Mahasiswa
      const isKarya = data.kategori_kegiatan ===
        "Karya Mahasiswa berupa teknologi tepat guna/seni budaya/produk kreatif untuk UMKM dan Industri";
      if (isKarya) {
        if (!(data.nama_lembaga || "").trim())        e.nama_lembaga = "Nama lembaga/mitra wajib diisi.";
        if (!(data.jenis_karya_teks || "").trim())    e.jenis_karya_teks = "Jenis karya wajib diisi.";
        if (!data.jenis_karya_pilihan)                e.jenis_karya_pilihan = "Pilih jenis karya.";
        const desk = (data.deskripsi_karya || "").trim();
        if (!desk)            e.deskripsi_karya = "Deskripsi karya wajib diisi.";
        else if (desk.length < 20) e.deskripsi_karya = "Deskripsi minimal 20 karakter.";
        const manf = (data.manfaat_karya || "").trim();
        if (!manf)            e.manfaat_karya = "Manfaat karya wajib diisi.";
        else if (manf.length < 20) e.manfaat_karya = "Manfaat minimal 20 karakter.";
        if (!(data.nomor_surat || "").trim()) e.nomor_surat = "Nomor surat keterangan wajib diisi.";
        if (!data.tanggal_surat)              e.tanggal_surat = "Tanggal surat keterangan wajib diisi.";
      }
    }
  }

  if (showKelompok && step === 5) {
    const ja = parseInt(data.jumlah_anggota);
    if (!data.jumlah_anggota)        e.jumlah_anggota = "Jumlah anggota wajib diisi.";
    else if (isNaN(ja) || ja < 2)    e.jumlah_anggota = "Minimal 2 anggota (termasuk ketua).";
    else if (ja > 50)                e.jumlah_anggota = "Maksimal 50 anggota per tim.";

    const ketua = (data.nama_ketua || "").trim();
    if (!ketua)          e.nama_ketua = "Nama ketua wajib diisi.";
    else if (ketua.length < 3) e.nama_ketua = "Nama ketua minimal 3 karakter.";

    if (!(data.peran_pengeclaim || "").trim())
      e.peran_pengeclaim = "Peran Anda dalam kelompok wajib diisi.";

    if (!isNaN(ja) && ja > 1) {
      (data.anggota || []).slice(0, ja - 1).forEach((a, i) => {
        const nama = (a?.nama || "").trim();
        if (!nama) e[`anggota_${i}_nama`] = "Nama anggota wajib diisi.";
        else if (nama.length < 3) e[`anggota_${i}_nama`] = "Nama minimal 3 karakter.";
        const nim = (a?.nim || "").trim();
        if (!nim)                    e[`anggota_${i}_nim`] = "NIM wajib diisi.";
        else if (!/^\d{8}$/.test(nim)) e[`anggota_${i}_nim`] = "NIM harus tepat 8 digit angka.";
      });
    }
  }

  if (step === totalSteps && !data.setuju)
    e.setuju = "Centang persetujuan untuk menyelesaikan pengajuan.";

  return e;
}

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens (sama dengan dashboard)
// ─────────────────────────────────────────────────────────────────────────────
const T = {
  border:  "#e2ddd4",
  accent:  "#c8820f",
  errBg:   "#fff5f5",
  errBor:  "#f5c0c0",
  errText: "#b72b2b",
  hintText:"#9a9490",
  labelCol:"#4a4540",
  inputBg: "#fdfcfa",
  focusRing:"0 0 0 2px rgba(200,130,15,0.25)",
};

// ─────────────────────────────────────────────────────────────────────────────
// Atoms UI
// ─────────────────────────────────────────────────────────────────────────────
function FieldLabel({ children, required, htmlFor }) {
  return (
    <label
      htmlFor={htmlFor}
      style={{ display: "block", fontSize: "12px", fontWeight: 600, color: T.labelCol, marginBottom: "5px" }}
    >
      {children}
      {required && <span style={{ color: T.accent, marginLeft: "3px" }}>*</span>}
    </label>
  );
}

function FieldHint({ children }) {
  if (!children) return null;
  return <p style={{ fontSize: "11px", color: T.hintText, marginTop: "4px" }}>{children}</p>;
}

function FieldError({ children }) {
  if (!children) return null;
  return (
    <p style={{ fontSize: "11px", color: T.errText, marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
      <span>⚠</span> {children}
    </p>
  );
}

const baseInput = (hasError) => ({
  display: "block",
  width: "100%",
  padding: "8px 12px",
  fontSize: "13px",
  color: "#1c1a17",
  background: hasError ? T.errBg : T.inputBg,
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: hasError ? T.errBor : T.border,
  borderRadius: "7px",
  outline: "none",
  transition: "border-color 0.15s, box-shadow 0.15s",
  fontFamily: "inherit",
  boxSizing: "border-box",
});

function FInput({ id, label, required, hint, error, style: extraStyle, onBlur: externalOnBlur, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      {label && <FieldLabel required={required} htmlFor={id}>{label}</FieldLabel>}
      <input
        id={id}
        style={{
          ...baseInput(!!error),
          ...(focused ? { borderColor: error ? T.errBor : T.accent, boxShadow: T.focusRing } : {}),
          ...extraStyle,
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); externalOnBlur?.(); }}
        {...props}
      />
      {!error && hint && <FieldHint>{hint}</FieldHint>}
      <FieldError>{error}</FieldError>
    </div>
  );
}

function FSelect({ id, label, required, hint, error, children, onBlur: externalOnBlur, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      {label && <FieldLabel required={required} htmlFor={id}>{label}</FieldLabel>}
      <select
        id={id}
        style={{
          ...baseInput(!!error),
          cursor: "pointer",
          appearance: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239a9490' stroke-width='2'%3E%3Cpath d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 12px center",
          paddingRight: "32px",
          ...(focused ? { borderColor: error ? T.errBor : T.accent, boxShadow: T.focusRing } : {}),
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); externalOnBlur?.(); }}
        {...props}
      >
        {children}
      </select>
      {!error && hint && <FieldHint>{hint}</FieldHint>}
      <FieldError>{error}</FieldError>
    </div>
  );
}

function FTextarea({ id, label, required, hint, error, maxLen, value, onChange, onBlur: externalOnBlur, ...props }) {
  const [focused, setFocused] = useState(false);
  const len = (value || "").length;
  return (
    <div>
      {label && <FieldLabel required={required} htmlFor={id}>{label}</FieldLabel>}
      <textarea
        id={id}
        rows={3}
        value={value}
        onChange={onChange}
        style={{
          ...baseInput(!!error),
          resize: "vertical",
          ...(focused ? { borderColor: error ? T.errBor : T.accent, boxShadow: T.focusRing } : {}),
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); externalOnBlur?.(); }}
        {...props}
      />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: "4px" }}>
        {error ? <FieldError>{error}</FieldError> : (hint ? <FieldHint>{hint}</FieldHint> : <span />)}
        {maxLen && <span style={{ fontSize: "10px", color: len > maxLen ? T.errText : T.hintText }}>{len}/{maxLen}</span>}
      </div>
    </div>
  );
}

function FFile({ id, label, required, hint, error, onChange, currentFile }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (ev) => {
    ev.preventDefault();
    setDragging(false);
    const f = ev.dataTransfer.files?.[0];
    if (f) onChange({ target: { files: [f] } });
  };

  return (
    <div>
      {label && <FieldLabel required={required} htmlFor={id}>{label}</FieldLabel>}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        style={{
          border: `1.5px dashed ${error ? T.errBor : dragging ? T.accent : T.border}`,
          borderRadius: "7px",
          padding: "10px 14px",
          background: dragging ? "rgba(200,130,15,0.04)" : currentFile ? "#f6fdf8" : T.inputBg,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          transition: "border-color 0.15s",
        }}
      >
        <svg width="16" height="16" fill="none" stroke={currentFile ? "#1a7a4a" : T.hintText} viewBox="0 0 24 24">
          {currentFile
            ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          }
        </svg>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: "12px", fontWeight: 500, color: currentFile ? "#1a7a4a" : "#7a756e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {currentFile ? currentFile.name : "Klik atau seret file ke sini"}
          </p>
          <p style={{ fontSize: "10px", color: T.hintText, marginTop: "1px" }}>
            {currentFile ? `${(currentFile.size / 1024).toFixed(0)} KB` : "JPG, PNG, PDF, DOC — maks. 10 MB"}
          </p>
        </div>
        {currentFile && (
          <span style={{ marginLeft: "auto", fontSize: "10px", color: T.accent, fontWeight: 600, flexShrink: 0 }}>Ganti</span>
        )}
        <input ref={inputRef} id={id} type="file" accept=".jpg,.jpeg,.png,.pdf,.doc,.docx" onChange={onChange} className="sr-only" />
      </div>
      {!error && hint && <FieldHint>{hint}</FieldHint>}
      <FieldError>{error}</FieldError>
    </div>
  );
}

function FRadio({ label, name, options, value, onChange, required, error }) {
  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "4px" }}>
        {options.map((opt) => (
          <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: "7px", cursor: "pointer" }}>
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              style={{ accentColor: T.accent, width: "14px", height: "14px" }}
            />
            <span style={{ fontSize: "13px", color: "#1c1a17" }}>{opt.label}</span>
          </label>
        ))}
      </div>
      <FieldError>{error}</FieldError>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Progress Bar
// ─────────────────────────────────────────────────────────────────────────────
function ProgressBar({ steps, current }) {
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: "24px" }}>
      {steps.map((s, i) => {
        const idx    = i + 1;
        const done   = idx < current;
        const active = idx === current;
        return (
          <div key={s} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "none" }}>
            <div style={{
              width: "26px", height: "26px", borderRadius: "50%", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "11px", fontWeight: 700,
              background: done ? T.accent : active ? "#1c1a17" : "#f2efe8",
              color: done || active ? "#fff" : T.hintText,
              border: `2px solid ${done ? T.accent : active ? "#1c1a17" : T.border}`,
              transition: "all 0.2s",
            }}>
              {done ? "✓" : idx}
            </div>
            <span style={{
              marginLeft: "6px",
              fontSize: "11px",
              fontWeight: active ? 600 : 400,
              color: active ? "#1c1a17" : done ? T.accent : T.hintText,
              whiteSpace: "nowrap",
              display: "none",
            }}
              className="sm:inline"
            >
              {s}
            </span>
            {i < steps.length - 1 && (
              <div style={{
                flex: 1,
                height: "2px",
                margin: "0 8px",
                background: done ? T.accent : T.border,
                transition: "background 0.3s",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 — Data Diri
// ─────────────────────────────────────────────────────────────────────────────
function Step1({ data, onChange, onBlur, nimInfo, errors }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
        <FInput
          id="nama_lengkap"
          label="Nama Lengkap"
          value={data.nama_lengkap}
          disabled
          hint="Diambil otomatis dari akun Google"
        />
        <FInput
          id="nim"
          label="NIM"
          value={nimInfo?.nim ?? "Memuat..."}
          disabled
          hint={nimInfo?.valid ? `${nimInfo.prodi} · Angkatan ${nimInfo.angkatan}` : undefined}
        />
        <FInput
          id="email"
          label="Email"
          value={data.email}
          disabled
          style={{ gridColumn: "1 / -1" }}
        />
        <FInput
          id="nomor_wa"
          label="Nomor WhatsApp"
          required
          type="tel"
          placeholder="08123456789"
          value={data.nomor_wa}
          onChange={(e) => {
            const val = e.target.value.replace(/[^\d+\s-]/g, "");
            onChange("nomor_wa", val);
          }}
          onBlur={() => onBlur("nomor_wa")}
          hint="Format: 08xxxxxxxxxx — 10 hingga 13 digit angka, diawali 08 atau +62"
          error={errors?.nomor_wa}
          maxLength={16}
        />
      </div>
      {nimInfo?.valid && (
        <div style={{ background: "#f6fdf8", border: "1px solid #c2e8d0", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#1a7a4a" }}>
          <strong>{nimInfo.fakultas}</strong> · {nimInfo.prodi}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — Dosen Pembimbing
// ─────────────────────────────────────────────────────────────────────────────
function Step2({ data, onChange, onBlur, onFileChange, files, errors }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <FRadio
        label="Apakah menggunakan dosen pembimbing?"
        name="ada_dospem"
        required
        options={[{ value: "ya", label: "Ya" }, { value: "tidak", label: "Tidak" }]}
        value={data.ada_dospem}
        onChange={(v) => onChange("ada_dospem", v)}
        error={errors?.ada_dospem}
      />

      {data.ada_dospem === "ya" && (
        <div style={{ paddingLeft: "14px", borderLeft: `2px solid ${T.border}`, display: "flex", flexDirection: "column", gap: "14px" }}>
          <FInput
            id="nidn_dospem"
            label="NIK / NIDN / NIDK Dosen Pembimbing"
            required
            placeholder="Contoh: 0512078801"
            value={data.nidn_dospem}
            onChange={(e) => onChange("nidn_dospem", e.target.value.replace(/\D/g, ""))}
            onBlur={() => onBlur("nidn_dospem")}
            hint="Hanya angka — NIK: 16 digit, NIDN: 10 digit, NIDK: 8 digit"
            error={errors?.nidn_dospem}
            maxLength={16}
            inputMode="numeric"
          />
          <FFile
            id="surat_tugas_dospem"
            label="Surat Tugas Dosen Pembimbing (opsional)"
            onChange={(e) => onFileChange("surat_tugas_dospem", e.target.files[0])}
            currentFile={files?.surat_tugas_dospem}
            hint="PDF, JPG, PNG, atau DOC"
            error={errors?.surat_tugas_dospem}
          />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3 — Pilih Kategori SIMKATMAWA
// ─────────────────────────────────────────────────────────────────────────────
function Step3({ data, onChange, errors }) {
  const cards = [
    {
      value: "lomba_mandiri",
      title: "Lomba Mandiri",
      desc: "Kegiatan kejuaraan yang diselenggarakan secara mandiri oleh perguruan tinggi dan telah terselenggara minimal 2 kali secara berturut-turut.",
      icon: "🏆",
    },
    {
      value: "rekognisi",
      title: "Rekognisi (Non-Lomba)",
      desc: "Prestasi non kompetisi yang diraih oleh mahasiswa, diberikan oleh pemerintah, komunitas, organisasi, atau masyarakat.",
      icon: "🎖️",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <p style={{ fontSize: "13px", color: "#7a756e" }}>Pilih kategori kegiatan yang sesuai dengan prestasi yang ingin diklaim.</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        {cards.map((c) => {
          const active = data.kategori_simkatmawa === c.value;
          return (
            <button
              key={c.value}
              type="button"
              onClick={() => onChange("kategori_simkatmawa", c.value)}
              style={{
                textAlign: "left",
                padding: "16px",
                borderRadius: "10px",
                border: `2px solid ${active ? T.accent : T.border}`,
                background: active ? "rgba(200,130,15,0.05)" : "#fff",
                cursor: "pointer",
                transition: "border-color 0.15s, background 0.15s",
              }}
            >
              <div style={{ fontSize: "22px", marginBottom: "8px" }}>{c.icon}</div>
              <p style={{ fontWeight: 600, fontSize: "13px", color: active ? T.accent : "#1c1a17", marginBottom: "4px" }}>{c.title}</p>
              <p style={{ fontSize: "11px", color: "#7a756e", lineHeight: 1.5 }}>{c.desc}</p>
            </button>
          );
        })}
      </div>
      <FieldError>{errors?.kategori_simkatmawa}</FieldError>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 4A — Detail Rekognisi
// ─────────────────────────────────────────────────────────────────────────────
function Step4Rekognisi({ data, onChange, onBlur, onFileChange, files, errors }) {
  const isKarya = data.kategori_kegiatan ===
    "Karya Mahasiswa berupa teknologi tepat guna/seni budaya/produk kreatif untuk UMKM dan Industri";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <FRadio
        label="Jenis Kepesertaan"
        name="jenis_kepesertaan"
        required
        options={[{ value: "individu", label: "Individu" }, { value: "kelompok", label: "Kelompok" }]}
        value={data.jenis_kepesertaan}
        onChange={(v) => onChange("jenis_kepesertaan", v)}
        error={errors?.jenis_kepesertaan}
      />

      <FSelect id="kategori_kegiatan" label="Kategori Kegiatan" required
        value={data.kategori_kegiatan} onChange={(e) => onChange("kategori_kegiatan", e.target.value)}
        onBlur={() => onBlur("kategori_kegiatan")}
        error={errors?.kategori_kegiatan}>
        <option value="">Pilih kategori kegiatan</option>
        {KATEGORI_REKOGNISI.map((k) => <option key={k}>{k}</option>)}
      </FSelect>

      <FInput id="nama_kegiatan" label="Nama Kegiatan / Rekognisi / Karya" required
        placeholder="Masukkan nama kegiatan atau karya"
        value={data.nama_kegiatan} onChange={(e) => onChange("nama_kegiatan", e.target.value)}
        onBlur={() => onBlur("nama_kegiatan")}
        hint="5–200 karakter" error={errors?.nama_kegiatan} maxLength={200} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
        <FSelect id="tingkatan" label="Tingkatan Kegiatan" required
          value={data.tingkatan} onChange={(e) => onChange("tingkatan", e.target.value)}
          onBlur={() => onBlur("tingkatan")}
          error={errors?.tingkatan}>
          <option value="">Pilih tingkatan</option>
          <option>Internasional</option>
          <option>Nasional</option>
          <option>Provinsi</option>
        </FSelect>

        <FSelect id="tahun_kegiatan" label="Tahun Kegiatan" required
          value={data.tahun_kegiatan} onChange={(e) => onChange("tahun_kegiatan", e.target.value)}
          onBlur={() => onBlur("tahun_kegiatan")}
          error={errors?.tahun_kegiatan} hint={`Pengajuan maks. ${TAHUN_INI}`}>
          <option value="">Pilih tahun</option>
          {TAHUN_OPSI.map((t) => <option key={t}>{t}</option>)}
        </FSelect>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
        <FFile id="dokumen_sertifikat" label="Dokumen Sertifikat / Karya" required
          onChange={(e) => onFileChange("dokumen_sertifikat", e.target.files[0])}
          currentFile={files?.dokumen_sertifikat} error={errors?.dokumen_sertifikat} />
        <FFile id="foto_penyerahan" label="Bukti Foto Penyerahan Sertifikat" required
          onChange={(e) => onFileChange("foto_penyerahan", e.target.files[0])}
          currentFile={files?.foto_penyerahan} error={errors?.foto_penyerahan} />
      </div>

      <FInput id="url_penyelenggara" label="URL Website Penyelenggara" required
        type="url" placeholder="https://contoh.ac.id/kegiatan"
        value={data.url_penyelenggara} onChange={(e) => onChange("url_penyelenggara", e.target.value)}
        onBlur={() => onBlur("url_penyelenggara")}
        hint="Harus diawali https:// atau http://" error={errors?.url_penyelenggara} />

      <FFile id="dokumen_lainnya" label="Dokumen Pendukung Lainnya" required
        onChange={(e) => onFileChange("dokumen_lainnya", e.target.files[0])}
        currentFile={files?.dokumen_lainnya}
        hint="Surat tugas, LoA, atau dokumen relevan lainnya"
        error={errors?.dokumen_lainnya} />

      {isKarya && (
        <div style={{ padding: "16px", background: "#fdf8ed", border: "1px solid #f0d99a", borderRadius: "10px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <p style={{ fontSize: "12px", fontWeight: 700, color: "#8c6200" }}>Data Tambahan — Karya Mahasiswa</p>

          <FInput id="nama_lembaga" label="Nama Lembaga / Mitra" required
            placeholder="Nama lembaga atau mitra UMKM/Industri"
            value={data.nama_lembaga} onChange={(e) => onChange("nama_lembaga", e.target.value)}
            onBlur={() => onBlur("nama_lembaga")}
            error={errors?.nama_lembaga} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <FInput id="jenis_karya_teks" label="Jenis Karya (deskripsi)" required
              placeholder="Contoh: Alat pengolah limbah plastik"
              value={data.jenis_karya_teks} onChange={(e) => onChange("jenis_karya_teks", e.target.value)}
              onBlur={() => onBlur("jenis_karya_teks")}
              error={errors?.jenis_karya_teks} />
            <FSelect id="jenis_karya_pilihan" label="Pilihan Jenis Karya" required
              value={data.jenis_karya_pilihan} onChange={(e) => onChange("jenis_karya_pilihan", e.target.value)}
              onBlur={() => onBlur("jenis_karya_pilihan")}
              error={errors?.jenis_karya_pilihan}>
              <option value="">Pilih jenis</option>
              <option>Teknologi Tepat Guna</option>
              <option>Seni Budaya</option>
              <option>Produk Kreatif</option>
            </FSelect>
          </div>

          <FTextarea id="deskripsi_karya" label="Deskripsi Karya" required
            placeholder="Jelaskan deskripsi karya secara singkat..."
            value={data.deskripsi_karya} onChange={(e) => onChange("deskripsi_karya", e.target.value)}
            onBlur={() => onBlur("deskripsi_karya")}
            hint="Minimal 20 karakter, maksimal 1000 karakter"
            error={errors?.deskripsi_karya} maxLen={1000} />

          <FTextarea id="manfaat_karya" label="Manfaat Karya" required
            placeholder="Jelaskan manfaat karya bagi UMKM/Industri..."
            value={data.manfaat_karya} onChange={(e) => onChange("manfaat_karya", e.target.value)}
            onBlur={() => onBlur("manfaat_karya")}
            hint="Minimal 20 karakter, maksimal 1000 karakter"
            error={errors?.manfaat_karya} maxLen={1000} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <FInput id="nomor_surat" label="Nomor Surat Keterangan" required
              placeholder="Contoh: 001/UKDW/2024"
              value={data.nomor_surat} onChange={(e) => onChange("nomor_surat", e.target.value)}
              onBlur={() => onBlur("nomor_surat")}
              hint="Sesuai nomor pada surat keterangan resmi"
              error={errors?.nomor_surat} />
            <FInput id="tanggal_surat" label="Tanggal Surat Keterangan" required
              type="datetime-local"
              value={data.tanggal_surat} onChange={(e) => onChange("tanggal_surat", e.target.value)}
              onBlur={() => onBlur("tanggal_surat")}
              error={errors?.tanggal_surat} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 4B — Detail Lomba Mandiri
// ─────────────────────────────────────────────────────────────────────────────
function Step4Lomba({ data, onChange, onBlur, onFileChange, files, errors }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
        <FSelect id="kategori_kegiatan" label="Kategori Kegiatan" required
          value={data.kategori_kegiatan} onChange={(e) => onChange("kategori_kegiatan", e.target.value)}
          onBlur={() => onBlur("kategori_kegiatan")}
          error={errors?.kategori_kegiatan}>
          <option value="">Pilih kategori</option>
          <option>Provinsi / Wilayah</option>
          <option>Nasional</option>
          <option>Internasional</option>
        </FSelect>

        <FSelect id="model_pelaksanaan" label="Model Pelaksanaan" required
          value={data.model_pelaksanaan} onChange={(e) => onChange("model_pelaksanaan", e.target.value)}
          onBlur={() => onBlur("model_pelaksanaan")}
          error={errors?.model_pelaksanaan}>
          <option value="">Pilih model</option>
          <option>Online</option>
          <option>Offline</option>
        </FSelect>
      </div>

      <FRadio
        label="Jenis Kepesertaan"
        name="jenis_kepesertaan"
        required
        options={[{ value: "individu", label: "Individu" }, { value: "kelompok", label: "Kelompok" }]}
        value={data.jenis_kepesertaan}
        onChange={(v) => onChange("jenis_kepesertaan", v)}
        error={errors?.jenis_kepesertaan}
      />

      <FInput id="nama_kegiatan" label="Nama Kegiatan / Lomba" required
        placeholder="Nama lomba atau kompetisi"
        value={data.nama_kegiatan} onChange={(e) => onChange("nama_kegiatan", e.target.value)}
        onBlur={() => onBlur("nama_kegiatan")}
        hint="5–200 karakter" error={errors?.nama_kegiatan} maxLength={200} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
        <FInput id="jumlah_peserta" label="Jumlah Peserta Keseluruhan" required
          type="number" min="2" placeholder="Contoh: 50"
          value={data.jumlah_peserta} onChange={(e) => onChange("jumlah_peserta", e.target.value)}
          onBlur={() => onBlur("jumlah_peserta")}
          hint="Minimal 2 peserta (kompetisi minimal 2 orang)"
          error={errors?.jumlah_peserta} />

        <FSelect id="tahun_kegiatan" label="Tahun Kegiatan" required
          value={data.tahun_kegiatan} onChange={(e) => onChange("tahun_kegiatan", e.target.value)}
          onBlur={() => onBlur("tahun_kegiatan")}
          error={errors?.tahun_kegiatan}>
          <option value="">Pilih tahun</option>
          {TAHUN_OPSI.map((t) => <option key={t}>{t}</option>)}
        </FSelect>
      </div>

      <FSelect id="capaian" label="Capaian Peserta" required
        value={data.capaian} onChange={(e) => onChange("capaian", e.target.value)}
        onBlur={() => onBlur("capaian")}
        error={errors?.capaian}>
        <option value="">Pilih capaian</option>
        {CAPAIAN_LOMBA.map((c) => <option key={c}>{c}</option>)}
      </FSelect>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
        <FInput id="tanggal_mulai" label="Tanggal Mulai" required
          type="date"
          max={(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })()}
          value={data.tanggal_mulai} onChange={(e) => onChange("tanggal_mulai", e.target.value)}
          onBlur={() => onBlur("tanggal_mulai")}
          hint="Tidak boleh di masa depan, maks. 12 bulan yang lalu (SK Rektor)"
          error={errors?.tanggal_mulai} />

        <FInput id="tanggal_selesai" label="Tanggal Selesai" required
          type="date"
          min={data.tanggal_mulai || undefined}
          max={(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })()}
          value={data.tanggal_selesai} onChange={(e) => onChange("tanggal_selesai", e.target.value)}
          onBlur={() => onBlur("tanggal_selesai")}
          hint="Harus sama atau setelah tanggal mulai"
          error={errors?.tanggal_selesai} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
        <FFile id="dokumen_sertifikat" label="Dokumen Sertifikat" required
          onChange={(e) => onFileChange("dokumen_sertifikat", e.target.files[0])}
          currentFile={files?.dokumen_sertifikat} error={errors?.dokumen_sertifikat} />
        <FFile id="foto_penyerahan" label="Foto Penyerahan Sertifikat" required
          onChange={(e) => onFileChange("foto_penyerahan", e.target.files[0])}
          currentFile={files?.foto_penyerahan} error={errors?.foto_penyerahan} />
      </div>

      <FInput id="url_penyelenggara" label="URL Website Penyelenggara" required
        type="url" placeholder="https://contoh.ac.id/lomba"
        value={data.url_penyelenggara} onChange={(e) => onChange("url_penyelenggara", e.target.value)}
        onBlur={() => onBlur("url_penyelenggara")}
        hint="Harus diawali https:// atau http://" error={errors?.url_penyelenggara} />

      <FFile id="dokumen_lainnya" label="Dokumen Pendukung Lainnya" required
        onChange={(e) => onFileChange("dokumen_lainnya", e.target.files[0])}
        currentFile={files?.dokumen_lainnya}
        hint="Surat tugas, LoA, atau bukti partisipasi"
        error={errors?.dokumen_lainnya} />

      <FTextarea id="keterangan" label="Keterangan (opsional)"
        placeholder="Informasi tambahan jika diperlukan..."
        value={data.keterangan} onChange={(e) => onChange("keterangan", e.target.value)}
        maxLen={500} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 5 — Data Kelompok
// ─────────────────────────────────────────────────────────────────────────────
function Step5({ data, onChange, onBlur, errors }) {
  const jumlah = parseInt(data.jumlah_anggota) || 0;

  const updateAnggota = (idx, field, value) => {
    const arr = [...(data.anggota || [])];
    if (!arr[idx]) arr[idx] = { nama: "", nim: "" };
    arr[idx] = { ...arr[idx], [field]: value };
    onChange("anggota", arr);
  };

  const anggotaFields = jumlah > 1 ? Array.from({ length: jumlah - 1 }, (_, i) => i) : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ background: "#f6fdf8", border: "1px solid #c2e8d0", borderRadius: "8px", padding: "10px 14px", fontSize: "12px", color: "#1a7a4a" }}>
        Isi NIM dan nama seluruh anggota kelompok. Pastikan sesuai data PDDikti — akan diverifikasi saat pengecekan.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
        <FInput id="jumlah_anggota" label="Jumlah Anggota (termasuk ketua)" required
          type="number" min="2" max="50" placeholder="Minimal 2"
          value={data.jumlah_anggota} onChange={(e) => onChange("jumlah_anggota", e.target.value)}
          onBlur={() => onBlur("jumlah_anggota")}
          hint="Angka bulat, minimal 2, maksimal 50"
          error={errors?.jumlah_anggota} />

        <FInput id="nama_ketua" label="Nama Ketua" required
          placeholder="Nama lengkap ketua tim"
          value={data.nama_ketua} onChange={(e) => onChange("nama_ketua", e.target.value)}
          onBlur={() => onBlur("nama_ketua")}
          hint="Minimal 3 karakter" error={errors?.nama_ketua} maxLength={100} />
      </div>

      <FInput id="peran_pengeclaim" label="Peran Anda dalam Kelompok" required
        placeholder="Contoh: Ketua, Anggota, Lead Developer, Designer"
        value={data.peran_pengeclaim} onChange={(e) => onChange("peran_pengeclaim", e.target.value)}
        onBlur={() => onBlur("peran_pengeclaim")}
        hint="Deskripsikan kontribusi Anda"
        error={errors?.peran_pengeclaim} maxLength={50} />

      {anggotaFields.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <p style={{ fontSize: "12px", fontWeight: 600, color: T.labelCol }}>Data Anggota Lainnya</p>
          {anggotaFields.map((i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", padding: "12px", background: "#f8f6f1", borderRadius: "8px", border: `1px solid ${T.border}` }}>
              <FInput id={`anggota_${i}_nama`} label={`Nama Lengkap Anggota ${i + 2}`} required
                placeholder="Nama lengkap"
                value={data.anggota?.[i]?.nama ?? ""}
                onChange={(e) => updateAnggota(i, "nama", e.target.value)}
                onBlur={() => onBlur(`anggota_${i}_nama`)}
                hint="Minimal 3 karakter"
                error={errors?.[`anggota_${i}_nama`]}
                maxLength={100} />
              <FInput id={`anggota_${i}_nim`} label={`NIM Anggota ${i + 2}`} required
                placeholder="12345678"
                value={data.anggota?.[i]?.nim ?? ""}
                onChange={(e) => updateAnggota(i, "nim", e.target.value.replace(/\D/g, ""))}
                onBlur={() => onBlur(`anggota_${i}_nim`)}
                hint="Tepat 8 digit angka (format NIM UKDW)"
                error={errors?.[`anggota_${i}_nim`]}
                maxLength={8} inputMode="numeric" />
            </div>
          ))}
        </div>
      )}

      <FTextarea id="keterangan_kelompok" label="Keterangan Tambahan (opsional)"
        placeholder="Informasi tambahan tentang kelompok jika diperlukan..."
        value={data.keterangan_kelompok} onChange={(e) => onChange("keterangan_kelompok", e.target.value)}
        maxLen={300} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 6 — Konfirmasi & Persetujuan
// ─────────────────────────────────────────────────────────────────────────────
function Step6({ data, onChange, nimInfo, errors }) {
  const rows = [
    ["Nama",        data.nama_lengkap],
    ["NIM",         nimInfo?.nim ?? "-"],
    ["Email",       data.email],
    ["Nomor WA",    data.nomor_wa],
    ["Kategori",    data.kategori_simkatmawa === "lomba_mandiri" ? "Lomba Mandiri" : "Rekognisi Non-Lomba"],
    ["Kegiatan",    data.nama_kegiatan],
    ["Kepesertaan", data.jenis_kepesertaan],
    ["Capaian / Tingkatan", data.capaian || data.tingkatan],
    data.kategori_simkatmawa === "lomba_mandiri"
      ? ["Tanggal", `${data.tanggal_mulai} s/d ${data.tanggal_selesai}`]
      : ["Tahun",   data.tahun_kegiatan],
  ].filter(([, v]) => v);

  const hasil = hitungReward(data);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <p style={{ fontSize: "12px", fontWeight: 700, color: T.labelCol, marginBottom: "8px" }}>Ringkasan Pengajuan</p>
        <div style={{ background: "#f8f6f1", border: `1px solid ${T.border}`, borderRadius: "8px", overflow: "hidden" }}>
          {rows.map(([k, v]) => (
            <div key={k} style={{ display: "flex", padding: "9px 14px", borderBottom: `1px solid ${T.border}`, gap: "12px" }}>
              <span style={{ fontSize: "12px", color: T.hintText, width: "140px", flexShrink: 0 }}>{k}</span>
              <span style={{ fontSize: "12px", color: "#1c1a17", fontWeight: 500 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {hasil ? (
        <div style={{ background: "#fdf8ed", border: "1px solid #f0d99a", borderRadius: "10px", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "#8c6200" }}>Estimasi Dana Penghargaan</p>
            <p style={{ fontSize: "11px", color: "#b5900a", marginTop: "2px" }}>{hasil.poin} poin × Rp 225.000 · SK Rektor 078/2023 · Non PUSPRESNAS</p>
          </div>
          <p style={{ fontSize: "22px", fontWeight: 800, color: "#8c6200", fontFamily: "'Syne', sans-serif" }}>{formatRupiah(hasil.total)}</p>
        </div>
      ) : (
        <div style={{ background: "#f8f6f1", border: `1px solid ${T.border}`, borderRadius: "10px", padding: "12px 16px", display: "flex", justifyContent: "space-between" }}>
          <p style={{ fontSize: "12px", color: T.hintText }}>Estimasi dana tidak dapat dihitung otomatis untuk kategori ini</p>
          <p style={{ fontSize: "12px", color: T.hintText }}>—</p>
        </div>
      )}

      <div style={{ background: "#fdf8ed", border: "1px solid #f0d99a", borderRadius: "10px", padding: "14px 16px" }}>
        <p style={{ fontSize: "12px", fontWeight: 700, color: "#8c6200", marginBottom: "8px" }}>Persetujuan Pengajuan</p>
        <p style={{ fontSize: "11px", color: "#8c6200", lineHeight: 1.6, marginBottom: "8px" }}>
          Link pengiriman data rekening akan dibuka setelah perhitungan penghargaan selesai. Jika tidak mengirimkan data rekening hingga batas waktu, pengajuan dinyatakan gugur pada periode tersebut.
        </p>
        <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={data.setuju}
            onChange={(e) => onChange("setuju", e.target.checked)}
            style={{ marginTop: "2px", accentColor: T.accent, width: "15px", height: "15px", flexShrink: 0 }}
          />
          <span style={{ fontSize: "12px", color: "#1c1a17" }}>
            Saya menyatakan bahwa data yang diisi adalah benar dan saya menyetujui ketentuan di atas.
          </span>
        </label>
        <FieldError>{errors?.setuju}</FieldError>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Wizard Utama
// ─────────────────────────────────────────────────────────────────────────────
const INITIAL_DATA = {
  nama_lengkap: "", email: "", nomor_wa: "",
  ada_dospem: "tidak", nidn_dospem: "",
  kategori_simkatmawa: "",
  jenis_kepesertaan: "", kategori_kegiatan: "", nama_kegiatan: "",
  tingkatan: "", tahun_kegiatan: "", url_penyelenggara: "",
  capaian: "", tanggal_mulai: "", tanggal_selesai: "",
  jumlah_peserta: "", model_pelaksanaan: "", keterangan: "",
  nama_lembaga: "", jenis_karya_teks: "", jenis_karya_pilihan: "",
  deskripsi_karya: "", manfaat_karya: "", nomor_surat: "", tanggal_surat: "",
  jumlah_anggota: "", nama_ketua: "", peran_pengeclaim: "",
  anggota: [], keterangan_kelompok: "",
  setuju: false,
};

export default function TambahKlaimWizard({ session, onClose, onSuccess }) {
  const [step,         setStep]         = useState(1);
  const [data,         setData]         = useState({ ...INITIAL_DATA, nama_lengkap: session.user.name ?? "", email: session.user.email ?? "" });
  const [files,        setFiles]        = useState({});
  const [nimInfo,      setNimInfo]      = useState(null);
  const [fieldErrors,  setFieldErrors]  = useState({});
  const [loading,      setLoading]      = useState(false);
  const [periodeCheck, setPeriodeCheck] = useState("loading"); // "loading" | "aktif" | "tutup"

  useEffect(() => {
    Promise.all([
      fetch(`http://127.0.0.1:8000/nim-info?email=${encodeURIComponent(session.user.email)}`),
      fetch(`http://127.0.0.1:8000/periode/aktif`),
    ]).then(async ([nimRes, periodeRes]) => {
      nimRes.ok && setNimInfo(await nimRes.json());
      const p = periodeRes.ok ? await periodeRes.json() : { aktif: false };
      setPeriodeCheck(p.aktif ? "aktif" : "tutup");
    }).catch(() => setPeriodeCheck("tutup"));
  }, []);

  const onChange = (key, value) => {
    if (key === "kategori_simkatmawa") {
      setFiles((prev) => ({ ...prev, dokumen_sertifikat: undefined, foto_penyerahan: undefined, dokumen_lainnya: undefined }));
      setData((prev) => ({
        ...prev, kategori_simkatmawa: value,
        jenis_kepesertaan: "", kategori_kegiatan: "", nama_kegiatan: "",
        tingkatan: "", tahun_kegiatan: "", url_penyelenggara: "",
        capaian: "", tanggal_mulai: "", tanggal_selesai: "",
        jumlah_peserta: "", model_pelaksanaan: "", keterangan: "",
        nama_lembaga: "", jenis_karya_teks: "", jenis_karya_pilihan: "",
        deskripsi_karya: "", manfaat_karya: "", nomor_surat: "", tanggal_surat: "",
      }));
      setFieldErrors({});
      return;
    }
    setData((prev) => ({ ...prev, [key]: value }));
    // clear error for this field on change
    if (fieldErrors[key]) setFieldErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
  };

  const onFileChange = (key, file) => {
    setFiles((prev) => ({ ...prev, [key]: file }));
    if (fieldErrors[key]) setFieldErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
  };

  const showKelompok = data.jenis_kepesertaan === "kelompok";
  const stepLabels   = ["Data Diri", "Dosen Pembimbing", "Kategori", "Detail", ...(showKelompok ? ["Kelompok"] : []), "Konfirmasi"];
  const totalSteps   = stepLabels.length;
  const getStepLabel = () => stepLabels[step - 1] ?? "";
  const isLastStep   = step === totalSteps;

  const handleNext = () => {
    const errs = validateStep(step, data, files, showKelompok, totalSteps);
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    if (step < totalSteps) setStep((s) => s + 1);
  };

  const handleBack = () => {
    setFieldErrors({});
    if (step > 1) setStep((s) => s - 1);
  };

  const handleBlur = (fieldKey) => {
    const errs = validateStep(step, data, files, showKelompok, totalSteps);
    if (errs[fieldKey] !== undefined) {
      setFieldErrors((prev) => ({ ...prev, [fieldKey]: errs[fieldKey] }));
    }
  };

  const handleSubmit = async () => {
    const errs = validateStep(step, data, files, showKelompok, totalSteps);
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }
    if (!files.dokumen_sertifikat) { setFieldErrors({ dokumen_sertifikat: "Dokumen sertifikat belum diunggah." }); return; }

    setLoading(true);
    const isLomba = data.kategori_simkatmawa === "lomba_mandiri";

    try {
      const uploadPayload = new FormData();
      uploadPayload.append("nama_lomba",      data.nama_kegiatan);
      uploadPayload.append("tingkat",         isLomba ? data.kategori_kegiatan : data.tingkatan);
      uploadPayload.append("tanggal",         isLomba ? data.tanggal_selesai   : data.tahun_kegiatan);
      uploadPayload.append("peringkat",       isLomba ? data.capaian           : data.kategori_kegiatan);
      uploadPayload.append("mahasiswa_email", session.user.email);
      uploadPayload.append("nama_display",    session.user.name ?? session.user.email);
      uploadPayload.append("file",            files.dokumen_sertifikat);

      const uploadRes  = await fetch("http://127.0.0.1:8000/upload", { method: "POST", body: uploadPayload });
      if (!uploadRes.ok) throw new Error("Upload sertifikat gagal");
      const uploadData = await uploadRes.json();
      const claimId    = uploadData.id ?? null;

      const pengajuanPayload = new FormData();
      const ap = (k, v) => { if (v !== undefined && v !== null && v !== "") pengajuanPayload.append(k, v); };
      ap("mahasiswa_email",     session.user.email);
      ap("nama_display",        session.user.name ?? session.user.email);
      ap("nomor_wa",            data.nomor_wa);
      ap("ada_dospem",          data.ada_dospem);
      ap("nidn_dospem",         data.nidn_dospem);
      ap("kategori_simkatmawa", data.kategori_simkatmawa);
      ap("jenis_kepesertaan",   data.jenis_kepesertaan);
      ap("nama_kegiatan",       data.nama_kegiatan);
      ap("kategori_kegiatan",   data.kategori_kegiatan);
      ap("tingkatan",           data.tingkatan);
      ap("tahun_kegiatan",      data.tahun_kegiatan);
      ap("model_pelaksanaan",   data.model_pelaksanaan);
      ap("jumlah_peserta",      data.jumlah_peserta);
      ap("capaian",             data.capaian);
      ap("tanggal_mulai",       data.tanggal_mulai);
      ap("tanggal_selesai",     data.tanggal_selesai);
      ap("url_penyelenggara",   data.url_penyelenggara);
      ap("keterangan",          data.keterangan);
      ap("nama_lembaga",        data.nama_lembaga);
      ap("jenis_karya_teks",    data.jenis_karya_teks);
      ap("jenis_karya_pilihan", data.jenis_karya_pilihan);
      ap("deskripsi_karya",     data.deskripsi_karya);
      ap("manfaat_karya",       data.manfaat_karya);
      ap("nomor_surat",         data.nomor_surat);
      ap("tanggal_surat",       data.tanggal_surat);
      ap("nama_ketua",          data.nama_ketua);
      ap("peran_pengeclaim",    data.peran_pengeclaim);
      ap("keterangan_kelompok", data.keterangan_kelompok);
      pengajuanPayload.append("setuju", String(data.setuju));
      if (claimId) pengajuanPayload.append("claim_id", String(claimId));
      const rewardHasil = hitungReward(data);
      if (rewardHasil) pengajuanPayload.append("estimasi_reward", String(rewardHasil.total));
      if (data.jenis_kepesertaan === "kelompok" && data.anggota?.length > 0)
        pengajuanPayload.append("anggota_json", JSON.stringify(data.anggota));
      if (files.surat_tugas_dospem) pengajuanPayload.append("surat_tugas",       files.surat_tugas_dospem);
      if (files.foto_penyerahan)    pengajuanPayload.append("foto_penyerahan",   files.foto_penyerahan);
      if (files.dokumen_lainnya)    pengajuanPayload.append("dokumen_lainnya",   files.dokumen_lainnya);
      pengajuanPayload.append("dokumen_sertifikat", files.dokumen_sertifikat);

      const pengajuanRes = await fetch("http://127.0.0.1:8000/pengajuan", { method: "POST", body: pengajuanPayload });
      if (!pengajuanRes.ok) throw new Error("Simpan pengajuan gagal");

      onSuccess?.();
      onClose();
    } catch (err) {
      setFieldErrors({ _submit: `Gagal mengirim pengajuan: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const firstError = Object.values(fieldErrors)[0];

  // ── Guard: periode belum dimuat atau ditutup ──────────────────────────────
  if (periodeCheck === "loading") return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.45)", padding: "16px" }}>
      <div style={{ background: "#fff", borderRadius: "14px", width: "100%", maxWidth: "480px", padding: "48px 32px", textAlign: "center", boxShadow: "0 24px 48px rgba(0,0,0,0.18)" }}>
        <p style={{ fontSize: "13px", color: "#9ca3af" }}>Memeriksa periode klaim...</p>
      </div>
    </div>
  );

  if (periodeCheck === "tutup") return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.45)", padding: "16px" }}>
      <div style={{ background: "#fff", borderRadius: "14px", width: "100%", maxWidth: "440px", padding: "48px 32px", textAlign: "center", boxShadow: "0 24px 48px rgba(0,0,0,0.18)", fontFamily: "'Plus Jakarta Sans', var(--font-poppins, sans-serif)" }}>
        <div style={{ width: "56px", height: "56px", background: "#f3f4f6", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <svg width="26" height="26" fill="none" stroke="#9ca3af" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#111827", marginBottom: "8px" }}>Periode Klaim Ditutup</h2>
        <p style={{ fontSize: "13px", color: "#6b7280", lineHeight: 1.6, marginBottom: "28px" }}>
          Saat ini tidak ada periode klaim yang sedang dibuka.<br />
          Silakan hubungi pengelola atau coba lagi nanti.
        </p>
        <button onClick={onClose} style={{ padding: "10px 24px", background: "#111827", color: "#fff", border: "none", borderRadius: "10px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
          Tutup
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.45)", padding: "16px" }}>
      <div style={{ background: "#fff", borderRadius: "14px", width: "100%", maxWidth: "640px", maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 48px rgba(0,0,0,0.18)", fontFamily: "'Plus Jakarta Sans', var(--font-poppins, sans-serif)" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#1c1a17" }}>Pengajuan Klaim Prestasi</h2>
            <p style={{ fontSize: "11px", color: T.hintText, marginTop: "2px" }}>Langkah {step} dari {totalSteps} — {getStepLabel()}</p>
          </div>
          <button onClick={onClose} style={{ width: "28px", height: "28px", borderRadius: "6px", background: "#f8f6f1", border: "none", cursor: "pointer", fontSize: "16px", color: T.hintText, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        {/* Progress */}
        <div style={{ padding: "20px 24px 0", flexShrink: 0 }}>
          <ProgressBar steps={stepLabels} current={step} />
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 24px 16px" }}>
          {step === 1 && <Step1 data={data} onChange={onChange} onBlur={handleBlur} nimInfo={nimInfo} errors={fieldErrors} />}
          {step === 2 && <Step2 data={data} onChange={onChange} onBlur={handleBlur} onFileChange={onFileChange} files={files} errors={fieldErrors} />}
          {step === 3 && <Step3 data={data} onChange={onChange} errors={fieldErrors} />}
          {step === 4 && data.kategori_simkatmawa === "rekognisi"     && <Step4Rekognisi data={data} onChange={onChange} onBlur={handleBlur} onFileChange={onFileChange} files={files} errors={fieldErrors} />}
          {step === 4 && data.kategori_simkatmawa === "lomba_mandiri" && <Step4Lomba     data={data} onChange={onChange} onBlur={handleBlur} onFileChange={onFileChange} files={files} errors={fieldErrors} />}
          {step === 5 && showKelompok && <Step5 data={data} onChange={onChange} onBlur={handleBlur} errors={fieldErrors} />}
          {isLastStep && <Step6 data={data} onChange={onChange} nimInfo={nimInfo} errors={fieldErrors} />}
        </div>

        {/* Error banner */}
        {firstError && firstError !== fieldErrors._submit && (
          <div style={{ margin: "0 24px 8px", padding: "10px 14px", background: T.errBg, border: `1px solid ${T.errBor}`, borderRadius: "8px", fontSize: "12px", color: T.errText, flexShrink: 0 }}>
            ⚠ Mohon perbaiki field yang ditandai sebelum melanjutkan.
          </div>
        )}
        {fieldErrors._submit && (
          <div style={{ margin: "0 24px 8px", padding: "10px 14px", background: T.errBg, border: `1px solid ${T.errBor}`, borderRadius: "8px", fontSize: "12px", color: T.errText, flexShrink: 0 }}>
            {fieldErrors._submit}
          </div>
        )}

        {/* Footer */}
        <div style={{ padding: "14px 24px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", flexShrink: 0 }}>
          <button
            type="button"
            onClick={step === 1 ? onClose : handleBack}
            style={{ padding: "9px 18px", fontSize: "13px", color: "#7a756e", background: "#f8f6f1", border: `1px solid ${T.border}`, borderRadius: "8px", cursor: "pointer", fontFamily: "inherit", transition: "background 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.background = "#f0ece4"}
            onMouseLeave={e => e.currentTarget.style.background = "#f8f6f1"}
          >
            {step === 1 ? "Batal" : "← Sebelumnya"}
          </button>

          {isLastStep ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              style={{ padding: "9px 24px", fontSize: "13px", fontWeight: 600, color: "#fff", background: loading ? "#c8c3bc" : "#1c1a17", border: "none", borderRadius: "8px", cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "background 0.15s" }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = T.accent; }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = "#1c1a17"; }}
            >
              {loading ? "Mengirim..." : "Kirim Pengajuan"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              style={{ padding: "9px 24px", fontSize: "13px", fontWeight: 600, color: "#fff", background: "#1c1a17", border: "none", borderRadius: "8px", cursor: "pointer", fontFamily: "inherit", transition: "background 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = T.accent}
              onMouseLeave={e => e.currentTarget.style.background = "#1c1a17"}
            >
              Selanjutnya →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
