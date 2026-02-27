# from text_similarity import token_sort_ratio
# from database import get_all_claims

from database import create_database, insert_claim, compare_with_existing

# Masukkan data pertama
insert_claim(
    nama_lomba="National Hackathon 2025",
    tingkat="Nasional",
    tanggal="2025-06-15",
    peringkat="Juara 1",
    sertifikat_path="test_images/cert1.jpg"
)

# Sekarang bandingkan gambar baru
duplicates = compare_with_existing("test_images/cert2.jpg")

if duplicates:
    print("⚠ Potensi Duplikat Ditemukan:")
    for d in duplicates:
        print(f"ID: {d['id']}, Hamming Distance: {d['distance']}")
else:
    print("Tidak ada duplikat.")

# insert_claim(
#     nama_lomba="National Hackathon 2025",
#     tingkat="Nasional",
#     tanggal="2025-06-15",
#     peringkat="Juara 1",
#     sertifikat_path="test_images/cert3.jpg"
# )

# claims = get_all_claims()

# for claim in claims:
#     print(claim)

# text1 = "National Hackathon 2025 Juara 1"
# text2 = "Juara 1 National Hackathon"

# score = token_sort_ratio(text1, text2)

# print("Token Sort Ratio:", score)

# from image_hash import generate_phash, hamming_distance

# hash1 = generate_phash("test_images/cert1.jpg")
# hash2 = generate_phash("test_images/cert2.jpg")

# distance = hamming_distance(hash1, hash2)

# print("Hamming Distance:", distance)

# if score >= 85:
#     print("Potensi Duplikat dari Teks")

# if distance <= 10:
#     print("Potensi Duplikat dari Sertifikat")
