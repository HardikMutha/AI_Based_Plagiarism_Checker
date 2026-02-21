import os
import sys
import tempfile
from pathlib import Path
import zipfile
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from numpy import rint

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

SUPPORTED_CODE_EXTENSIONS = {".py", ".java", ".cpp", ".js", ".c", ".cs"}

from  app.services.code_plagiarism_detector.detector import PlagiarismDetector
from  app.services.code_plagiarism_detector.ai_detector import AICodeDetector
from  app.services.code_plagiarism_detector.registry import ParserRegistry
from app.models.report_model import Report


# Modularized zip extraction -- used by both code and text routes
from app.utils.extract_files import _extract_zip_and_collect_files


code_plag_bp = Blueprint("code_plagiarism", __name__)


@code_plag_bp.route("/api/code/batch_compare", methods=["POST"])
@jwt_required()
def api_batch_compare():
    current_user_id = get_jwt_identity()
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

            report = {
                "user_id": current_user_id,
                "total_files": len(filepaths),
                "total_comparisons": len(results),
                "type": "ast_comparison",
                "results": [r.as_dict() for r in results]
            }

            Report.create_report(current_user_id, report)
            return jsonify(report)

        except Exception as e:
            return jsonify({"error": str(e)}), 400


@code_plag_bp.route("/api/code/ai_detect", methods=["POST"])
@jwt_required()
def api_ai_detect():
    current_user_id = get_jwt_identity()
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
            result = detector.analyze_file(file_path).as_dict()
            report = {
                "user_id": current_user_id,
                "total_files": 1,
                "total_comparisons": 0,
                "type": "code_ai_detection",
                "results": result
            }
            current_user_id = get_jwt_identity()
            Report.create_report(current_user_id, report)
            return jsonify(result)
        except Exception as e:
            return jsonify({"error": str(e)}), 400


@code_plag_bp.route("/languages")
def api_languages():
    return jsonify({"languages": ParserRegistry.supported_languages()})