import os
import tempfile
import zipfile
from pathlib import Path
from flask import Blueprint, request, jsonify

from app.services.pdf_extraction import compare_pdfs

pdf_bp = Blueprint("pdf_analysis", __name__)

SUPPORTED_PDF_EXTENSIONS = {".pdf"}


def _extract_zip_pdfs(zip_path: str, extract_dir: str) -> list[str]:
    """Unzip and collect all PDF files."""
    with zipfile.ZipFile(zip_path, "r") as zf:
        for member in zf.namelist():
            member_path = os.path.join(extract_dir, member)
            if not os.path.abspath(member_path).startswith(os.path.abspath(extract_dir)):
                raise ValueError("Unsafe ZIP file detected.")
        zf.extractall(extract_dir)

    collected = []
    for root, _, files in os.walk(extract_dir):
        for f in files:
            if Path(f).suffix.lower() in SUPPORTED_PDF_EXTENSIONS:
                collected.append(os.path.join(root, f))

    if len(collected) < 2:
        raise ValueError("ZIP must contain at least TWO PDF files for comparison.")

    return collected


@pdf_bp.route("/api/pdf/compare", methods=["POST"])
def pdf_compare():
    """
    Accept either:
      - a single ZIP containing multiple PDFs, OR
      - multiple PDF files in the 'files' field
    Extracts images + tables from each PDF and does pairwise comparison.
    """
    uploaded_zip = request.files.get("file")
    uploaded_files = request.files.getlist("files")

    with tempfile.TemporaryDirectory() as tmp:
        pdf_paths = []

        if uploaded_zip and Path(uploaded_zip.filename).suffix.lower() == ".zip":
            zip_path = os.path.join(tmp, uploaded_zip.filename)
            uploaded_zip.save(zip_path)
            extract_dir = os.path.join(tmp, "extract")
            os.makedirs(extract_dir, exist_ok=True)
            pdf_paths = _extract_zip_pdfs(zip_path, extract_dir)

        elif uploaded_files and len(uploaded_files) >= 2:
            for uf in uploaded_files:
                if Path(uf.filename).suffix.lower() != ".pdf":
                    return jsonify({"error": f"'{uf.filename}' is not a PDF"}), 400
                fp = os.path.join(tmp, uf.filename)
                uf.save(fp)
                pdf_paths.append(fp)

        else:
            return jsonify({
                "error": "Upload a ZIP containing multiple PDFs, or at least 2 PDF files."
            }), 400

        try:
            result = compare_pdfs(pdf_paths)
            return jsonify(result)
        except Exception as e:
            return jsonify({"error": str(e)}), 400
