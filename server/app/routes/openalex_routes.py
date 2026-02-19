from flask import Blueprint, request, jsonify
from app.services.openalex_service import fetch_openalex_papers
from app.models.paper_model import save_papers

openalex_bp = Blueprint("openalex", __name__)

@openalex_bp.route("/search/openalex", methods=["POST"])
def search_openalex():

    data = request.json
    chunk = data.get("chunk")

    if not chunk:
        return jsonify({"error": "Chunk required"}), 400

    try:
        papers, query = fetch_openalex_papers(chunk)
        save_papers(papers)

        return jsonify({
            "query": query,
            "papers": papers
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500