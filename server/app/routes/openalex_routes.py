from flask import Blueprint, request, jsonify
from app.services.citation_service import filter_suspicious_sentences
from app.services.openalex_service import fetch_openalex_for_sentences

openalex_bp = Blueprint("openalex", __name__)

@openalex_bp.route("/analyze", methods=["POST"])
def analyze_assignment():

    data = request.json
    text = data.get("text")

    if not text:
        return jsonify({"error": "Text required"}), 400

    try:

        suspicious = filter_suspicious_sentences(text)

        papers = fetch_openalex_for_sentences(suspicious)

        return jsonify({
            "suspicious_sentences": suspicious,
            "candidate_papers": papers
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500