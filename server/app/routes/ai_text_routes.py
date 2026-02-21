#type:ignore
import os
import sys
import tempfile
from app.utils.extract_files import _extract_zip_and_collect_files
from pathlib import Path

from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt

from app.models.report_model import Report


_AI_TEXT_DIR = str(
    Path(__file__).resolve().parent.parent / "services" / "ai_text_detection"
)
if _AI_TEXT_DIR not in sys.path:
    sys.path.insert(0, _AI_TEXT_DIR)

from detector import detect

ai_text_bp = Blueprint("ai_text", __name__)

SUPPORTED_FILE_EXTENSIONS = {".txt", ".pdf", ".docx"}


def _extract_text(filepath: str, ext: str) -> str:
    """Read text content from an uploaded file."""
    if ext == ".txt":
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()

    if ext == ".pdf":
        import PyPDF2

        text_parts: list[str] = []
        with open(filepath, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
        return "\n".join(text_parts)

    if ext == ".docx":
        import docx

        doc = docx.Document(filepath)
        return "\n".join(p.text for p in doc.paragraphs)

    return ""



@ai_text_bp.route("/api/ai-text/batch-process/",methods=["POST"])
@jwt_required()
def batch_compare():
    current_user_id = get_jwt_identity()
    my_files = request.files.get("file")
    
    if(not my_files):
        return jsonify({"error":"No file uploaded"}),400

    if Path(my_files.filename).suffix.lower() != ".zip":
        return jsonify({"error": "Only .zip files are allowed"}), 400

    with tempfile.TemporaryDirectory() as tmp:
        zip_path = os.path.join(tmp, my_files.filename)
        my_files.save(zip_path)
        try:
            extracted_dir = os.path.join(tmp, "extract")
            os.makedirs(extracted_dir, exist_ok=True)
            filepaths = _extract_zip_and_collect_files(
                zip_path, extracted_dir, SUPPORTED_FILE_EXTENSIONS, min_files=1
            )

            resp = []
            for file_path in filepaths:
                ext = Path(file_path).suffix.lower()
                text = _extract_text(file_path, ext)
                if text and text.strip():
                    result = detect(text)
                    result["filename"] = os.path.basename(file_path)
                    resp.append(result)

            
            report = {
                "user_id": current_user_id,
                "total_files": len(filepaths),
                "total_comparisons": len(resp),
                "type": "text_ai",
                "results": resp
            }
            Report.create_report(current_user_id, report)

            return jsonify({"result":[{
                "total_files": len(filepaths),
                "total_comparisons": len(resp),
                "results": resp
            }]})
        except Exception as e:
            return jsonify({"error": str(e)}), 400



@ai_text_bp.route("/api/ai-text/predict", methods=["POST"])
@jwt_required
def predict():
    """
    Accept file uploads and return AI-text-detection results.

    Expects multipart/form-data with:
        file   .txt, .pdf, or .docx file
        prompt (optional)  the original assignment prompt (improves detection)

    Returns JSON:
        { score, verdict, layer_details }
    """
    current_user_id = get_jwt_identity()
    uploaded = request.files.get("file")
    if not uploaded:
        return jsonify({"error": "No file uploaded. Send a file with key 'file'."}), 400

    ext = Path(uploaded.filename).suffix.lower()
    if ext not in SUPPORTED_FILE_EXTENSIONS:
        return jsonify({
            "error": f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(SUPPORTED_FILE_EXTENSIONS))}"
        }), 400

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            uploaded.save(tmp)
            tmp_path = tmp.name

        text = _extract_text(tmp_path, ext)

        if not text or not text.strip():
            return jsonify({"error": "Could not extract any text from the uploaded file."}), 400

        assignment_prompt = request.form.get("prompt")

        result = detect(text, assignment_prompt=assignment_prompt)

        final_result = {"result":[result]}

        # Create a report for this single file
        report = {
            "user_id": current_user_id,
            "total_files": len(final_result["result"]),
            "total_comparisons": 1,
            "type": "text_ai",
            "results": [result]
        }
        Report.create_report(current_user_id, report)

        return jsonify(final_result), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        if "tmp_path" in locals() and os.path.exists(tmp_path):
            os.remove(tmp_path)
