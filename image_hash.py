from PIL import Image
import imagehash

def generate_phash(image_path):
    image = Image.open(image_path)
    return imagehash.phash(image)

def hamming_distance(hash1, hash2):
    return hash1 - hash2
