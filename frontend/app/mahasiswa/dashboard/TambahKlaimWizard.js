"use client";

import { useState, useEffect, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Konstanta
// ─────────────────────────────────────────────────────────────────────────────
const TAHUN_INI  = new Date().getFullYear();
const TAHUN_OPSI = [String(TAHUN_INI), String(TAHUN_INI - 1)];

const PENGALI_REWARD = 225_000;

// ── Tabel Poin SK Rektor 078/B.02/UKDW/2023 ──────────────────────────────────
// Kolom: peserta, didanai (lolos wil.), final, juara3, juara2, juara1
// Poin bersifat KUMULATIF: Juara 1 = juara1 + final + didanai + peserta
const TABEL_PUSPRESNAS = { peserta: 0.5, didanai: 3, final: 6, juara3: 12, juara2: 15, juara1: 18 };

const TABEL_NON_PUSPRESNAS = {
  "Provinsi / Wilayah": { peserta: 0.5, didanai: 1,  final: 2,  juara3: 4,  juara2: 5,  juara1: 6  },
  "Nasional":           { peserta: 0.5, didanai: 2,  final: 4,  juara3: 8,  juara2: 10, juara1: 12 },
  "Internasional":      { peserta: 0.5, didanai: 3,  final: 6,  juara3: 12, juara2: 15, juara1: 18 },
};

// Mengembalikan { poinAtas, rincian: [...], totalPoin } berdasarkan capaian
function capaianKePoin(capaian, tabel) {
  if (!capaian || !tabel) return null;

  // Tentukan level capaian
  let level = null;
  if (capaian.includes("Juara 1"))                                     level = "juara1";
  else if (capaian.includes("Juara 2"))                                level = "juara2";
  else if (capaian.includes("Juara 3"))                                level = "juara3";
  else if (capaian.startsWith("Harapan") || capaian.includes("Finalis") || capaian.includes("Final") || capaian.includes("Apresiasi")) level = "final";
  else if (capaian.includes("Didanai") || capaian.includes("Lolos")) level = "didanai";
  else if (capaian.includes("Peserta") || capaian.includes("Proposal") || capaian.includes("Partisipasi")) level = "peserta";
  if (!level) return null;

  // Tahapan kumulatif (dari bawah ke atas)
  const tahapan = [
    { key: "peserta", label: "Peserta/Proposal" },
    { key: "didanai", label: "Didanai/Lolos Wil." },
    { key: "final",   label: "Final" },
  ];
  // Juara ditambahkan HANYA level juara yang dicapai (tidak kumulatif antar juara)
  const juaraMap = {
    juara3: { key: "juara3", label: "Juara 3" },
    juara2: { key: "juara2", label: "Juara 2" },
    juara1: { key: "juara1", label: "Juara 1" },
  };

  const rincian = [];
  let totalPoin = 0;

  // Selalu tambahkan peserta
  rincian.push({ label: tahapan[0].label, poin: tabel.peserta });
  totalPoin += tabel.peserta;

  if (level === "peserta") return { totalPoin, rincian };

  // Didanai
  rincian.push({ label: tahapan[1].label, poin: tabel.didanai });
  totalPoin += tabel.didanai;
  if (level === "didanai") return { totalPoin, rincian };

  // Final
  rincian.push({ label: tahapan[2].label, poin: tabel.final });
  totalPoin += tabel.final;
  if (level === "final") return { totalPoin, rincian };

  // Juara (hanya 1 level juara yang dicapai)
  const juaraInfo = juaraMap[level];
  rincian.push({ label: juaraInfo.label, poin: tabel[level] });
  totalPoin += tabel[level];

  return { totalPoin, rincian };
}

function hitungReward(data) {
  const { kategori_simkatmawa, kategori_kegiatan, capaian, jenis_kepesertaan, jumlah_anggota } = data;
  if (!isLombaMandiri(kategori_simkatmawa)) return null;
  const tabel = kategori_simkatmawa === "lomba_mandiri_puspresnas"
    ? TABEL_PUSPRESNAS
    : TABEL_NON_PUSPRESNAS[kategori_kegiatan];
  const hasil = capaianKePoin(capaian, tabel);
  if (!hasil) return null;
  const n = Math.max(1, parseInt(jumlah_anggota) || 1);
  const bonusFactor = jenis_kepesertaan === "kelompok"
    ? (n > 10 ? 1.5 : n >= 6 ? 1.25 : 1) : 1;
  return {
    poinDasar:  hasil.totalPoin,
    rincian:    hasil.rincian,
    bonusFactor,
    jumlah:     n,
    isKelompok: jenis_kepesertaan === "kelompok",
    total:      Math.round(hasil.totalPoin * bonusFactor * PENGALI_REWARD),
  };
}

function formatRupiah(n) {
  return "Rp " + n.toLocaleString("id-ID");
}

const KOMPETISI_PUSPRESNAS = [
  "PKM", "PPK ORMAWA", "P2MW", "NUDC", "KDMI",
  "ONMIPA", "KBMK", "GEMASTIK", "PILMAPRES",
];

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
  "Didanai / Lolos Wilayah",
  "Apresiasi kejuaraan / Penghargaan tambahan / Juara umum",
  "Partisipasi / Delegasi / Peserta kejuaraan",
];

