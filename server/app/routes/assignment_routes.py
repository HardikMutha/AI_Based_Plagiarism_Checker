#type:ignore
import os
import tempfile
import uuid
import zipfile
from pathlib import Path
from datetime import datetime as dt

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId

from app.models.assignment_model import Assignment, parse_filename
from app.models.report_model import Report
from app.utils.extract_files import _extract_zip_and_collect_files

SUPPORTED_CODE_EXTENSIONS = {".py", ".java", ".cpp", ".js", ".c", ".cs"}
SUPPORTED_TEXT_EXTENSIONS = {".txt", ".pdf", ".docx", ".doc", ".odt"}
SUPPORTED_PDF_EXTENSIONS = {".pdf"}

EXT_MAP = {
    "code": SUPPORTED_CODE_EXTENSIONS,
    "text": SUPPORTED_TEXT_EXTENSIONS,
    "pdf": SUPPORTED_PDF_EXTENSIONS,
}

assignment_bp = Blueprint("assignments", __name__)

def _serialize(doc):
    """Recursively convert ObjectId and datetime fields to strings."""
    if isinstance(doc, dict):
        return {k: _serialize(v) for k, v in doc.items()}
    elif isinstance(doc, list):
        return [_serialize(item) for item in doc]
    elif isinstance(doc, ObjectId):
        return str(doc)
    elif isinstance(doc, dt):
        return doc.isoformat()
    return doc


def _build_submissions_from_files(filepaths, filename_format):
    subs = []
    for fp in filepaths:
        fname = os.path.basename(fp)
        roll_no, student_name = parse_filename(fname, filename_format)
        subs.append({
            "type": "file",
            "original_name": fname,
            "stored_path": fp,
            "text_content": None,
            "roll_no": roll_no,
            "student_name": student_name,
        })
    return subs

@assignment_bp.route("", methods=["GET"])
@jwt_required()
def list_assignments():
    user_id = get_jwt_identity()
    assignments = Assignment.list_by_user(user_id)
    return jsonify({"assignments": [_serialize(a) for a in assignments]})


@assignment_bp.route("", methods=["POST"])
@jwt_required()
def create_assignment():
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}

    title = data.get("title", "").strip()
    if not title:
        return jsonify({"error": "Title is required."}), 400

    doc = Assignment.create(
        user_id=user_id,
        title=title,
        description=data.get("description", ""),
        submission_type=data.get("submission_type", "code"),
        filename_format=data.get("filename_format") or None,
    )
    return jsonify(_serialize(doc)), 201


@assignment_bp.route("/<assignment_id>", methods=["GET"])
@jwt_required()
def get_assignment(assignment_id):
    user_id = get_jwt_identity()
    try:
        doc = Assignment.get_by_id(ObjectId(assignment_id))
    except Exception:
        return jsonify({"error": "Invalid ID"}), 400

    if not doc or doc.get("user_id") != user_id:
        return jsonify({"error": "Not found"}), 404

    return jsonify(_serialize(doc))


@assignment_bp.route("/<assignment_id>", methods=["PUT"])
@jwt_required()
def update_assignment(assignment_id):
    user_id = get_jwt_identity()
    try:
        doc = Assignment.get_by_id(ObjectId(assignment_id))
    except Exception:
        return jsonify({"error": "Invalid ID"}), 400

    if not doc or doc.get("user_id") != user_id:
        return jsonify({"error": "Not found"}), 404

    data = request.get_json(silent=True) or {}
    allowed = {"title", "description", "submission_type", "filename_format"}
    updates = {k: v for k, v in data.items() if k in allowed}
    if updates:
        Assignment.update(ObjectId(assignment_id), updates)

    fresh = Assignment.get_by_id(ObjectId(assignment_id))
    return jsonify(_serialize(fresh))


@assignment_bp.route("/<assignment_id>", methods=["DELETE"])
@jwt_required()
def delete_assignment(assignment_id):
    user_id = get_jwt_identity()
    try:
        doc = Assignment.get_by_id(ObjectId(assignment_id))
    except Exception:
        return jsonify({"error": "Invalid ID"}), 400

    if not doc or doc.get("user_id") != user_id:
        return jsonify({"error": "Not found"}), 404

    Assignment.delete(ObjectId(assignment_id))
    return jsonify({"message": "Deleted"}), 200


