"use client";

import { useState } from "react";

export default function Home() {
  const [formData, setFormData] = useState({
    nama_lomba: "",
    tingkat: "",
    tanggal: "",
    peringkat: "",
  });
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setStatus("Silakan pilih file sertifikat terlebih dahulu.");
      return;
    }

    setStatus("Sedang mengunggah...");
    setResult(null);

    const data = new FormData();
    data.append("nama_lomba", formData.nama_lomba);
    data.append("tingkat", formData.tingkat);
    data.append("tanggal", formData.tanggal);
    data.append("peringkat", formData.peringkat);
    data.append("file", file);

    try {
      const response = await fetch("http://127.0.0.1:8000/upload", {
        method: "POST",
        body: data,
      });

      if (response.ok) {
        const resData = await response.json();
        setResult(resData);
        setStatus("Selesai!");
        
        if (resData.status === "aman") {
            setFormData({
              nama_lomba: "",
              tingkat: "",
              tanggal: "",
              peringkat: "",
            });
            setFile(null);
            e.target.reset();
        }
      } else {
        setStatus("Gagal mengunggah sertifikat. Cek koneksi backend.");
      }
    } catch (error) {
      console.error("Error:", error);
      setStatus("Terjadi kesalahan saat menghubungi server.");
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Anti-Double Claim</h1>
          <p className="mt-2 text-gray-600">Sistem Deteksi Klaim Sertifikat Ganda</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nama Lomba</label>
            <input
              type="text"
              name="nama_lomba"
              required
              value={formData.nama_lomba}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
              placeholder="Contoh: Hackathon Nasional 2024"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Tingkat</label>
              <select
                name="tingkat"
                required
                value={formData.tingkat}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
              >
                <option value="">Pilih Tingkat</option>
                <option value="Universitas">Universitas</option>
                <option value="Provinsi">Provinsi</option>
                <option value="Nasional">Nasional</option>
                <option value="Internasional">Internasional</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Tanggal Sertifikat</label>
              <input
                type="date"
                name="tanggal"
                required
                value={formData.tanggal}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Peringkat</label>
            <select
              name="peringkat"
              required
              value={formData.peringkat}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
            >
              <option value="">Pilih Peringkat</option>
              <option value="Juara 1">Juara 1</option>
              <option value="Juara 2">Juara 2</option>
              <option value="Juara 3">Juara 3</option>
              <option value="Harapan 1">Harapan 1</option>
              <option value="Harapan 2">Harapan 2</option>
              <option value="Harapan 3">Harapan 3</option>
              <option value="Finalis">Finalis</option>
              <option value="Peserta Terbaik">Peserta Terbaik</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">File Sertifikat (JPG/PDF)</label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={handleFileChange}
              required
              className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          <div>
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Kirim Klaim
            </button>
          </div>
        </form>

        {status && !result && (
          <div className="mt-4 p-3 rounded-md text-sm text-center bg-blue-100 text-blue-800">
            {status}
          </div>
        )}

        {result && (
          <div className={`mt-6 p-4 rounded-lg border-2 ${
            result.status === 'aman'
              ? 'bg-green-50 border-green-500'
              : 'bg-yellow-50 border-yellow-500'
          }`}>
            <h3 className={`text-lg font-bold ${
              result.status === 'aman' ? 'text-green-700' : 'text-yellow-700'
            }`}>
              Hasil Analisis: {result.status.toUpperCase()}
            </h3>
            <p className="text-gray-700 mt-1">{result.message}</p>

            {result.status === 'perlu ditinjau' && (
              <div className="mt-3 space-y-1 text-sm text-yellow-800">
                <p className="font-semibold">Klaim ini ditandai untuk ditinjau oleh operator.</p>
                <p>Mirip dengan klaim ID: <span className="font-mono font-bold">#{result.duplikat_dengan_id}</span></p>
                <p>Kesamaan nama lomba: <span className="font-bold">{result.similarity_nama}%</span></p>
                <p>Jarak hash sertifikat: <span className="font-bold">{result.distance_phash}</span></p>
              </div>
            )}

            {result.status === 'aman' && (
              <p className="text-sm text-green-600 mt-2">
                Sertifikat belum pernah terdaftar sebelumnya dan dinyatakan aman.
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
