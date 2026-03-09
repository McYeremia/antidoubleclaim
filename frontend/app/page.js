"use client";

import { useState } from "react";

export default function Home() {

  const [file, setFile] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();

    formData.append("nama_lomba", "Hackathon");
    formData.append("tingkat", "Nasional");
    formData.append("tanggal", "2025-06-15");
    formData.append("peringkat", "Juara 1");
    formData.append("file", file);

    await fetch("http://127.0.0.1:8000/upload", {
      method: "POST",
      body: formData
    });
  };

  return (
    <div className="p-10">

      <h1 className="text-2xl mb-4">
        Upload Sertifikat
      </h1>

      <form onSubmit={handleSubmit}>

        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
        />

        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2"
        >
          Upload
        </button>

      </form>

    </div>
  );
}