@assignment_bp.route("/<assignment_id>/submissions", methods=["POST"])
@jwt_required()
def add_submissions(assignment_id):
    """
    Accept file uploads (zip or individual files) OR JSON text submissions.

    File upload: multipart/form-data with 'file' (zip) or 'files' (multiple)
    Text submission: JSON body with { submissions: [{ text_content, roll_no?, student_name? }] }
    """
    user_id = get_jwt_identity()
    try:
        doc = Assignment.get_by_id(ObjectId(assignment_id))
    except Exception:
        return jsonify({"error": "Invalid ID"}), 400

    if not doc or doc.get("user_id") != user_id:
        return jsonify({"error": "Not found"}), 404

    fmt = doc.get("filename_format")
    sub_type = doc.get("submission_type", "code")
    extensions = EXT_MAP.get(sub_type, SUPPORTED_CODE_EXTENSIONS)

    if request.is_json:
        data = request.get_json()
        text_subs = data.get("submissions", [])
        if not text_subs:
            return jsonify({"error": "No submissions provided."}), 400

        subs = []
        for ts in text_subs:
            content = ts.get("text_content", "").strip()
            if not content:
                continue
            subs.append({
                "type": "text",
                "original_name": ts.get("original_name"),
                "stored_path": None,
                "text_content": content,
                "roll_no": ts.get("roll_no"),
                "student_name": ts.get("student_name"),
            })

        if not subs:
            return jsonify({"error": "All submissions were empty."}), 400

        Assignment.add_submissions(ObjectId(assignment_id), subs)
        fresh = Assignment.get_by_id(ObjectId(assignment_id))
        return jsonify(_serialize(fresh))

    uploaded_zip = request.files.get("file")
    uploaded_files = request.files.getlist("files")

    if not uploaded_zip and not uploaded_files:
        return jsonify({"error": "No files uploaded."}), 400

    subs = []

    if uploaded_zip and Path(uploaded_zip.filename).suffix.lower() == ".zip":
        with tempfile.TemporaryDirectory() as tmp:
            zip_path = os.path.join(tmp, uploaded_zip.filename)
            uploaded_zip.save(zip_path)
            extract_dir = os.path.join(tmp, "extract")
            os.makedirs(extract_dir, exist_ok=True)

            with zipfile.ZipFile(zip_path, "r") as zf:
                for member in zf.namelist():
                    member_path = os.path.join(extract_dir, member)
                    if not os.path.abspath(member_path).startswith(
                        os.path.abspath(extract_dir)
                    ):
                        return jsonify({"error": "Unsafe ZIP."}), 400
                zf.extractall(extract_dir)

            for root, _, files in os.walk(extract_dir):
                for f in files:
                    if Path(f).suffix.lower() in extensions:
                        fp = os.path.join(root, f)
                        roll_no, student_name = parse_filename(f, fmt)

                        # Read file content and store in DB
                        with open(fp, "r", encoding="utf-8", errors="ignore") as fh:
                            content = fh.read()

                        subs.append({
                            "type": "file",
                            "original_name": f,
                            "stored_path": None,
                            "text_content": content,
                            "roll_no": roll_no,
                            "student_name": student_name,
                        })

    elif uploaded_files:
        for uf in uploaded_files:
            ext = Path(uf.filename).suffix.lower()
            if ext not in extensions:
                continue
            roll_no, student_name = parse_filename(uf.filename, fmt)

            content = uf.read().decode("utf-8", errors="ignore")

            subs.append({
                "type": "file",
                "original_name": uf.filename,
                "stored_path": None,
                "text_content": content,
                "roll_no": roll_no,
                "student_name": student_name,
            })

    if not subs:
        return jsonify({"error": "No valid files found in upload."}), 400

    Assignment.add_submissions(ObjectId(assignment_id), subs)
    fresh = Assignment.get_by_id(ObjectId(assignment_id))
    return jsonify(_serialize(fresh))


@assignment_bp.route(
    "/<assignment_id>/submissions/<submission_id>", methods=["DELETE"]
)
@jwt_required()
def remove_submission(assignment_id, submission_id):
    user_id = get_jwt_identity()
    try:
        doc = Assignment.get_by_id(ObjectId(assignment_id))
    except Exception:
        return jsonify({"error": "Invalid ID"}), 400

    if not doc or doc.get("user_id") != user_id:
        return jsonify({"error": "Not found"}), 404

    Assignment.remove_submission(ObjectId(assignment_id), submission_id)
    return jsonify({"message": "Removed"}), 200


