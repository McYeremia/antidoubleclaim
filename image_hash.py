from PIL import Image
import imagehash
import os
from pdf2image import convert_from_path

POPPLER_PATH = r"C:\poppler\Library\bin"

def generate_phash(file_path):

    extension = os.path.splitext(file_path)[1].lower()
    
    if extension == ".pdf":

        images = convert_from_path(
            file_path,
            poppler_path=POPPLER_PATH
        )

        image = images[0]  # ambil halaman pertama

    else:
        image = Image.open(file_path)

    phash = imagehash.phash(image)

    return phash

def hamming_distance(hash1, hash2):
    return hash1 - hash2
