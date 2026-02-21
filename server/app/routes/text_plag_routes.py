import os
import sys
import tempfile
from pathlib import Path
import zipfile
import textract
import json
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

SUPPORTED_TEXT_EXTENSIONS = {".txt", ".pdf", ".docx", ".doc", ".odt"}

from  app.services.text_plagiarism_detector.min_hash import MinHashUtils
from  app.services.text_plagiarism_detector.semantic_similarity import SemanticUtils 
from app.utils.extract_files import _extract_zip_and_collect_files
from app.models.report_model import Report

text_plag_bp = Blueprint("text_plagiarism", __name__)


@text_plag_bp.route("/api/text/minhash", methods=["POST"])
@jwt_required()
def minhash_compare():
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

            filepaths = _extract_zip_and_collect_files(zip_path, extract_dir, SUPPORTED_TEXT_EXTENSIONS)

            minHash = MinHashUtils()
            results = minHash.compare_files(filepaths)
    
            report = {
                "user_id": current_user_id,
                "total_files": len(filepaths),
                "total_comparisons": len(results),
                "type": "min_hash",
                "results": results
            }
            Report.create_report(current_user_id, report)
            return jsonify(report)

        except Exception as e:
            return jsonify({"error": str(e)}), 400
        

@text_plag_bp.route("/api/text/semantic_similarity", methods=["POST"])
@jwt_required()
def semantic_similarity():
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

            filepaths = _extract_zip_and_collect_files(zip_path, extract_dir, SUPPORTED_TEXT_EXTENSIONS)

            semantic = SemanticUtils()
            results = semantic.compare_files(filepaths)

            report = {
                "user_id": current_user_id,
                "total_files": len(filepaths),
                "total_comparisons": len(results),
                "type": "semantic_similarity",
                "results": results
            }
            Report.create_report(current_user_id, report)
            return jsonify(report)

        except Exception as e:
            return jsonify({"error": str(e)}), 400