"""
nim_parser.py
Parsing NIM mahasiswa UKDW dari email @students.ukdw.ac.id

Format NIM (8 digit): FPAAXXXX
  F    = kode Fakultas   (digit 1)
  P    = kode Prodi      (digit 2)
  AA   = angkatan        (digit 3-4, contoh: 22 → 2022)
  XXXX = nomor urut      (digit 5-8)

Contoh: 71220001 → FTI / Informatika / Angkatan 2022 / Nomor 0001
"""

EMAIL_DOMAIN = "students.ukdw.ac.id"

FAKULTAS = {
    "1": "Fakultas Bisnis",
    "3": "Fakultas Bioteknologi",
    "4": "Fakultas Kedokteran",
    "6": "Fakultas Arsitektur dan Desain",
    "7": "Fakultas Teknologi Informasi",
    "8": "Fakultas Humaniora",
}

PRODI = {
    "1": {
        "1": "Prodi Manajemen",
        "2": "Prodi Akuntansi",
    },
    "3": {
        "1": "Prodi Bioteknologi",
    },
    "4": {},
    "6": {
        "1": "Prodi Arsitektur",
        "2": "Prodi Desain Produk",
    },
    "7": {
        "1": "Prodi Informatika",
        "2": "Prodi Sistem Informasi",
    },
    "8": {
        "1": "Prodi Pendidikan Bahasa Inggris",
        "2": "Prodi Studi Humanitas",
    },
}


def is_valid_student_email(email: str) -> bool:
    """Cek apakah email berformat [NIM]@students.ukdw.ac.id."""
    if "@" not in email:
        return False
    local, domain = email.split("@", 1)
    return domain == EMAIL_DOMAIN and local.isdigit() and len(local) == 8


def parse_nim(email: str) -> dict:
    """
    Parsing NIM dari email mahasiswa.

    Returns dict:
        nim          : str   — NIM lengkap (8 digit)
        kode_fakultas: str   — digit ke-1
        kode_prodi   : str   — digit ke-2
        angkatan     : str   — tahun angkatan (contoh: "2022")
        nomor_urut   : str   — 4 digit terakhir
        fakultas     : str   — nama fakultas (atau "Tidak Diketahui")
        prodi        : str   — nama prodi    (atau "Tidak Diketahui")
        valid        : bool  — apakah email & NIM valid
    """
    if not is_valid_student_email(email):
        return {"valid": False, "pesan": "Email bukan domain @students.ukdw.ac.id atau NIM tidak valid."}

    nim          = email.split("@")[0]
    kode_fakultas = nim[0]
    kode_prodi    = nim[1]
    angkatan      = "20" + nim[2:4]
    nomor_urut    = nim[4:8]

    fakultas = FAKULTAS.get(kode_fakultas, "Tidak Diketahui")
    prodi    = PRODI.get(kode_fakultas, {}).get(kode_prodi, "Tidak Diketahui")

    return {
        "valid":          True,
        "nim":            nim,
        "kode_fakultas":  kode_fakultas,
        "kode_prodi":     kode_prodi,
        "angkatan":       angkatan,
        "nomor_urut":     nomor_urut,
        "fakultas":       fakultas,
        "prodi":          prodi,
    }
