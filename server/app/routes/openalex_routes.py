from flask import Blueprint, request, jsonify
from app.services.citation_service import get_suspicious_with_context
from app.services.openalex_service import fetch_openalex_for_contexts

openalex_bp = Blueprint("openalex", __name__)

@openalex_bp.route("/analyze", methods=["POST"])
def analyze_assignment():

    data = request.json
    text = data.get("text")

    if not text:
        return jsonify({"error": "Text required"}), 400

    try:

        suspicious = get_suspicious_with_context(text)
        papers = fetch_openalex_for_contexts(suspicious)

        return jsonify({
            "suspicious_sentences": [
            i["sentence"] for i in suspicious
        ],
            "candidate_papers": papers
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500