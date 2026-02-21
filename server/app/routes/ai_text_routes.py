#type:ignore
import os
import sys
import tempfile
from pathlib import Path

from flask import Blueprint, request, jsonify

_AI_TEXT_DIR = str(
    Path(__file__).resolve().parent.parent / "services" / "ai_text_detection"
)
if _AI_TEXT_DIR not in sys.path:
    sys.path.insert(0, _AI_TEXT_DIR)

from detector import detect

ai_text_bp = Blueprint("ai_text", __name__)

ALLOWED_EXTENSIONS = {".txt", ".pdf", ".docx"}


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


@ai_text_bp.route("/api/ai-text/predict", methods=["POST"])
def predict():
    """
    Accept a file upload and return AI-text-detection results.

    Expects multipart/form-data with:
        file  — .txt, .pdf, or .docx file
        prompt (optional) — the original assignment prompt (improves detection)

    Returns JSON:
        { score, verdict, layer_details }
    """
    uploaded = request.files.get("file")
    if not uploaded:
        return jsonify({"error": "No file uploaded. Send a file with key 'file'."}), 400

    ext = Path(uploaded.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        return jsonify({
            "error": f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
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

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        if "tmp_path" in locals() and os.path.exists(tmp_path):
            os.remove(tmp_path)
