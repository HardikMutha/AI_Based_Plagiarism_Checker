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
    """Detect whether uploaded code file(s) are AI-generated.

    Accepts either a single code file or a .zip containing multiple code files.
    Always returns { results: [...], total_files: N }.
    """
    current_user_id = get_jwt_identity()
    uploaded = request.files.get("file")

    if not uploaded:
        return jsonify({"error": "No file uploaded"}), 400

    ext = Path(uploaded.filename).suffix.lower()

    with tempfile.TemporaryDirectory() as tmp:
        file_path = os.path.join(tmp, uploaded.filename)
        uploaded.save(file_path)

        try:
            detector = AICodeDetector()

            if ext == ".zip":
                # ── Zip mode: extract and analyze every supported file ──
                extract_dir = os.path.join(tmp, "extract")
                os.makedirs(extract_dir, exist_ok=True)

                with zipfile.ZipFile(file_path, "r") as zf:
                    for member in zf.namelist():
                        member_path = os.path.join(extract_dir, member)
                        if not os.path.abspath(member_path).startswith(
                            os.path.abspath(extract_dir)
                        ):
                            raise ValueError("Unsafe ZIP file detected.")
                    zf.extractall(extract_dir)

                filepaths = []
                for root, _, files in os.walk(extract_dir):
                    for f in files:
                        if Path(f).suffix.lower() in SUPPORTED_CODE_EXTENSIONS:
                            filepaths.append(os.path.join(root, f))

                if not filepaths:
                    return jsonify({
                        "error": f"ZIP contains no supported code files. Supported: {', '.join(sorted(SUPPORTED_CODE_EXTENSIONS))}"
                    }), 400

                results = []
                for fp in filepaths:
                    r = detector.analyze_file(fp).as_dict()
                    # Use relative name inside the zip for clarity
                    r["file_name"] = os.path.relpath(fp, extract_dir)
                    results.append(r)

            else:
                # ── Single-file mode ──
                if ext not in SUPPORTED_CODE_EXTENSIONS:
                    return jsonify({
                        "error": f"Unsupported extension '{ext}'. Supported: {', '.join(sorted(SUPPORTED_CODE_EXTENSIONS))}"
                    }), 400

                result = detector.analyze_file(file_path).as_dict()
                results = [result]

            report = {
                "user_id": current_user_id,
                "total_files": len(results),
                "total_comparisons": 0,
                "type": "code_ai_detection",
                "results": results,
            }
            Report.create_report(current_user_id, report)
            print(report)   
            return jsonify(report)

        except Exception as e:
            return jsonify({"error": str(e)}), 400


@code_plag_bp.route("/languages")
def api_languages():
    return jsonify({"languages": ParserRegistry.supported_languages()})