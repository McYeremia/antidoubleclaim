// Halaman simulator deteksi duplikat: pengujian interaktif pHash (gambar) dan fuzzy matching (teks nama lomba).
"use client";
import { useState, useRef, useCallback } from "react";
import { API as API_URL, apiFetch } from "./shared";

// Komponen ini adalah bagian sistem terpisah dari alur produksi.
// Tidak menyimpan data ke database, tidak mempengaruhi klaim yang ada.
// Digunakan hanya untuk pengujian dan visualisasi cara kerja deteksi duplikat.

// ─── Konstanta threshold (harus sama dengan PHASH_THRESHOLD & FUZZY_THRESHOLD di backend/database.py)
const PHASH_THRESHOLD = 10;
const FUZZY_THRESHOLD = 80;

// ─── Langkah-langkah pHash untuk ditampilkan
const PHASH_STEPS = [
  {
    num: 1,
    title: "Load & Resize",
    desc: "Gambar diubah ukurannya menjadi 32×32 piksel",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    num: 2,
    title: "Grayscale",
    desc: "Warna dikonversi ke skala abu-abu",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    ),
  },
  {
    num: 3,
    title: "DCT 2D",
    desc: "Discrete Cosine Transform 2D diterapkan ke seluruh gambar",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    num: 4,
    title: "Ambil 8×8 Frekuensi Rendah",
    desc: "Hanya koefisien 8×8 pojok kiri atas (frekuensi rendah) yang digunakan",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    num: 5,
    title: "Binary & Bandingkan",
    desc: "Tiap koefisien dibandingkan dengan rata-rata → bit 0 atau 1. XOR dua hash = Hamming distance",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
];

function UploadZone({ label, preview, onFile }) {
  const inputRef = useRef();
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }, [onFile]);

  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file) onFile(file);
  };

  return (
    <div className="flex-1">
      <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">{label}</p>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl cursor-pointer transition-all overflow-hidden
          ${dragging ? "border-[#046137] bg-[#f0f7f3]" : preview ? "border-[#046137]/30 bg-[#f0f7f3]/50" : "border-gray-200 bg-gray-50 hover:border-[#046137]/50 hover:bg-[#f0f7f3]/30"}`}
        style={{ minHeight: 160 }}
      >
        {preview ? (
          <img src={preview} alt={label} className="w-full h-40 object-contain p-2" />
        ) : (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-[12px] text-gray-400 font-medium">Klik atau drag gambar</p>
            <p className="text-[10px] text-gray-300">JPG, PNG, PDF (maks 10 MB)</p>
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" onChange={handleChange} />
    </div>
  );
}

function HashGrid({ bits, diffBits, label }) {
  return (
    <div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{label}</p>
      <div className="inline-grid gap-0.5" style={{ gridTemplateColumns: "repeat(8, 1fr)" }}>
        {bits.map((bit, i) => (
          <div
            key={i}
            title={`Bit ${i}: ${bit} ${diffBits[i] ? "(BERBEDA)" : ""}`}
            className={`w-5 h-5 rounded-sm border transition-all
              ${diffBits[i]
                ? "border-red-400 " + (bit ? "bg-red-200" : "bg-red-400")
                : "border-gray-200 " + (bit ? "bg-gray-100" : "bg-gray-800")
              }`}
          />
        ))}
      </div>
    </div>
  );
}

function BitArray({ bits, diffBits, label }) {
  return (
    <div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{label}</p>
      <div className="font-mono text-[11px] flex flex-col gap-0.5">
        {Array.from({ length: 8 }, (_, row) => (
          <div key={row} className="flex gap-0.5">
            {bits.slice(row * 8, row * 8 + 8).map((bit, col) => {
              const i = row * 8 + col;
              return (
                <span
                  key={i}
                  className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold
                    ${diffBits[i]
                      ? "bg-red-100 text-red-600 border border-red-300"
                      : "bg-gray-100 text-gray-500 border border-gray-200"
                    }`}
                >
                  {bit}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function SimilarityBar({ percent, isDuplicate }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Kesamaan</span>
        <span className={`text-[14px] font-black ${isDuplicate ? "text-red-600" : "text-[#046137]"}`}>
          {percent.toFixed(2)}%
        </span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${isDuplicate ? "bg-red-500" : "bg-[#046137]"}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  );
}

