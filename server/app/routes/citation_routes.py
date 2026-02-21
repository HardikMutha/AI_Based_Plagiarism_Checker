import os
import tempfile
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.services.citation_service import get_suspicious_with_context
from app.services.openalex_service import fetch_openalex_for_contexts
from app.services.arxiv_service import fetch_arxiv_for_contexts
citation_bp = Blueprint("citation_bp", __name__)


def extract_text_from_file(file_storage):
    """Extract text content from uploaded file based on its extension."""
    filename = file_storage.filename.lower()

    if filename.endswith(".txt"):
        return file_storage.read().decode("utf-8", errors="ignore")

    elif filename.endswith(".pdf"):
        try:
            import PyPDF2
            tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
            file_storage.save(tmp.name)
            tmp.close()

            text_parts = []
            with open(tmp.name, "rb") as f:
                reader = PyPDF2.PdfReader(f)
                for page in reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text_parts.append(page_text)

            os.unlink(tmp.name)
            return "\n".join(text_parts)
        except ImportError:
            raise ValueError("PDF processing is not available. Install PyPDF2.")

    elif filename.endswith(".docx"):
        try:
            import docx
            tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".docx")
            file_storage.save(tmp.name)
            tmp.close()

            doc = docx.Document(tmp.name)
            text_parts = [para.text for para in doc.paragraphs if para.text.strip()]
            os.unlink(tmp.name)
            return "\n".join(text_parts)
        except ImportError:
            raise ValueError("DOCX processing is not available. Install python-docx.")

    else:
        raise ValueError(f"Unsupported file type: {filename}. Use .txt, .pdf, or .docx files.")


@citation_bp.route("/check", methods=["POST"])
@jwt_required()
def check_citations():
    """
    Accepts either:
      - JSON body with { "text": "..." }
      - multipart/form-data with a file field named "file"
        (optionally combined with a "text" field)
    Returns suspicious sentences and candidate citation papers.
    """
    text = ""

    # Handle file upload
    if "file" in request.files:
        uploaded = request.files["file"]
        if uploaded.filename:
            try:
                text = extract_text_from_file(uploaded)
            except ValueError as e:
                return jsonify({"error": str(e)}), 400

    # Handle text input (either from form-data or JSON)
    if not text:
        if request.is_json:
            data = request.get_json()
            text = data.get("text", "")
        else:
            text = request.form.get("text", "")

    # remove \n from text
    text = text.replace("\n", " ")
    if not text or len(text.strip()) < 300:
        return jsonify({
            "error": "Please provide at least 300 characters of text for meaningful citation analysis."
        }), 400

    try:
        suspicious = get_suspicious_with_context(text)

        if not suspicious:
            return jsonify({
                "suspicious_sentences": [],
                "candidate_papers": [],
                "message": "No sentences requiring citations were detected in the provided text."
            })

        openalex_papers = fetch_openalex_for_contexts(suspicious)
        arxiv_papers = fetch_arxiv_for_contexts(suspicious)

        # Merge and deduplicate papers by (title, doi)
        all_papers = openalex_papers + arxiv_papers
        seen = {}
        for p in all_papers:
            key = (
                (p.get("title") or "").strip().lower(),
                (p.get("doi") or "").strip().lower()
            )
            if key in seen:
                existing = seen[key]
                # Collect unique matched sentences
                ms = p.get("matched_sentence", "")
                if ms and ms not in existing["matched_sentences"]:
                    existing["matched_sentences"].append(ms)
                # Keep best similarity and its source
                if (p.get("similarity", 0) or 0) > (existing.get("similarity", 0) or 0):
                    existing["similarity"] = p["similarity"]
                    existing["source"] = p.get("source", "openalex")
            else:
                ms = p.pop("matched_sentence", "")
                p["matched_sentences"] = [ms] if ms else []
                p.setdefault("source", "openalex")
                seen[key] = p

        unique_papers = list(seen.values())
        unique_papers.sort(key=lambda x: x.get("similarity", 0), reverse=True)
        unique_papers = unique_papers[:5]

        return jsonify({
            "suspicious_sentences": suspicious,
            "candidate_papers": unique_papers
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500
