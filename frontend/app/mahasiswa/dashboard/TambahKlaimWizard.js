"use client";

import { useState, useEffect } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Konstanta
// ─────────────────────────────────────────────────────────────────────────────
const TAHUN_INI   = new Date().getFullYear();
const TAHUN_OPSI  = [String(TAHUN_INI), String(TAHUN_INI - 1)];

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

// ─────────────────────────────────────────────────────────────────────────────
// Helper UI
// ─────────────────────────────────────────────────────────────────────────────
function Label({ children, required }) {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {children} {required && <span className="text-red-500">*</span>}
    </label>
  );
}

function Input({ className = "", ...props }) {
  return (
    <input
      className={`block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${className}`}
      {...props}
    />
  );
}

function Select({ children, className = "", ...props }) {
  return (
    <select
      className={`block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

function Textarea({ className = "", ...props }) {
  return (
    <textarea
      rows={3}
      className={`block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      {...props}
    />
  );
}

function FileInput({ label, name, onChange, required, hint, currentFile }) {
  return (
    <div>
      <Label required={required}>{label}</Label>
      {hint && <p className="text-xs text-gray-400 mb-1">{hint}</p>}
      <input
        type="file"
        name={name}
        onChange={onChange}
        accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
        className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />
      {currentFile && (
        <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
          <span>✓</span>
          <span className="truncate">{currentFile.name}</span>
        </p>
      )}
    </div>
  );
}

function RadioGroup({ label, name, options, value, onChange, required }) {
  return (
    <div>
      <Label required={required}>{label}</Label>
      <div className="flex flex-wrap gap-3 mt-1">
        {options.map((opt) => (
          <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="accent-blue-600"
            />
            <span className="text-sm text-gray-700">{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Progress Bar
// ─────────────────────────────────────────────────────────────────────────────
function ProgressBar({ steps, current }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((s, i) => {
        const idx   = i + 1;
        const done  = idx < current;
        const active = idx === current;
        return (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold border-2 flex-shrink-0 transition-colors
              ${done  ? "bg-blue-600 border-blue-600 text-white"
               : active ? "bg-white border-blue-600 text-blue-600"
               : "bg-white border-gray-300 text-gray-400"}`}>
              {done ? "✓" : idx}
            </div>
            <span className={`ml-1.5 text-xs font-medium whitespace-nowrap hidden sm:block
              ${active ? "text-blue-600" : done ? "text-blue-400" : "text-gray-400"}`}>
              {s}
            </span>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 ${done ? "bg-blue-400" : "bg-gray-200"}`} />
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
function Step1({ data, onChange, nimInfo }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Nama Lengkap</Label>
          <Input value={data.nama_lengkap} disabled />
          <p className="text-xs text-gray-400 mt-1">Diambil dari akun Google</p>
        </div>
        <div>
          <Label>NIM</Label>
          <Input value={nimInfo?.nim ?? "Memuat..."} disabled />
          {nimInfo?.valid && (
            <p className="text-xs text-gray-400 mt-1">{nimInfo.prodi} · Angkatan {nimInfo.angkatan}</p>
          )}
        </div>
        <div>
          <Label>Email</Label>
          <Input value={data.email} disabled />
        </div>
        <div>
          <Label required>Nomor WhatsApp</Label>
          <Input
            type="tel"
            placeholder="Contoh: 08123456789"
            value={data.nomor_wa}
            onChange={(e) => onChange("nomor_wa", e.target.value)}
          />
        </div>
      </div>
      {nimInfo?.valid && (
        <div className="bg-blue-50 rounded-lg px-4 py-3 text-sm text-blue-700">
          <span className="font-medium">{nimInfo.fakultas}</span> · {nimInfo.prodi}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — Dosen Pembimbing
// ─────────────────────────────────────────────────────────────────────────────
function Step2({ data, onChange, onFileChange }) {
  return (
    <div className="space-y-5">
      <RadioGroup
        label="Apakah menggunakan dosen pembimbing?"
        name="ada_dospem"
        required
        options={[{ value: "ya", label: "Ya" }, { value: "tidak", label: "Tidak" }]}
        value={data.ada_dospem}
        onChange={(v) => onChange("ada_dospem", v)}
      />

      {data.ada_dospem === "ya" && (
        <div className="space-y-4 pl-4 border-l-2 border-blue-200">
          <div>
            <Label required>NIK / NIDN / NIDK Dosen Pembimbing</Label>
            <Input
              placeholder="Masukkan NIK/NIDN/NIDK dospem"
              value={data.nidn_dospem}
              onChange={(e) => onChange("nidn_dospem", e.target.value)}
            />
          </div>
          <FileInput
            label="Surat Tugas Dosen Pembimbing (opsional)"
            name="surat_tugas_dospem"
            onChange={(e) => onFileChange("surat_tugas_dospem", e.target.files[0])}
            hint="Format: PDF, JPG, PNG, DOC"
          />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3 — Pilih Kategori SIMKATMAWA
// ─────────────────────────────────────────────────────────────────────────────
function Step3({ data, onChange }) {
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
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Pilih kategori kegiatan yang sesuai dengan prestasi yang ingin diklaim.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cards.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => onChange("kategori_simkatmawa", c.value)}
            className={`text-left p-5 rounded-xl border-2 transition-colors
              ${data.kategori_simkatmawa === c.value
                ? "border-blue-600 bg-blue-50"
                : "border-gray-200 hover:border-gray-300 bg-white"}`}
          >
            <div className="text-2xl mb-2">{c.icon}</div>
            <p className={`font-semibold text-sm mb-1 ${data.kategori_simkatmawa === c.value ? "text-blue-700" : "text-gray-900"}`}>
              {c.title}
            </p>
            <p className="text-xs text-gray-500 leading-relaxed">{c.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 4A — Detail Rekognisi
// ─────────────────────────────────────────────────────────────────────────────
function Step4Rekognisi({ data, onChange, onFileChange, files }) {
  const isKarya = data.kategori_kegiatan ===
    "Karya Mahasiswa berupa teknologi tepat guna/seni budaya/produk kreatif untuk UMKM dan Industri";

  return (
    <div className="space-y-5">
      <RadioGroup
        label="Jenis Kepesertaan"
        name="jenis_kepesertaan"
        required
        options={[{ value: "individu", label: "Individu" }, { value: "kelompok", label: "Kelompok" }]}
        value={data.jenis_kepesertaan}
        onChange={(v) => onChange("jenis_kepesertaan", v)}
      />

      <div>
        <Label required>Kategori Kegiatan</Label>
        <Select value={data.kategori_kegiatan} onChange={(e) => onChange("kategori_kegiatan", e.target.value)}>
          <option value="">Pilih kategori kegiatan</option>
          {KATEGORI_REKOGNISI.map((k) => <option key={k}>{k}</option>)}
        </Select>
      </div>

      <div>
        <Label required>Nama Kegiatan / Rekognisi / Karya</Label>
        <Input
          placeholder="Masukkan nama kegiatan atau karya"
          value={data.nama_kegiatan}
          onChange={(e) => onChange("nama_kegiatan", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label required>Tingkatan Kegiatan</Label>
          <Select value={data.tingkatan} onChange={(e) => onChange("tingkatan", e.target.value)}>
            <option value="">Pilih tingkatan</option>
            <option>Internasional</option>
            <option>Nasional</option>
            <option>Provinsi</option>
          </Select>
        </div>
        <div>
          <Label required>Tahun Kegiatan</Label>
          <Select value={data.tahun_kegiatan} onChange={(e) => onChange("tahun_kegiatan", e.target.value)}>
            <option value="">Pilih tahun</option>
            {TAHUN_OPSI.map((t) => <option key={t}>{t}</option>)}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FileInput
          label="Dokumen Pendukung (Sertifikat/Karya)"
          name="dokumen_sertifikat"
          required
          onChange={(e) => onFileChange("dokumen_sertifikat", e.target.files[0])}
          hint="Sertifikat apresiasi atau karya"
          currentFile={files?.dokumen_sertifikat}
        />
        <FileInput
          label="Bukti Foto Penyerahan Sertifikat"
          name="foto_penyerahan"
          required
          onChange={(e) => onFileChange("foto_penyerahan", e.target.files[0])}
          currentFile={files?.foto_penyerahan}
        />
      </div>

      <div>
        <Label required>URL Website Penyelenggara</Label>
        <Input
          type="url"
          placeholder="https://..."
          value={data.url_penyelenggara}
          onChange={(e) => onChange("url_penyelenggara", e.target.value)}
        />
      </div>

      <FileInput
        label="Dokumen Pendukung Lainnya"
        name="dokumen_lainnya"
        required
        onChange={(e) => onFileChange("dokumen_lainnya", e.target.files[0])}
        currentFile={files?.dokumen_lainnya}
      />

      {/* Sub-section khusus Karya Mahasiswa */}
      {isKarya && (
        <div className="mt-2 p-4 bg-yellow-50 border border-yellow-200 rounded-xl space-y-4">
          <p className="text-sm font-semibold text-yellow-800">Data Tambahan — Karya Mahasiswa</p>

          <div>
            <Label required>Nama Lembaga / Mitra</Label>
            <Input
              placeholder="Nama lembaga atau mitra"
              value={data.nama_lembaga}
              onChange={(e) => onChange("nama_lembaga", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label required>Jenis Karya</Label>
              <Input
                placeholder="Deskripsikan jenis karya"
                value={data.jenis_karya_teks}
                onChange={(e) => onChange("jenis_karya_teks", e.target.value)}
              />
            </div>
            <div>
              <Label required>Pilihan Jenis Karya</Label>
              <Select value={data.jenis_karya_pilihan} onChange={(e) => onChange("jenis_karya_pilihan", e.target.value)}>
                <option value="">Pilih jenis</option>
                <option>Teknologi Tepat Guna</option>
                <option>Seni Budaya</option>
                <option>Produk Kreatif</option>
              </Select>
            </div>
          </div>

          <div>
            <Label required>Deskripsi Karya</Label>
            <Textarea
              placeholder="Jelaskan deskripsi karya..."
              value={data.deskripsi_karya}
              onChange={(e) => onChange("deskripsi_karya", e.target.value)}
            />
          </div>

          <div>
            <Label required>Manfaat Karya</Label>
            <Textarea
              placeholder="Jelaskan manfaat karya..."
              value={data.manfaat_karya}
              onChange={(e) => onChange("manfaat_karya", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label required>Nomor Surat Keterangan Pengakuan</Label>
              <Input
                placeholder="Nomor surat"
                value={data.nomor_surat}
                onChange={(e) => onChange("nomor_surat", e.target.value)}
              />
            </div>
            <div>
              <Label required>Tanggal Surat Keterangan</Label>
              <Input
                type="datetime-local"
                value={data.tanggal_surat}
                onChange={(e) => onChange("tanggal_surat", e.target.value)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 4B — Detail Lomba Mandiri
// ─────────────────────────────────────────────────────────────────────────────
function Step4Lomba({ data, onChange, onFileChange, files }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label required>Kategori Kegiatan</Label>
          <Select value={data.kategori_kegiatan} onChange={(e) => onChange("kategori_kegiatan", e.target.value)}>
            <option value="">Pilih kategori</option>
            <option>Provinsi / Wilayah</option>
            <option>Nasional</option>
            <option>Internasional</option>
          </Select>
        </div>
        <div>
          <Label required>Model Pelaksanaan</Label>
          <Select value={data.model_pelaksanaan} onChange={(e) => onChange("model_pelaksanaan", e.target.value)}>
            <option value="">Pilih model</option>
            <option>Online</option>
            <option>Offline</option>
          </Select>
        </div>
      </div>

      <RadioGroup
        label="Jenis Kepesertaan"
        name="jenis_kepesertaan"
        required
        options={[{ value: "individu", label: "Individu" }, { value: "kelompok", label: "Kelompok" }]}
        value={data.jenis_kepesertaan}
        onChange={(v) => onChange("jenis_kepesertaan", v)}
      />

      <div>
        <Label required>Nama Kegiatan / Lomba</Label>
        <Input
          placeholder="Nama lomba atau kompetisi"
          value={data.nama_kegiatan}
          onChange={(e) => onChange("nama_kegiatan", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label required>Jumlah Peserta</Label>
          <Input
            type="number"
            min="1"
            placeholder="Jumlah peserta (angka)"
            value={data.jumlah_peserta}
            onChange={(e) => onChange("jumlah_peserta", e.target.value)}
          />
        </div>
        <div>
          <Label required>Tahun Kegiatan</Label>
          <Select value={data.tahun_kegiatan} onChange={(e) => onChange("tahun_kegiatan", e.target.value)}>
            <option value="">Pilih tahun</option>
            {TAHUN_OPSI.map((t) => <option key={t}>{t}</option>)}
          </Select>
        </div>
      </div>

      <div>
        <Label required>Capaian Peserta</Label>
        <Select value={data.capaian} onChange={(e) => onChange("capaian", e.target.value)}>
          <option value="">Pilih capaian</option>
          {CAPAIAN_LOMBA.map((c) => <option key={c}>{c}</option>)}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label required>Tanggal Mulai</Label>
          <Input
            type="date"
            value={data.tanggal_mulai}
            onChange={(e) => onChange("tanggal_mulai", e.target.value)}
          />
        </div>
        <div>
          <Label required>Tanggal Selesai</Label>
          <Input
            type="date"
            value={data.tanggal_selesai}
            onChange={(e) => onChange("tanggal_selesai", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FileInput
          label="Dokumen Pendukung (Sertifikat/Karya)"
          name="dokumen_sertifikat"
          required
          onChange={(e) => onFileChange("dokumen_sertifikat", e.target.files[0])}
          currentFile={files?.dokumen_sertifikat}
        />
        <FileInput
          label="Bukti Foto Penyerahan Sertifikat"
          name="foto_penyerahan"
          required
          onChange={(e) => onFileChange("foto_penyerahan", e.target.files[0])}
          currentFile={files?.foto_penyerahan}
        />
      </div>

      <div>
        <Label required>URL Website Penyelenggara</Label>
        <Input
          type="url"
          placeholder="https://..."
          value={data.url_penyelenggara}
          onChange={(e) => onChange("url_penyelenggara", e.target.value)}
        />
      </div>

      <FileInput
        label="Dokumen Pendukung Lainnya"
        name="dokumen_lainnya"
        required
        onChange={(e) => onFileChange("dokumen_lainnya", e.target.files[0])}
        currentFile={files?.dokumen_lainnya}
      />

      <div>
        <Label>Keterangan</Label>
        <Textarea
          placeholder="Contoh: Lomba nasional muay thai"
          value={data.keterangan}
          onChange={(e) => onChange("keterangan", e.target.value)}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 5 — Data Kelompok
// ─────────────────────────────────────────────────────────────────────────────
function Step5({ data, onChange }) {
  const jumlah = parseInt(data.jumlah_anggota) || 0;

  // Pastikan array anggota sesuai panjang jumlah_anggota - 1 (ketua sudah terpisah)
  const updateAnggota = (idx, field, value) => {
    const arr = [...(data.anggota || [])];
    if (!arr[idx]) arr[idx] = { nama: "", nim: "" };
    arr[idx] = { ...arr[idx], [field]: value };
    onChange("anggota", arr);
  };

  const anggotaFields = jumlah > 1
    ? Array.from({ length: jumlah - 1 }, (_, i) => i)
    : [];

  return (
    <div className="space-y-5">
      <div className="bg-blue-50 rounded-lg px-4 py-3 text-sm text-blue-700">
        Mohon isi NIM dan Nama anggota kelompok. Pastikan sesuai dengan data di PDDikti — akan diverifikasi saat proses pengecekan.
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label required>Jumlah Anggota (termasuk ketua)</Label>
          <Input
            type="number"
            min="2"
            placeholder="Jumlah total anggota"
            value={data.jumlah_anggota}
            onChange={(e) => onChange("jumlah_anggota", e.target.value)}
          />
        </div>
        <div>
          <Label required>Nama Ketua</Label>
          <Input
            placeholder="Nama lengkap ketua"
            value={data.nama_ketua}
            onChange={(e) => onChange("nama_ketua", e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label required>Peran Anda dalam Kelompok</Label>
        <Input
          placeholder="Contoh: Ketua, Anggota, Developer, dll."
          value={data.peran_pengeclaim}
          onChange={(e) => onChange("peran_pengeclaim", e.target.value)}
        />
      </div>

      {anggotaFields.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">Data Anggota Lainnya</p>
          {anggotaFields.map((i) => (
            <div key={i} className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg">
              <div>
                <Label required>Nama Lengkap Anggota {i + 2}</Label>
                <Input
                  placeholder="Nama lengkap"
                  value={data.anggota?.[i]?.nama ?? ""}
                  onChange={(e) => updateAnggota(i, "nama", e.target.value)}
                />
              </div>
              <div>
                <Label required>NIM Anggota {i + 2}</Label>
                <Input
                  placeholder="8 digit NIM"
                  maxLength={8}
                  value={data.anggota?.[i]?.nim ?? ""}
                  onChange={(e) => updateAnggota(i, "nim", e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div>
        <Label>Keterangan Tambahan (opsional)</Label>
        <Textarea
          placeholder="Informasi tambahan tentang kelompok jika diperlukan"
          value={data.keterangan_kelompok}
          onChange={(e) => onChange("keterangan_kelompok", e.target.value)}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 6 — Konfirmasi & Persetujuan
// ─────────────────────────────────────────────────────────────────────────────
function Step6({ data, onChange, nimInfo }) {
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

  return (
    <div className="space-y-6">
      {/* Ringkasan */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-3">Ringkasan Pengajuan</p>
        <div className="bg-gray-50 rounded-xl border border-gray-200 divide-y divide-gray-200 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="flex px-4 py-2.5 gap-4">
              <span className="text-gray-500 w-40 flex-shrink-0">{k}</span>
              <span className="text-gray-900 font-medium">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Poin */}
      <div className="bg-blue-50 rounded-xl p-4 flex items-center justify-between">
        <span className="text-sm font-medium text-blue-700">Estimasi Total Poin</span>
        <span className="text-2xl font-bold text-blue-700">0</span>
      </div>

      {/* Persetujuan */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-yellow-800">Persetujuan Pengajuan</p>
        <p className="text-xs text-yellow-700 leading-relaxed">
          Link Pengiriman data rekening akan dibuka setelah Perhitungan Penghargaan selesai dan akan menerima
          Surat Pemberitahuan Hasil Perhitungan.
        </p>
        <p className="text-xs text-yellow-700 leading-relaxed">
          <strong>Catatan:</strong> Jika Penerima sudah mendapatkan pemberitahuan, namun tidak mengirimkan
          data rekening hingga batas waktu yang ditentukan, maka akan dinyatakan gugur pada periode
          pengumpulan. Namun kamu masih bisa melakukan pengajuan di periode berikutnya.
        </p>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={data.setuju}
            onChange={(e) => onChange("setuju", e.target.checked)}
            className="mt-0.5 accent-blue-600"
          />
          <span className="text-sm text-gray-700">
            Saya menyatakan bahwa data yang diisi adalah benar dan saya menyetujui ketentuan di atas.
          </span>
        </label>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Wizard Utama
// ─────────────────────────────────────────────────────────────────────────────
const INITIAL_DATA = {
  // Step 1
  nama_lengkap: "", email: "", nomor_wa: "",
  // Step 2
  ada_dospem: "tidak", nidn_dospem: "",
  // Step 3
  kategori_simkatmawa: "",
  // Step 4 (shared)
  jenis_kepesertaan: "", kategori_kegiatan: "", nama_kegiatan: "",
  tingkatan: "", tahun_kegiatan: "", url_penyelenggara: "",
  capaian: "", tanggal_mulai: "", tanggal_selesai: "",
  jumlah_peserta: "", model_pelaksanaan: "", keterangan: "",
  // Step 4A extras (Karya)
  nama_lembaga: "", jenis_karya_teks: "", jenis_karya_pilihan: "",
  deskripsi_karya: "", manfaat_karya: "", nomor_surat: "", tanggal_surat: "",
  // Step 5
  jumlah_anggota: "", nama_ketua: "", peran_pengeclaim: "",
  anggota: [], keterangan_kelompok: "",
  // Step 6
  setuju: false,
};

export default function TambahKlaimWizard({ session, onClose, onSuccess }) {
  const [step,    setStep]    = useState(1);
  const [data,    setData]    = useState({ ...INITIAL_DATA, nama_lengkap: session.user.name ?? "", email: session.user.email ?? "" });
  const [files,   setFiles]   = useState({});
  const [nimInfo, setNimInfo] = useState(null);
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  // Ambil info NIM saat mount
  useEffect(() => {
    fetch(`http://127.0.0.1:8000/nim-info?email=${encodeURIComponent(session.user.email)}`)
      .then((r) => r.json())
      .then(setNimInfo)
      .catch(() => {});
  }, []);

  const onChange = (key, value) => {
    // Saat kategori berubah, reset semua field & file step 4 agar tidak ada "ghost data"
    if (key === "kategori_simkatmawa") {
      setFiles((prev) => ({
        ...prev,
        dokumen_sertifikat: undefined,
        foto_penyerahan:    undefined,
        dokumen_lainnya:    undefined,
      }));
      setData((prev) => ({
        ...prev,
        kategori_simkatmawa: value,
        jenis_kepesertaan: "", kategori_kegiatan: "", nama_kegiatan: "",
        tingkatan: "", tahun_kegiatan: "", url_penyelenggara: "",
        capaian: "", tanggal_mulai: "", tanggal_selesai: "",
        jumlah_peserta: "", model_pelaksanaan: "", keterangan: "",
        nama_lembaga: "", jenis_karya_teks: "", jenis_karya_pilihan: "",
        deskripsi_karya: "", manfaat_karya: "", nomor_surat: "", tanggal_surat: "",
      }));
      setError("");
      return;
    }
    setData((prev) => ({ ...prev, [key]: value }));
    setError("");
  };

  const onFileChange = (key, file) => {
    setFiles((prev) => ({ ...prev, [key]: file }));
  };

  // Hitung step labels & apakah step kelompok ditampilkan
  const showKelompok = data.jenis_kepesertaan === "kelompok";
  const stepLabels = ["Data Diri", "Dosen Pembimbing", "Kategori", "Detail", ...(showKelompok ? ["Kelompok"] : []), "Konfirmasi"];
  const totalSteps = stepLabels.length;

  // Mapping step number → logical step
  // 1=DataDiri, 2=Dospem, 3=Kategori, 4=Detail, 5=Kelompok(opsional), 6=Konfirmasi
  // Jika tidak ada kelompok: 1,2,3,4,5(konfirmasi)
  const getStepLabel = () => stepLabels[step - 1] ?? "";

  const validateStep = () => {
    if (step === 1) {
      if (!data.nomor_wa) return "Nomor WhatsApp wajib diisi.";
    }
    if (step === 2) {
      if (!data.ada_dospem) return "Pilih apakah menggunakan dosen pembimbing.";
      if (data.ada_dospem === "ya" && !data.nidn_dospem) return "NIK/NIDN/NIDK dosen pembimbing wajib diisi.";
    }
    if (step === 3) {
      if (!data.kategori_simkatmawa) return "Pilih kategori SIMKATMAWA terlebih dahulu.";
    }
    if (step === 4) {
      if (!data.jenis_kepesertaan) return "Pilih jenis kepesertaan.";
      if (!data.kategori_kegiatan) return "Pilih kategori kegiatan.";
      if (!data.nama_kegiatan)     return "Nama kegiatan wajib diisi.";
      if (!data.url_penyelenggara) return "URL penyelenggara wajib diisi.";
      if (!files.dokumen_sertifikat) return "Dokumen sertifikat wajib diunggah.";
      if (!files.foto_penyerahan)    return "Foto penyerahan wajib diunggah.";
      if (!files.dokumen_lainnya) return "Dokumen pendukung wajib diunggah.";
      if (data.kategori_simkatmawa === "lomba_mandiri") {
        if (!data.capaian)         return "Capaian peserta wajib dipilih.";
        if (!data.tanggal_mulai)   return "Tanggal mulai wajib diisi.";
        if (!data.tanggal_selesai) return "Tanggal selesai wajib diisi.";
      } else {
        if (!data.tingkatan)       return "Tingkatan kegiatan wajib dipilih.";
        if (!data.tahun_kegiatan)  return "Tahun kegiatan wajib dipilih.";
      }
    }
    if (showKelompok && step === 5) {
      if (!data.jumlah_anggota || parseInt(data.jumlah_anggota) < 2) return "Jumlah anggota minimal 2.";
      if (!data.nama_ketua)      return "Nama ketua wajib diisi.";
      if (!data.peran_pengeclaim) return "Peran Anda dalam kelompok wajib diisi.";
    }
    const isLastStep = step === totalSteps;
    if (isLastStep && !data.setuju) return "Centang persetujuan untuk menyelesaikan pengajuan.";
    return "";
  };

  const handleNext = () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError("");
    if (step < totalSteps) setStep((s) => s + 1);
  };

  const handleBack = () => {
    setError("");
    if (step > 1) setStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    if (!files.dokumen_sertifikat) { setError("Dokumen sertifikat belum diunggah."); return; }

    setLoading(true);
    const isLomba = data.kategori_simkatmawa === "lomba_mandiri";

    try {
      // ── Step A: anti-double claim (endpoint lama) ───────────────────────
      const uploadPayload = new FormData();
      uploadPayload.append("nama_lomba",      data.nama_kegiatan);
      uploadPayload.append("tingkat",         isLomba ? data.kategori_kegiatan : data.tingkatan);
      uploadPayload.append("tanggal",         isLomba ? data.tanggal_selesai   : data.tahun_kegiatan);
      uploadPayload.append("peringkat",       isLomba ? data.capaian           : data.kategori_kegiatan);
      uploadPayload.append("mahasiswa_email", session.user.email);
      uploadPayload.append("nama_display",    session.user.name ?? session.user.email);
      uploadPayload.append("file",            files.dokumen_sertifikat);

      const uploadRes = await fetch("http://127.0.0.1:8000/upload", { method: "POST", body: uploadPayload });
      if (!uploadRes.ok) throw new Error("Upload sertifikat gagal");
      const uploadData = await uploadRes.json();
      const claimId = uploadData.id ?? null;

      // ── Step B: simpan semua data pengajuan ─────────────────────────────
      const pengajuanPayload = new FormData();
      const appendIfValue = (key, val) => { if (val !== undefined && val !== null && val !== "") pengajuanPayload.append(key, val); };

      appendIfValue("mahasiswa_email",     session.user.email);
      appendIfValue("nama_display",        session.user.name ?? session.user.email);
      appendIfValue("nomor_wa",            data.nomor_wa);
      appendIfValue("ada_dospem",          data.ada_dospem);
      appendIfValue("nidn_dospem",         data.nidn_dospem);
      appendIfValue("kategori_simkatmawa", data.kategori_simkatmawa);
      appendIfValue("jenis_kepesertaan",   data.jenis_kepesertaan);
      appendIfValue("nama_kegiatan",       data.nama_kegiatan);
      appendIfValue("kategori_kegiatan",   data.kategori_kegiatan);
      appendIfValue("tingkatan",           data.tingkatan);
      appendIfValue("tahun_kegiatan",      data.tahun_kegiatan);
      appendIfValue("model_pelaksanaan",   data.model_pelaksanaan);
      appendIfValue("jumlah_peserta",      data.jumlah_peserta);
      appendIfValue("capaian",             data.capaian);
      appendIfValue("tanggal_mulai",       data.tanggal_mulai);
      appendIfValue("tanggal_selesai",     data.tanggal_selesai);
      appendIfValue("url_penyelenggara",   data.url_penyelenggara);
      appendIfValue("keterangan",          data.keterangan);
      appendIfValue("nama_lembaga",        data.nama_lembaga);
      appendIfValue("jenis_karya_teks",    data.jenis_karya_teks);
      appendIfValue("jenis_karya_pilihan", data.jenis_karya_pilihan);
      appendIfValue("deskripsi_karya",     data.deskripsi_karya);
      appendIfValue("manfaat_karya",       data.manfaat_karya);
      appendIfValue("nomor_surat",         data.nomor_surat);
      appendIfValue("tanggal_surat",       data.tanggal_surat);
      appendIfValue("nama_ketua",          data.nama_ketua);
      appendIfValue("peran_pengeclaim",    data.peran_pengeclaim);
      appendIfValue("keterangan_kelompok", data.keterangan_kelompok);
      pengajuanPayload.append("setuju",    String(data.setuju));
      if (claimId) pengajuanPayload.append("claim_id", String(claimId));

      // Anggota kelompok (JSON string)
      if (data.jenis_kepesertaan === "kelompok" && data.anggota?.length > 0) {
        pengajuanPayload.append("anggota_json", JSON.stringify(data.anggota));
      }

      // File-file tambahan
      if (files.surat_tugas_dospem) pengajuanPayload.append("surat_tugas",        files.surat_tugas_dospem);
      if (files.foto_penyerahan)    pengajuanPayload.append("foto_penyerahan",    files.foto_penyerahan);
      if (files.dokumen_lainnya)    pengajuanPayload.append("dokumen_lainnya",    files.dokumen_lainnya);
      // dokumen_sertifikat juga dikirim agar path tersimpan di PENGAJUAN
      pengajuanPayload.append("dokumen_sertifikat", files.dokumen_sertifikat);

      const pengajuanRes = await fetch("http://127.0.0.1:8000/pengajuan", { method: "POST", body: pengajuanPayload });
      if (!pengajuanRes.ok) throw new Error("Simpan pengajuan gagal");

      onSuccess?.();
      onClose();

    } catch (e) {
      setError(`Gagal mengirim pengajuan: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const isLastStep = step === totalSteps;

  return (
    /* Full-screen modal */
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">Pengajuan Klaim Prestasi</h2>
            <p className="text-xs text-gray-400 mt-0.5">Langkah {step} dari {totalSteps} — {getStepLabel()}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        {/* Progress */}
        <div className="px-6 pt-5 flex-shrink-0">
          <ProgressBar steps={stepLabels} current={step} />
        </div>

        {/* Konten step */}
        <div className="flex-1 overflow-y-auto px-6 pb-4">
          {step === 1 && <Step1 data={data} onChange={onChange} nimInfo={nimInfo} />}
          {step === 2 && <Step2 data={data} onChange={onChange} onFileChange={onFileChange} />}
          {step === 3 && <Step3 data={data} onChange={onChange} />}
          {step === 4 && data.kategori_simkatmawa === "rekognisi"    && <Step4Rekognisi data={data} onChange={onChange} onFileChange={onFileChange} files={files} />}
          {step === 4 && data.kategori_simkatmawa === "lomba_mandiri" && <Step4Lomba    data={data} onChange={onChange} onFileChange={onFileChange} files={files} />}
          {step === 5 && showKelompok && <Step5 data={data} onChange={onChange} />}
          {isLastStep && <Step6 data={data} onChange={onChange} nimInfo={nimInfo} />}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mb-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex-shrink-0">
            {error}
          </div>
        )}

        {/* Footer navigasi */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between flex-shrink-0">
          <button
            type="button"
            onClick={step === 1 ? onClose : handleBack}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {step === 1 ? "Batal" : "← Sebelumnya"}
          </button>

          {isLastStep ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {loading ? "Mengirim..." : "Kirim Pengajuan"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Selanjutnya →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