@assignment_bp.route("/<assignment_id>/analyze", methods=["POST"])
@jwt_required()
def run_analysis(assignment_id):
    """
    Run an analysis on all submissions in the assignment.

    JSON body: { "type": "ast_comparison" | "min_hash" | "semantic_similarity"
                         | "code_ai_detection" }

    Creates a Report and links it to the assignment.
    """
    user_id = get_jwt_identity()
    try:
        doc = Assignment.get_by_id(ObjectId(assignment_id))
    except Exception:
        return jsonify({"error": "Invalid ID"}), 400

    if not doc or doc.get("user_id") != user_id:
        return jsonify({"error": "Not found"}), 404

    data = request.get_json(silent=True) or {}
    analysis_type = data.get("type", "")

    submissions = doc.get("submissions", [])
    if not submissions:
        return jsonify({"error": "No submissions to analyze."}), 400

    # Write submissions to temp files for analysis
    with tempfile.TemporaryDirectory() as tmp:
        filepaths = []
        sub_type = doc.get("submission_type", "code")

        # Default extension for text submissions
        default_ext = {
            "code": ".py",
            "text": ".txt",
            "pdf": ".pdf",
        }.get(sub_type, ".txt")

        for sub in submissions:
            if sub.get("text_content"):
                # Write text content to a temp file
                fname = sub.get("original_name") or f"{sub.get('id', uuid.uuid4().hex)}{default_ext}"
                fp = os.path.join(tmp, fname)
                # Ensure unique filename
                if os.path.exists(fp):
                    base, ext = os.path.splitext(fname)
                    fp = os.path.join(tmp, f"{base}_{uuid.uuid4().hex[:6]}{ext}")
                    fname = os.path.basename(fp)
                with open(fp, "w", encoding="utf-8") as f:
                    f.write(sub["text_content"])
                filepaths.append(fp)

        if len(filepaths) < 1:
            return jsonify({"error": "No processable submissions."}), 400

        try:
            report_data = _run_detector(analysis_type, filepaths, user_id)
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            return jsonify({"error": str(e)}), 500

        # Save to Report collection (same as existing routes)
        result = Report.create_report(user_id, report_data)
        report_id = result.inserted_id

        # Link analysis to assignment
        Assignment.add_analysis(ObjectId(assignment_id), analysis_type, report_id)

        report_data["_id"] = str(report_id)
        return jsonify(report_data)


def _run_detector(analysis_type, filepaths, user_id):
    """
    Dispatch to the correct detector based on analysis_type.
    Returns the report dict (same format as existing routes produce).
    """

    if analysis_type == "ast_comparison":
        from app.services.code_plagiarism_detector.detector import PlagiarismDetector

        if len(filepaths) < 2:
            raise ValueError("Need at least 2 files for AST comparison.")

        detector = PlagiarismDetector()
        results = detector.batch_compare(filepaths)
        return {
            "user_id": user_id,
            "total_files": len(filepaths),
            "total_comparisons": len(results),
            "type": "ast_comparison",
            "results": [r.as_dict() for r in results],
        }

    elif analysis_type == "min_hash":
        from app.services.text_plagiarism_detector.min_hash import MinHashUtils

        if len(filepaths) < 2:
            raise ValueError("Need at least 2 files for MinHash comparison.")

        mh = MinHashUtils()
        results = mh.compare_files(filepaths)
        return {
            "user_id": user_id,
            "total_files": len(filepaths),
            "total_comparisons": len(results),
            "type": "min_hash",
            "results": results,
        }

    elif analysis_type == "semantic_similarity":
        from app.services.text_plagiarism_detector.semantic_similarity import SemanticUtils

        if len(filepaths) < 2:
            raise ValueError("Need at least 2 files for semantic comparison.")

        sem = SemanticUtils()
        results = sem.compare_files(filepaths)
        return {
            "user_id": user_id,
            "total_files": len(filepaths),
            "total_comparisons": len(results),
            "type": "semantic_similarity",
            "results": results,
        }

    elif analysis_type == "code_ai_detection":
        from app.services.code_plagiarism_detector.ai_detector import AICodeDetector

        if len(filepaths) < 1:
            raise ValueError("Need at least 1 file for AI detection.")

        detector = AICodeDetector()
        results = []
        for fp in filepaths:
            result = detector.analyze_file(fp).as_dict()
            results.append(result)
        return {
            "user_id": user_id,
            "total_files": len(filepaths),
            "total_comparisons": 0,
            "type": "code_ai_detection",
            "results": results,
        }

    else:
        raise ValueError(
            f"Unknown analysis type '{analysis_type}'. "
            "Supported: ast_comparison, min_hash, semantic_similarity, code_ai_detection"
        )
