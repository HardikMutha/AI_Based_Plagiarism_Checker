import os
import sys
import tempfile
from pathlib import Path
import zipfile
from flask import Blueprint, request, jsonify
from numpy import rint

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

SUPPORTED_CODE_EXTENSIONS = {".py", ".java", ".cpp", ".js", ".c", ".cs"}

from  app.services.code_plagiarism_detector.detector import PlagiarismDetector
from  app.services.code_plagiarism_detector.ai_detector import AICodeDetector
from  app.services.code_plagiarism_detector.registry import ParserRegistry


code_plag_bp = Blueprint("code_plagiarism", __name__)



def _extract_zip_and_collect_files(zip_path: str, extract_dir: str) -> list[str]:
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
            if Path(f).suffix.lower() in SUPPORTED_CODE_EXTENSIONS:
                collected.append(os.path.join(root, f))

    if len(collected) < 2:
        raise ValueError("ZIP must contain at least TWO supported code files.")

    return collected

@code_plag_bp.route("/api/code/batch_compare", methods=["POST"])
def api_batch_compare():
    uploaded= request.files.get("file")

    if not uploaded:
        return jsonify({"error": "No file uploaded"}), 400
    
    if Path(uploaded.filename).suffix.lower() != ".zip":
        return jsonify({"error": "Only .zip files are allowed"}), 400
    
    with tempfile.TemporaryDirectory() as tmp:
        zip_path = os.path.join(tmp, uploaded.filename)
        uploaded.save(zip_path)

        try:
            extract_dir = os.path.join(tmp, "extract")
            os.makedirs(extract_dir, exist_ok=True)

            filepaths = _extract_zip_and_collect_files(zip_path, extract_dir)

            detector = PlagiarismDetector()
            results = detector.batch_compare(filepaths)

            return jsonify({
                "total_files": len(filepaths),
                "total_comparisons": len(results),
                "results": [r.as_dict() for r in results]
            })

        except Exception as e:
            return jsonify({"error": str(e)}), 400


@code_plag_bp.route("/languages")
def api_languages():
    return jsonify({"languages": ParserRegistry.supported_languages()})