const isLombaMandiri = (kat) =>
  kat === "lomba_mandiri_puspresnas" || kat === "lomba_mandiri_non_puspresnas";

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

    if (isLombaMandiri(data.kategori_simkatmawa)) {
      if (data.kategori_simkatmawa === "lomba_mandiri_puspresnas" && !data.kompetisi_puspresnas)
        e.kompetisi_puspresnas = "Jenis kompetisi PUSPRESNAS wajib dipilih.";
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
      if (!data.tingkatan)       e.tingkatan = "Tingkatan kegiatan wajib dipilih.";
      if (!data.tanggal_mulai)   e.tanggal_mulai = "Tanggal mulai wajib diisi.";
      if (!data.tanggal_selesai) e.tanggal_selesai = "Tanggal selesai wajib diisi.";
      else if (data.tanggal_mulai && data.tanggal_selesai < data.tanggal_mulai)
        e.tanggal_selesai = "Tanggal selesai harus sama atau setelah tanggal mulai.";

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
  accent:  "#046137",
  errBg:   "#fff5f5",
  errBor:  "#f5c0c0",
  errText: "#b72b2b",
  hintText:"#9a9490",
  labelCol:"#4a4540",
  inputBg: "#fdfcfa",
  focusRing:"0 0 0 2px rgba(4,97,55,0.25)",
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
  backgroundColor: hasError ? T.errBg : T.inputBg,
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
              background: done ? T.accent : active ? T.accent : "#f2efe8",
              color: done || active ? "#fff" : T.hintText,
              border: `2px solid ${done ? T.accent : active ? T.accent : T.border}`,
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
function Step1({ data, onChange, onBlur, nimInfo, errors, profil }) {
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
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="nomor_wa" className="block text-sm font-semibold text-gray-700">
              Nomor WhatsApp <span className="text-red-500">*</span>
            </label>
            {profil?.nomor_wa && (() => {
              const active = data.nomor_wa === profil.nomor_wa;
              return (
                <button type="button" onClick={() => onChange("nomor_wa", active ? "" : profil.nomor_wa)}
                  className="flex items-center gap-2 group">
                  <span className="text-[11px] text-gray-400 group-hover:text-gray-600 transition-colors">Isi Dari Profil</span>
                  <span className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 cursor-pointer ${active ? "bg-[#046137]" : "bg-gray-200"}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${active ? "translate-x-4" : "translate-x-0"}`} />
                  </span>
                </button>
              );
            })()}
          </div>
          <FInput
            id="nomor_wa"
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
  const kat = data.kategori_simkatmawa;
  const isLomba = isLombaMandiri(kat);

  const cardStyle = (active) => ({
    textAlign: "left",
    padding: "16px",
    borderRadius: "10px",
    border: `2px solid ${active ? T.accent : T.border}`,
    background: active ? "rgba(4,97,55,0.05)" : "#fff",
    cursor: "pointer",
    transition: "border-color 0.15s, background 0.15s",
    width: "100%",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <p style={{ fontSize: "13px", color: "#7a756e" }}>Pilih kategori kegiatan yang sesuai dengan prestasi yang ingin diklaim.</p>

      {/* Rekognisi */}
      <button type="button" onClick={() => onChange("kategori_simkatmawa", "rekognisi")} style={cardStyle(kat === "rekognisi")}>
        <div style={{ fontSize: "22px", marginBottom: "8px" }}>🎖️</div>
        <p style={{ fontWeight: 600, fontSize: "13px", color: kat === "rekognisi" ? T.accent : "#1c1a17", marginBottom: "4px" }}>Rekognisi (Non-Lomba)</p>
        <p style={{ fontSize: "11px", color: "#7a756e", lineHeight: 1.5 }}>Prestasi non kompetisi yang diraih oleh mahasiswa, diberikan oleh pemerintah, komunitas, organisasi, atau masyarakat.</p>
      </button>

      {/* Lomba Mandiri group */}
      <div style={{ border: `2px solid ${isLomba ? T.accent : T.border}`, borderRadius: "12px", overflow: "hidden", transition: "border-color 0.15s" }}>
        <div style={{ padding: "12px 16px", background: isLomba ? "rgba(4,97,55,0.05)" : "#fafaf9", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "20px" }}>🏆</span>
          <div>
            <p style={{ fontWeight: 700, fontSize: "13px", color: isLomba ? T.accent : "#1c1a17" }}>Lomba Mandiri</p>
            <p style={{ fontSize: "11px", color: "#7a756e" }}>Kegiatan kejuaraan yang diselenggarakan secara mandiri oleh perguruan tinggi, minimal 2 kali berturut-turut.</p>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0" }}>
          {[
            { value: "lomba_mandiri_puspresnas",     label: "Puspresnas (DIKTI)",     desc: "Kompetisi yang terdaftar dalam sistem PUSPRESNAS / DIKTI." },
            { value: "lomba_mandiri_non_puspresnas", label: "Non Puspresnas (Non DIKTI)", desc: "Kompetisi mandiri perguruan tinggi di luar sistem PUSPRESNAS." },
          ].map((opt, i) => {
            const active = kat === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange("kategori_simkatmawa", opt.value)}
                style={{
                  textAlign: "left",
                  padding: "14px 16px",
                  background: active ? "rgba(4,97,55,0.08)" : "#fff",
                  border: "none",
                  borderLeft: i === 1 ? `1px solid ${T.border}` : "none",
                  cursor: "pointer",
                  transition: "background 0.15s",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{
                    width: "14px", height: "14px", borderRadius: "50%", flexShrink: 0,
                    border: `2px solid ${active ? T.accent : T.border}`,
                    background: active ? T.accent : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {active && <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#fff" }} />}
                  </div>
                  <p style={{ fontWeight: 600, fontSize: "12px", color: active ? T.accent : "#1c1a17" }}>{opt.label}</p>
                </div>
                <p style={{ fontSize: "11px", color: "#9a9490", lineHeight: 1.4, paddingLeft: "22px" }}>{opt.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      <FieldError>{errors?.kategori_simkatmawa}</FieldError>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 4A — Detail Rekognisi
// ─────────────────────────────────────────────────────────────────────────────
function Step4Rekognisi({ data, onChange, onBlur, onFileChange, files, errors, periodeTanggalSelesai }) {
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

      <FSelect id="tingkatan" label="Tingkatan Kegiatan" required
        value={data.tingkatan} onChange={(e) => onChange("tingkatan", e.target.value)}
        onBlur={() => onBlur("tingkatan")}
        error={errors?.tingkatan}>
        <option value="">Pilih tingkatan</option>
        <option>Internasional</option>
        <option>Nasional</option>
        <option>Provinsi</option>
      </FSelect>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
        <FInput id="tanggal_mulai_rek" label="Tanggal Mulai" required
          type="date"
          max={periodeTanggalSelesai || undefined}
          value={data.tanggal_mulai} onChange={(e) => onChange("tanggal_mulai", e.target.value)}
          onBlur={() => onBlur("tanggal_mulai")}
          error={errors?.tanggal_mulai} />
        <FInput id="tanggal_selesai_rek" label="Tanggal Selesai" required
          type="date"
          min={data.tanggal_mulai || undefined}
          max={periodeTanggalSelesai || undefined}
          value={data.tanggal_selesai} onChange={(e) => onChange("tanggal_selesai", e.target.value)}
          onBlur={() => onBlur("tanggal_selesai")}
          error={errors?.tanggal_selesai} />
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
  const isPuspresnas = data.kategori_simkatmawa === "lomba_mandiri_puspresnas";
  const tabel = isPuspresnas
    ? TABEL_PUSPRESNAS
    : TABEL_NON_PUSPRESNAS[data.kategori_kegiatan];
  const preview = (data.capaian && (isPuspresnas || data.kategori_kegiatan))
    ? capaianKePoin(data.capaian, tabel)
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {isPuspresnas && (
        <FSelect id="kompetisi_puspresnas" label="Jenis Kompetisi PUSPRESNAS" required
          value={data.kompetisi_puspresnas} onChange={(e) => onChange("kompetisi_puspresnas", e.target.value)}
          onBlur={() => onBlur("kompetisi_puspresnas")}
          error={errors?.kompetisi_puspresnas}>
          <option value="">Pilih kompetisi</option>
          {KOMPETISI_PUSPRESNAS.map(k => <option key={k}>{k}</option>)}
        </FSelect>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
        <FSelect id="kategori_kegiatan" label="Kategori Kegiatan (Tingkat)" required
          value={data.kategori_kegiatan} onChange={(e) => onChange("kategori_kegiatan", e.target.value)}
          onBlur={() => onBlur("kategori_kegiatan")}
          error={errors?.kategori_kegiatan}>
          <option value="">Pilih kategori</option>
          <option>Provinsi / Wilayah</option>
          <option>Nasional</option>
          {!isPuspresnas && <option>Internasional</option>}
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

      {/* ── Live Estimasi Poin ── */}
      {preview ? (
        <div style={{ background: "#fdf8ed", border: "1px solid #f0d99a", borderRadius: "10px", padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <p style={{ fontSize: "12px", fontWeight: 700, color: "#8c6200" }}>Estimasi Poin · {isPuspresnas ? "Puspresnas (DIKTI)" : data.kategori_kegiatan}</p>
            <p style={{ fontSize: "18px", fontWeight: 800, color: "#8c6200" }}>
              {preview.totalPoin} poin
              <span style={{ fontSize: "11px", fontWeight: 500, marginLeft: "6px" }}>
                = {formatRupiah(Math.round(preview.totalPoin * PENGALI_REWARD))}
              </span>
            </p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", alignItems: "center" }}>
            {preview.rincian.map((r, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                {i > 0 && <span style={{ fontSize: "11px", color: "#b5900a", fontWeight: 700 }}>+</span>}
                <span style={{ fontSize: "12px", background: "rgba(140,98,0,0.1)", color: "#8c6200", fontWeight: 600, padding: "2px 7px", borderRadius: "99px" }}>
                  {r.poin} ({r.label})
                </span>
              </span>
            ))}
            <span style={{ fontSize: "11px", color: "#b5900a", fontWeight: 700, marginLeft: "2px" }}>=</span>
            <span style={{ fontSize: "12px", fontWeight: 800, color: "#8c6200" }}>{preview.totalPoin} poin</span>
          </div>
          <p style={{ fontSize: "10px", color: "#b5900a", marginTop: "6px" }}>Poin kumulatif sesuai SK Rektor 078/B.02/UKDW/2023.</p>
        </div>
      ) : (data.kategori_kegiatan && !data.capaian) ? (
        <div style={{ background: "#f8f6f1", border: "1px solid #e2ddd4", borderRadius: "10px", padding: "10px 14px" }}>
          <p style={{ fontSize: "11px", color: "#9a9490" }}>👆 Pilih capaian untuk melihat estimasi poin secara otomatis.</p>
        </div>
      ) : null}

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

  // jumlah termasuk ketua; ketua sudah ada field nama_ketua terpisah
  const anggotaFields = jumlah > 1 ? Array.from({ length: jumlah - 1 }, (_, i) => i) : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ background: "#f6fdf8", border: "1px solid #c2e8d0", borderRadius: "8px", padding: "10px 14px", fontSize: "12px", color: "#1a7a4a" }}>
        Isi nama ketua di field di atas, lalu isi data anggota lainnya di bawah.
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
    ["Kategori",    data.kategori_simkatmawa === "lomba_mandiri_puspresnas"     ? "Lomba Mandiri — Puspresnas (DIKTI)"
                  : data.kategori_simkatmawa === "lomba_mandiri_non_puspresnas" ? "Lomba Mandiri — Non Puspresnas (Non DIKTI)"
                  : "Rekognisi Non-Lomba"],
    ["Kegiatan",    data.nama_kegiatan],
    ["Kepesertaan", data.jenis_kepesertaan],
    ["Capaian / Tingkatan", data.capaian || data.tingkatan],
    ["Tanggal", data.tanggal_mulai && data.tanggal_selesai ? `${data.tanggal_mulai} s/d ${data.tanggal_selesai}` : data.tanggal_mulai || data.tahun_kegiatan],
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
        <div style={{ background: "#f0f7f3", border: "1px solid #d4ebe0", borderRadius: "10px", padding: "14px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <div>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "#046137" }}>Estimasi Dana Penghargaan</p>
              <p style={{ fontSize: "11px", color: "#046137", opacity: 0.6, marginTop: "2px" }}>SK Rektor 078/B.02/UKDW/2023 · {data.kategori_simkatmawa === "lomba_mandiri_puspresnas" ? "PUSPRESNAS (DIKTI)" : "Non PUSPRESNAS"}</p>
            </div>
            <p style={{ fontSize: "22px", fontWeight: 800, color: "#046137" }}>{formatRupiah(hasil.total)}</p>
          </div>
          <div style={{ background: "rgba(4,97,55,0.06)", borderRadius: "8px", padding: "10px 12px" }}>
            <p style={{ fontSize: "10px", fontWeight: 700, color: "#046137", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>Rincian Poin Kumulatif</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", alignItems: "center" }}>
              {hasil.rincian.map((r, i) => (
                <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  {i > 0 && <span style={{ fontSize: "12px", color: "#046137", fontWeight: 700 }}>+</span>}
                  <span style={{ fontSize: "12px", color: "#1c1a17", fontWeight: 600 }}>{r.poin}</span>
                  <span style={{ fontSize: "10px", color: "#046137" }}>({r.label})</span>
                </span>
              ))}
              <span style={{ fontSize: "12px", color: "#046137", fontWeight: 700, marginLeft: "4px" }}>=</span>
              <span style={{ fontSize: "13px", color: "#046137", fontWeight: 800 }}>{hasil.poinDasar} poin</span>
            </div>
          </div>
          {hasil.bonusFactor > 1 ? (
            <p style={{ fontSize: "11px", color: "#046137", opacity: 0.7, marginTop: "8px" }}>
              {hasil.poinDasar} poin × Rp 225.000 × {hasil.bonusFactor === 1.5 ? "1,50 (bonus &gt;10 anggota)" : "1,25 (bonus 6–10 anggota)"} = {formatRupiah(hasil.total)}
            </p>
          ) : (
            <p style={{ fontSize: "11px", color: "#046137", opacity: 0.7, marginTop: "8px" }}>{hasil.poinDasar} poin × Rp 225.000 = {formatRupiah(hasil.total)}</p>
          )}
        </div>
      ) : (
        <div style={{ background: "#f8f6f1", border: `1px solid ${T.border}`, borderRadius: "10px", padding: "12px 16px", display: "flex", justifyContent: "space-between" }}>
          <p style={{ fontSize: "12px", color: T.hintText }}>Estimasi dana tidak dapat dihitung otomatis untuk kategori ini</p>
          <p style={{ fontSize: "12px", color: T.hintText }}>—</p>
        </div>
      )}

      <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: "10px", padding: "14px 16px" }}>
        <p style={{ fontSize: "12px", fontWeight: 700, color: "#92400e", marginBottom: "8px" }}>Persetujuan Pengajuan</p>
        <p style={{ fontSize: "11px", color: "#92400e", opacity: 0.8, lineHeight: 1.6, marginBottom: "8px" }}>
          Data pengajuan rekening dapat di isi setelah pengajuan klaim ini disetujui.
        </p>
        <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={data.setuju}
            onChange={(e) => onChange("setuju", e.target.checked)}
            style={{ marginTop: "2px", accentColor: "#d97706", width: "15px", height: "15px", flexShrink: 0 }}
          />
          <span style={{ fontSize: "12px", color: "#78350f", fontWeight: 500 }}>
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
  kompetisi_puspresnas: "",
  setuju: false,
};

export default function TambahKlaimWizard({ session, profil, onClose, onSuccess }) {
  const [step,         setStep]         = useState(1);
  const [data,         setData]         = useState({ ...INITIAL_DATA, nama_lengkap: session.user.name ?? "", email: session.user.email ?? "" });
  const [files,        setFiles]        = useState({});
  const [nimInfo,      setNimInfo]      = useState(null);
  const [fieldErrors,  setFieldErrors]  = useState({});
  const [loading,      setLoading]      = useState(false);
  const [periodeCheck,    setPeriodeCheck]    = useState("loading"); // "loading" | "aktif" | "tutup"
  const [periodeTanggalSelesai, setPeriodeTanggalSelesai] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch(`http://127.0.0.1:8000/nim-info?email=${encodeURIComponent(session.user.email)}`),
      fetch(`http://127.0.0.1:8000/periode/aktif`),
    ]).then(async ([nimRes, periodeRes]) => {
      nimRes.ok && setNimInfo(await nimRes.json());
      const p = periodeRes.ok ? await periodeRes.json() : { aktif: false };
      setPeriodeCheck(p.aktif ? "aktif" : "tutup");
      if (p.aktif && p.periode?.tanggal_selesai) setPeriodeTanggalSelesai(p.periode.tanggal_selesai);
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
        kompetisi_puspresnas: "",
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

  const showKelompok = data.jenis_kepesertaan === "kelompok" && (isLombaMandiri(data.kategori_simkatmawa) || data.kategori_simkatmawa === "rekognisi");
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
    const isLomba = isLombaMandiri(data.kategori_simkatmawa);

    try {
      const uploadPayload = new FormData();
      uploadPayload.append("nama_lomba",      data.nama_kegiatan);
      uploadPayload.append("tingkat",         isLomba ? data.kategori_kegiatan : data.tingkatan);
      uploadPayload.append("tanggal",         data.tanggal_selesai || data.tahun_kegiatan);
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
      ap("tahun_kegiatan",      data.tahun_kegiatan || data.tanggal_mulai?.substring(0, 4));
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
      ap("nama_ketua",           data.nama_ketua);
      ap("peran_pengeclaim",     data.peran_pengeclaim);
      ap("keterangan_kelompok",  data.keterangan_kelompok);
      ap("kompetisi_puspresnas", data.kompetisi_puspresnas);
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
        <button onClick={onClose} style={{ padding: "10px 24px", background: "#046137", color: "#fff", border: "none", borderRadius: "10px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
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
          {step === 1 && <Step1 data={data} onChange={onChange} onBlur={handleBlur} nimInfo={nimInfo} errors={fieldErrors} profil={profil} />}
          {step === 2 && <Step2 data={data} onChange={onChange} onBlur={handleBlur} onFileChange={onFileChange} files={files} errors={fieldErrors} />}
          {step === 3 && <Step3 data={data} onChange={onChange} errors={fieldErrors} />}
          {step === 4 && data.kategori_simkatmawa === "rekognisi"          && <Step4Rekognisi data={data} onChange={onChange} onBlur={handleBlur} onFileChange={onFileChange} files={files} errors={fieldErrors} periodeTanggalSelesai={periodeTanggalSelesai} />}
          {step === 4 && isLombaMandiri(data.kategori_simkatmawa)          && <Step4Lomba     data={data} onChange={onChange} onBlur={handleBlur} onFileChange={onFileChange} files={files} errors={fieldErrors} />}
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
              style={{ padding: "9px 24px", fontSize: "13px", fontWeight: 600, color: "#fff", background: loading ? "#c8c3bc" : "#046137", border: "none", borderRadius: "8px", cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "background 0.15s" }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = "#035230"; }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = "#046137"; }}
            >
              {loading ? "Mengirim..." : "Kirim Pengajuan"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              style={{ padding: "9px 24px", fontSize: "13px", fontWeight: 600, color: "#fff", background: "#046137", border: "none", borderRadius: "8px", cursor: "pointer", fontFamily: "inherit", transition: "background 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "#035230"}
              onMouseLeave={e => e.currentTarget.style.background = "#046137"}
            >
              Selanjutnya →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
