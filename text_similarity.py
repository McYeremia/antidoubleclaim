from rapidfuzz import fuzz

def normalize_text(text):
    return text.lower().strip()

def token_sort_ratio(text1, text2):
    t1 = normalize_text(text1)
    t2 = normalize_text(text2)
    return fuzz.token_sort_ratio(t1, t2)