function ConclusionBadge({ isDuplicate, distanceOrScore, threshold, mode }) {
  const isPhash = mode === "phash";
  return (
    <div className={`rounded-2xl border-2 p-5 flex items-center gap-4
      ${isDuplicate ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"}`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0
        ${isDuplicate ? "bg-red-100" : "bg-emerald-100"}`}>
        {isDuplicate ? (
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <div>
        <p className={`text-[15px] font-black ${isDuplicate ? "text-red-700" : "text-emerald-700"}`}>
          {isDuplicate ? "DUPLIKAT TERDETEKSI" : "TIDAK DUPLIKAT"}
        </p>
        <p className="text-[12px] text-gray-500 mt-0.5">
          {isPhash
            ? `Hamming distance ${distanceOrScore} ${isDuplicate ? "≤" : ">"} threshold ${threshold} → ${isDuplicate ? "gambar dianggap sama" : "gambar berbeda"}`
            : `Skor similarity ${distanceOrScore} ${isDuplicate ? "≥" : "<"} threshold ${threshold} → ${isDuplicate ? "judul dianggap sama" : "judul berbeda"}`
          }
        </p>
      </div>
    </div>
  );
}

function TabPhash() {
  const [image1, setImage1]     = useState(null);
  const [image2, setImage2]     = useState(null);
  const [preview1, setPreview1] = useState(null);
  const [preview2, setPreview2] = useState(null);
  const [result, setResult]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const handleFile1 = (file) => { setImage1(file); setPreview1(URL.createObjectURL(file)); setResult(null); setError(""); };
  const handleFile2 = (file) => { setImage2(file); setPreview2(URL.createObjectURL(file)); setResult(null); setError(""); };

  const handleAnalyze = async () => {
    if (!image1 || !image2) { setError("Harap upload kedua gambar terlebih dahulu."); return; }
    setLoading(true); setError(""); setResult(null);
    try {
      const form = new FormData();
      form.append("image1", image1);
      form.append("image2", image2);
      const operatorId = localStorage.getItem("operator_id") || "";
      const res = await apiFetch(`${API_URL}/simulator/phash`, {
        method: "POST",
        headers: { "x-operator-id": operatorId },
        body: form,
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.detail || "Terjadi kesalahan saat analisis."); return; }
      setResult(await res.json());
    } catch { setError("Tidak dapat terhubung ke server."); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h3 className="text-[13px] font-black text-gray-700 uppercase tracking-widest mb-5">Upload Dua Gambar</h3>
        <div className="flex gap-4">
          <UploadZone label="Gambar A" preview={preview1} onFile={handleFile1} />
          <UploadZone label="Gambar B" preview={preview2} onFile={handleFile2} />
        </div>
        {error && <p className="mt-3 text-[12px] text-red-500 font-medium">{error}</p>}
        <button
          onClick={handleAnalyze}
          disabled={loading || !image1 || !image2}
          className="mt-5 w-full py-3 rounded-xl text-[13px] font-black text-white bg-[#046137] hover:bg-[#035230] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {loading ? "Menganalisis..." : "Analisis pHash"}
        </button>
      </div>

      {result && (
        <>
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h3 className="text-[13px] font-black text-gray-700 uppercase tracking-widest mb-5">Langkah Perhitungan pHash</h3>
            <div className="flex flex-col gap-3">
              {PHASH_STEPS.map((step, idx) => (
                <div key={step.num} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#046137] flex items-center justify-center flex-shrink-0 text-white">
                    {step.icon}
                  </div>
                  <div className="flex-1 pt-0.5">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-black text-[#046137] uppercase tracking-widest">Step {step.num}</span>
                      <span className="text-[12px] font-black text-gray-800">{step.title}</span>
                    </div>
                    <p className="text-[12px] text-gray-500">{step.desc}</p>
                  </div>
                  {idx < PHASH_STEPS.length - 1 && (
                    <svg className="w-4 h-4 text-gray-300 mt-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h3 className="text-[13px] font-black text-gray-700 uppercase tracking-widest mb-1">Visual Hash Grid 8×8</h3>
            <p className="text-[11px] text-gray-400 mb-5">
              Tiap sel = 1 bit hash. Putih = bit 1, Hitam = bit 0. <span className="text-red-500 font-bold">Merah = bit berbeda</span>
            </p>
            <div className="flex gap-10 flex-wrap">
              <HashGrid bits={result.hash1_bits} diffBits={result.diff_bits} label="Hash Gambar A" />
              <HashGrid bits={result.hash2_bits} diffBits={result.diff_bits} label="Hash Gambar B" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h3 className="text-[13px] font-black text-gray-700 uppercase tracking-widest mb-5">Hash Hex & Bit Array (64 bit)</h3>
            <div className="space-y-3 mb-5">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest w-20 flex-shrink-0">Hash A</span>
                <code className="text-[13px] font-mono font-bold text-gray-800 tracking-wider">{result.hash1_hex}</code>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest w-20 flex-shrink-0">Hash B</span>
                <code className="text-[13px] font-mono font-bold text-gray-800 tracking-wider">{result.hash2_hex}</code>
              </div>
            </div>
            <div className="flex gap-10 flex-wrap">
              <BitArray bits={result.hash1_bits} diffBits={result.diff_bits} label="Bit Array A" />
              <BitArray bits={result.hash2_bits} diffBits={result.diff_bits} label="Bit Array B" />
            </div>
            <p className="mt-3 text-[11px] text-red-500 font-medium">
              {result.diff_bits.filter(b => b === 1).length} bit berbeda (di-highlight merah)
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h3 className="text-[13px] font-black text-gray-700 uppercase tracking-widest mb-5">Hamming Distance & Kesamaan</h3>
            <div className="flex items-center gap-6 mb-5">
              <div className="text-center">
                <p className="text-[40px] font-black text-gray-900 leading-none">{result.hamming_distance}</p>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Hamming Distance</p>
              </div>
              <div className="flex-1">
                <SimilarityBar percent={result.similarity_percent} isDuplicate={result.is_duplicate} />
              </div>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
              <p className="text-[11px] text-amber-700 font-medium">
                <span className="font-black">Threshold:</span> Hamming distance ≤ {result.threshold} dianggap duplikat (gambar sangat mirip secara visual).
                Nilai 0 = identik, nilai 64 = sepenuhnya berbeda.
              </p>
            </div>
          </div>

          <ConclusionBadge
            isDuplicate={result.is_duplicate}
            distanceOrScore={result.hamming_distance}
            threshold={result.threshold}
            mode="phash"
          />
        </>
      )}
    </div>
  );
}

function TabFuzzy() {
  const [title1, setTitle1]   = useState("");
  const [title2, setTitle2]   = useState("");
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handleAnalyze = async () => {
    if (!title1.trim() || !title2.trim()) { setError("Harap isi kedua judul lomba."); return; }
    setLoading(true); setError(""); setResult(null);
    try {
      const operatorId = localStorage.getItem("operator_id") || "";
      const res = await apiFetch(`${API_URL}/simulator/fuzzy`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-operator-id": operatorId },
        body: JSON.stringify({ title1, title2 }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.detail || "Terjadi kesalahan saat analisis."); return; }
      setResult(await res.json());
    } catch { setError("Tidak dapat terhubung ke server."); }
    finally { setLoading(false); }
  };

  const getTokenStatus = (tokens, otherTokens) => {
    const otherSet = new Set(otherTokens);
    return tokens.map(t => ({ token: t, match: otherSet.has(t) }));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h3 className="text-[13px] font-black text-gray-700 uppercase tracking-widest mb-5">Input Judul Lomba</h3>
        <div className="space-y-4">
          {[
            { label: "Judul 1", value: title1, set: setTitle1 },
            { label: "Judul 2", value: title2, set: setTitle2 },
          ].map(({ label, value, set }) => (
            <div key={label}>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{label}</label>
              <input
                type="text"
                value={value}
                onChange={e => { set(e.target.value); setResult(null); setError(""); }}
                placeholder="Contoh: Lomba Debat Nasional 2024"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#046137]/30 focus:border-[#046137] transition-all"
              />
            </div>
          ))}
        </div>
        {error && <p className="mt-3 text-[12px] text-red-500 font-medium">{error}</p>}
        <button
          onClick={handleAnalyze}
          disabled={loading || !title1.trim() || !title2.trim()}
          className="mt-5 w-full py-3 rounded-xl text-[13px] font-black text-white bg-[#046137] hover:bg-[#035230] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {loading ? "Menganalisis..." : "Analisis Fuzzy String"}
        </button>
      </div>

      {result && (
        <>
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h3 className="text-[13px] font-black text-gray-700 uppercase tracking-widest mb-5">Normalisasi Teks (3 Langkah)</h3>
            {[
              { key: "1", label: "Judul 1", steps: [result.original1, result.normalized1, result.sorted1] },
              { key: "2", label: "Judul 2", steps: [result.original2, result.normalized2, result.sorted2] },
            ].map(({ key, label, steps }) => (
              <div key={key} className="mb-4">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{label}</p>
                <div className="flex items-start gap-2 flex-wrap">
                  {steps.map((text, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">
                          {["Original", "Lowercase", "Token Sorted"][idx]}
                        </p>
                        <p className="text-[12px] font-mono text-gray-800">{text}</p>
                      </div>
                      {idx < 2 && (
                        <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h3 className="text-[13px] font-black text-gray-700 uppercase tracking-widest mb-1">Perbandingan Token</h3>
            <p className="text-[11px] text-gray-400 mb-5">
              Token sebelum diurutkan. <span className="text-emerald-600 font-bold">Hijau = ada di kedua judul</span>,{" "}
              <span className="text-red-500 font-bold">Merah = hanya ada di satu judul</span>
            </p>
            <div className="flex gap-8 flex-wrap">
              {[
                { label: "Token Judul 1", tokens: getTokenStatus(result.tokens1, result.tokens2) },
                { label: "Token Judul 2", tokens: getTokenStatus(result.tokens2, result.tokens1) },
              ].map(({ label, tokens }) => (
                <div key={label}>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {tokens.map(({ token, match }, i) => (
                      <span key={i} className={`px-2.5 py-1 rounded-lg text-[12px] font-bold border
                        ${match ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-600"}`}>
                        {token}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h3 className="text-[13px] font-black text-gray-700 uppercase tracking-widest mb-5">Skor Fuzzy Token Sort Ratio</h3>
            <div className="flex items-center gap-6 mb-5">
              <div className="text-center">
                <p className="text-[40px] font-black text-gray-900 leading-none">{result.score.toFixed(1)}</p>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Skor (0–100)</p>
              </div>
              <div className="flex-1">
                <SimilarityBar percent={result.score} isDuplicate={result.is_duplicate} />
              </div>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
              <p className="text-[11px] text-amber-700 font-medium">
                <span className="font-black">Threshold:</span> Skor ≥ {result.threshold} dianggap duplikat (judul lomba sangat mirip).
                Token sort ratio mengurutkan token sebelum dibandingkan, sehingga urutan kata tidak mempengaruhi skor.
              </p>
            </div>
          </div>

          <ConclusionBadge
            isDuplicate={result.is_duplicate}
            distanceOrScore={result.score.toFixed(1)}
            threshold={result.threshold}
            mode="fuzzy"
          />
        </>
      )}
    </div>
  );
}

export default function SimulatorDeteksi() {
  const [activeTab, setActiveTab] = useState("phash");

  const tabs = [
    { key: "phash", label: "pHash Gambar" },
    { key: "fuzzy", label: "Fuzzy String Judul" },
  ];

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[9px] font-black uppercase tracking-widest">
            Alat Uji
          </span>
        </div>
        <h1 className="text-[22px] font-black text-gray-900">Simulator Deteksi Duplikat</h1>
        <p className="text-[13px] text-gray-500 mt-1">
          Uji dan visualisasi cara kerja sistem deteksi duplikat. Data tidak disimpan ke database.
        </p>
      </div>

      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6 w-fit">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2 rounded-lg text-[12px] font-black transition-all
              ${activeTab === tab.key ? "bg-white text-[#046137] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "phash" && <TabPhash />}
      {activeTab === "fuzzy" && <TabFuzzy />}
    </div>
  );
}
