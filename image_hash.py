from PIL import Image
import imagehash

def generate_phash(image_path):
    image = Image.open(image_path)
    phash = imagehash.phash(image)
    return phash

def hamming_distance(hash1, hash2):
    return hash1 - hash2
