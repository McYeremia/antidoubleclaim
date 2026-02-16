from text_similarity import token_sort_ratio

text1 = "National Hackathon 2025 Juara 1"
text2 = "Juara 1 National Hackathon 2025"

score = token_sort_ratio(text1, text2)

print("Token Sort Ratio:", score)
