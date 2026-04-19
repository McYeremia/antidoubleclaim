"use client";

import { useState } from "react";

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">{title}</h3>
      <div className="text-sm text-gray-700 leading-relaxed">{children}</div>
    </div>
  );
}

export default function SKRektor() {
  const [activeTab, setActiveTab] = useState("ketentuan");

  const tabs = [
    { key: "ketentuan", label: "Ketentuan Umum" },
    { key: "mahasiswa", label: "Tabel Penghargaan Mahasiswa" },
    { key: "petunjuk",  label: "Petunjuk Teknis" },
  ];

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-900 leading-none tracking-tight">SK Rektor</h1>
          <p className="text-gray-400 mt-3 text-[14px]">No. 078/B.02/UKDW/2023 · Aturan Pemberian Penghargaan Bidang Kemahasiswaan UKDW</p>
        </div>
        <a
          href="/sk-rektor.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Lihat PDF Asli
        </a>
      </div>

      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === t.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "ketentuan" && (
        <div className="space-y-4">
          <Section title="Latar Belakang (Pasal 1)">
            <p>
              Selain menekuni bidang akademik, mahasiswa diharapkan mengembangkan <em>soft skills</em> agar
              menjadi lulusan yang tangguh, unggul, dan berprestasi. Dosen atau staf pendamping serta mahasiswa
              diberikan penghargaan atas keaktifan mengikuti berbagai lomba dan kompetisi. Penghargaan
              (reward) yang diberikan diharapkan mampu mendorong dan memotivasi mahasiswa.
            </p>
          </Section>

          <Section title="Tujuan (Pasal 3)">
            <ol className="list-decimal list-inside space-y-1 text-gray-700">
              <li>Memberikan penghargaan kepada mahasiswa dan pendamping yang berhasil mencapai prestasi tinggi.</li>
              <li>Memberikan motivasi kepada mahasiswa melaksanakan kegiatan kurikuler, ko-kurikuler, dan ekstra-kurikuler.</li>
              <li>Mendorong Perguruan Tinggi mengembangkan iklim kehidupan kampus yang memfasilitasi mahasiswa mencapai prestasi secara berkesinambungan.</li>
            </ol>
          </Section>

          <Section title="Pengertian (Pasal 4)">
            <div className="space-y-3 text-gray-700">
              <p><strong>(1) Mahasiswa Berprestasi</strong> — Mahasiswa yang berhasil mencapai prestasi tinggi, baik akademik maupun non-akademik melalui keikutsertaan dalam lomba, kompetisi, dan kegiatan kemahasiswaan.</p>
              <p><strong>(2) Kompetisi/Lomba/Kejuaraan</strong> — Kegiatan perlombaan yang diselenggarakan oleh institusi resmi dengan peserta mahasiswa UKDW yang berstatus aktif. Dapat berupa pertandingan olahraga, lomba karya ilmiah, hibah, gelar karya kreatifitas, dan kegiatan prestasi yang berdampak pada SIMKATMAWA.</p>
              <p><strong>(3) Tingkatan Lomba</strong> — Bersifat (a) Rekognisi dan (b) Non Rekognisi.</p>
            </div>
          </Section>

          <Section title="Ketentuan Penghargaan (Pasal 5)">
            <div className="space-y-2 text-gray-700">
              <p>(1) Penentuan penghargaan prestasi ditentukan dalam rapat pimpinan Bidang Kemahasiswaan UKDW dan diwujudkan sebagai dana pembinaan.</p>
              <p>(2) Kriteria penghargaan berdasarkan tingkatan lomba bersifat (a) Rekognisi dan (b) Non Rekognisi, diberikan berdasarkan pencapaian pada tahapan lomba.</p>
            </div>
          </Section>

          <Section title="Ketentuan Berlaku">
            <p className="text-gray-700">
              Keputusan ini berlaku mulai sejak <strong>Semester Gasal 2023–2024</strong>, ditetapkan di Yogyakarta
              pada tanggal 19 September 2023 oleh Rektor UKDW Dr.-Ing. Wiyatiningsih, ST., MT.
            </p>
          </Section>
        </div>
      )}

      {activeTab === "mahasiswa" && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <strong>Pengali:</strong> Rp 225.000 per poin. Contoh: poin 6 = Rp 1.350.000
          </div>

          <Section title="PUSPRESNAS">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-3 py-2 text-left" rowSpan={2}>Kategori Kegiatan Kompetisi</th>
                    <th className="border border-gray-300 px-3 py-2 text-center" colSpan={3}>Tahap Kategori Penghargaan</th>
                    <th className="border border-gray-300 px-3 py-2 text-center" colSpan={3}>Juara</th>
                  </tr>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-3 py-2 text-center">Proposal / Peserta</th>
                    <th className="border border-gray-300 px-3 py-2 text-center">Didanai / Lolos Wil.</th>
                    <th className="border border-gray-300 px-3 py-2 text-center">Final</th>
                    <th className="border border-gray-300 px-3 py-2 text-center">3</th>
                    <th className="border border-gray-300 px-3 py-2 text-center">2</th>
                    <th className="border border-gray-300 px-3 py-2 text-center">1</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-3 py-2 font-medium">PUSPRESNAS</td>
                    <td className="border border-gray-300 px-3 py-2 text-center">0,5</td>
                    <td className="border border-gray-300 px-3 py-2 text-center">3</td>
                    <td className="border border-gray-300 px-3 py-2 text-center">6</td>
                    <td className="border border-gray-300 px-3 py-2 text-center">12</td>
                    <td className="border border-gray-300 px-3 py-2 text-center">15</td>
                    <td className="border border-gray-300 px-3 py-2 text-center">18</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="NON PUSPRESNAS">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-3 py-2 text-left" rowSpan={2}>Kategori Kegiatan Kompetisi</th>
                    <th className="border border-gray-300 px-3 py-2 text-center" colSpan={3}>Tahap Kategori Penghargaan</th>
                    <th className="border border-gray-300 px-3 py-2 text-center" colSpan={3}>Juara</th>
                  </tr>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-3 py-2 text-center">Proposal / Peserta</th>
                    <th className="border border-gray-300 px-3 py-2 text-center">Didanai / Lolos Wil.</th>
                    <th className="border border-gray-300 px-3 py-2 text-center">Final</th>
                    <th className="border border-gray-300 px-3 py-2 text-center">3</th>
                    <th className="border border-gray-300 px-3 py-2 text-center">2</th>
                    <th className="border border-gray-300 px-3 py-2 text-center">1</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { level: "NON PUSPRESNAS REGIONAL",     vals: ["0,5", "1", "2", "4", "5", "6"] },
                    { level: "NON PUSPRESNAS NASIONAL",      vals: ["0,5", "2", "4", "8", "10", "12"] },
                    { level: "NON PUSPRESNAS INTERNASIONAL", vals: ["0,5", "3", "6", "12", "15", "18"] },
                  ].map((row) => (
                    <tr key={row.level}>
                      <td className="border border-gray-300 px-3 py-2 font-medium">{row.level}</td>
                      {row.vals.map((v, i) => (
                        <td key={i} className="border border-gray-300 px-3 py-2 text-center">{v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="Publikasi Ilmiah">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-3 py-2 text-left" colSpan={2}>Kategori Kegiatan Publikasi Ilmiah</th>
                    <th className="border border-gray-300 px-3 py-2 text-center">Penulis 1</th>
                    <th className="border border-gray-300 px-3 py-2 text-center">Penulis 2</th>
                    <th className="border border-gray-300 px-3 py-2 text-center">Penulis 3 dst</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { no: 1, jenis: "JURNAL Q1-Q2",            vals: ["8", "6", "4"] },
                    { no: 2, jenis: "JURNAL Q3-Q4",            vals: ["6", "4", "2"] },
                    { no: 3, jenis: "JURNAL SINTA 1-2",        vals: ["6", "4", "2"] },
                    { no: 4, jenis: "PATEN INTERNASIONAL",     vals: ["8", "6", "4"] },
                    { no: 5, jenis: "PATEN NASIONAL",          vals: ["6", "4", "2"] },
                    { no: 6, jenis: "PEMAKALAH INTERNASIONAL", vals: ["6", "4", "2"] },
                    { no: 7, jenis: "PEMAKALAH NASIONAL",      vals: ["4", "2", "–"] },
                    { no: 8, jenis: "PEMAKALAH REGIONAL",      vals: ["2", "–", "–"] },
                  ].map((row) => (
                    <tr key={row.jenis}>
                      <td className="border border-gray-300 px-3 py-2 text-center font-medium w-8">{row.no}</td>
                      <td className="border border-gray-300 px-3 py-2 font-medium">{row.jenis}</td>
                      {row.vals.map((v, i) => (
                        <td key={i} className="border border-gray-300 px-3 py-2 text-center">{v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 mt-2">* Pembatasan: masing-masing jenis publikasi (jurnal, paten, pemakalah) dibatasi 2x selama studi per individu.</p>
          </Section>
        </div>
      )}

      {activeTab === "petunjuk" && (
        <div className="space-y-4">
          <Section title="Berkas yang Wajib Dilampirkan">
            <ol className="list-decimal list-inside space-y-1 text-gray-700">
              <li>Surat tugas peserta kompetisi</li>
              <li>Sertifikat</li>
              <li>URL laman penyelenggara dan dokumentasi kegiatan (website, media sosial, poster kegiatan)</li>
              <li>Letter of Acceptance (untuk kategori publikasi ilmiah)</li>
            </ol>
          </Section>

          <Section title="Ketentuan Jumlah Peserta Kelompok">
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>Tabel berlaku untuk kelompok dengan <strong>maksimal 5 orang</strong> anggota</li>
              <li>6–10 orang: jumlah penghargaan ditambah <strong>25%</strong></li>
              <li>Lebih dari 10 orang: jumlah penghargaan ditambah <strong>50%</strong></li>
              <li>Seluruh penghargaan dalam kelompok <strong>dibagi rata</strong> sesuai jumlah anggota</li>
            </ul>
          </Section>

          <Section title="Ketentuan Skala Wilayah (Non PUSPRESNAS)">
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li><strong>Regional</strong> — kegiatan dalam lingkup 1–3 provinsi</li>
              <li><strong>Nasional</strong> — diikuti minimal dari 4 provinsi</li>
              <li><strong>Internasional</strong> — diikuti minimal dari 4 negara</li>
            </ul>
          </Section>

          <Section title="Ketentuan Berkas Tidak Lengkap">
            <p className="text-gray-700">
              Apabila berkas tidak lengkap dan ketika direview memiliki catatan pertimbangan layak mendapat
              penghargaan, maka jumlah penghargaan yang diterima <strong>maksimal 75%</strong>.
            </p>
          </Section>

          <Section title="Batas Waktu Pengajuan">
            <p className="text-gray-700">
              Jangka waktu kegiatan kompetisi yang dapat diajukan memiliki batas <strong>12 bulan</strong> dimulai
              dari waktu dikeluarkannya informasi/pengumuman terkait tahapan prestasi yang didapatkan.
            </p>
          </Section>
        </div>
      )}
    </div>
  );
}
