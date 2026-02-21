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

# Modularized zip extraction -- used by both code and text routes
from app.utils.extract_files import _extract_zip_and_collect_files


code_plag_bp = Blueprint("code_plagiarism", __name__)


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

            filepaths = _extract_zip_and_collect_files(zip_path, extract_dir, SUPPORTED_CODE_EXTENSIONS)

            detector = PlagiarismDetector()
            results = detector.batch_compare(filepaths)

            return jsonify({
                "total_files": len(filepaths),
                "total_comparisons": len(results),
                "results": [r.as_dict() for r in results]
            })

        except Exception as e:
            return jsonify({"error": str(e)}), 400


@code_plag_bp.route("/api/code/ai_detect", methods=["POST"])
def api_ai_detect():
    """Detect whether a single uploaded code file is AI-generated."""
    uploaded = request.files.get("file")

    if not uploaded:
        return jsonify({"error": "No file uploaded"}), 400

    ext = Path(uploaded.filename).suffix.lower()
    if ext not in SUPPORTED_CODE_EXTENSIONS:
        return jsonify({
            "error": f"Unsupported extension '{ext}'. Supported: {', '.join(sorted(SUPPORTED_CODE_EXTENSIONS))}"
        }), 400

    with tempfile.TemporaryDirectory() as tmp:
        file_path = os.path.join(tmp, uploaded.filename)
        uploaded.save(file_path)

        try:
            detector = AICodeDetector()
            result = detector.analyze_file(file_path)
            return jsonify(result.as_dict())
        except Exception as e:
            return jsonify({"error": str(e)}), 400


@code_plag_bp.route("/languages")
def api_languages():
    return jsonify({"languages": ParserRegistry.supported_languages()})