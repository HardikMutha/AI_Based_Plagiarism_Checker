import os
import sys
import tempfile
from pathlib import Path
import textract
import re
import zipfile

def _extract_zip_and_collect_files(zip_path: str, extract_dir: str, SUPPORTED_EXTENSIONS: list) -> list[str]:
    with zipfile.ZipFile(zip_path, "r") as zip_ref:

        for member in zip_ref.namelist():
            member_path = os.path.join(extract_dir, member)
            if not os.path.abspath(member_path).startswith(
                os.path.abspath(extract_dir)
            ):
                raise ValueError("Unsafe ZIP file detected.")

        zip_ref.extractall(extract_dir)

    collected = []

    for root, _, files in os.walk(extract_dir):
        for f in files:
            if Path(f).suffix.lower() in SUPPORTED_EXTENSIONS:
                collected.append(os.path.join(root, f))

    if len(collected) < 2:
        raise ValueError("ZIP must contain at least TWO supported files.")


    return collected

def clean_text(text: str) -> str:
    text = re.sub(r'[\u200b\u200c\u200d\ufeff]', '', text)  # zero-width chars
    text = re.sub(r'[\f\r]', '\n', text)                    # form feeds
    text = re.sub(r'\n{3,}', '\n\n', text)                  # collapse blank lines
    text = re.sub(r'[ \t]{2,}', ' ', text)                  # collapse spaces
    return text.strip()


def extract_text(filepath: str) -> str:
    try:
        text = textract.process(filepath)
        text = text.decode("utf-8", errors="ignore")
        return clean_text(text)
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        raise