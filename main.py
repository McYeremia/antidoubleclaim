from text_similarity import token_sort_ratio

text1 = "National Hackathon 2025 Juara 1"
text2 = "Juara 1 National Hackathon"

score = token_sort_ratio(text1, text2)

print("Token Sort Ratio:", score)

from image_hash import generate_phash, hamming_distance

hash1 = generate_phash("test_images/cert1.jpg")
hash2 = generate_phash("test_images/cert2.jpg")

distance = hamming_distance(hash1, hash2)

print("Hamming Distance:", distance)

if score >= 85:
    print("Potensi Duplikat dari Teks")

if distance <= 10:
    print("Potensi Duplikat dari Sertifikat")
