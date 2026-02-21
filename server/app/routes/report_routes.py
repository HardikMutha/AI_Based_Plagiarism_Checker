from flask import Blueprint, jsonify, send_file, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from app.models.report_model import Report
from app.utils.pdf_report import generate_pdf_report
import io

report_bp = Blueprint("reports", __name__)
@report_bp.route("/api/reports/<report_id>/pdf", methods=["GET"])
@jwt_required()
def download_report_pdf(report_id):
    """Generate and send a PDF of the report matching frontend style."""
    current_user_id = get_jwt_identity()
    try:
        report = Report.get_report(ObjectId(report_id))
    except Exception:
        return jsonify({"error": "Invalid report ID"}), 400
    if not report:
        return jsonify({"error": "Report not found"}), 404
    if report.get("user_id") != current_user_id:
        return jsonify({"error": "Unauthorized"}), 403

    # Prepare data for template
    data = report.get("report", {})
    type = data.get("type", "unknown")
    TYPE_CONFIG = {
        "ast_comparison": {"label": "Code — AST", "scoreScale": 100},
        "min_hash": {"label": "Text — MinHash", "scoreScale": 1},
        "semantic_similarity": {"label": "Text — Semantic", "scoreScale": 1},
        "code_ai_detection": {"label": "AI Detection", "scoreScale": 100},
    }
    FALLBACK_CONFIG = {"label": "Report", "scoreScale": 100}
    cfg = TYPE_CONFIG.get(type, FALLBACK_CONFIG)
    isAIDetection = type == "code_ai_detection"
    results = data.get("results")

    # Render PDF
    try:
        pdf_bytes = generate_pdf_report({
            "report": report,
            "data": data,
            "type": type,
            "cfg": cfg,
            "isAIDetection": isAIDetection,
            "results": results,
        })
    except Exception as e:
        import traceback
        return jsonify({"error": str(e), "traceback": traceback.format_exc()}), 500
    return send_file(
        io.BytesIO(pdf_bytes),
        mimetype="application/pdf",
        as_attachment=True,
        download_name=f"report-{report_id}.pdf"
    )


@report_bp.route("/api/reports", methods=["GET"])
@jwt_required()
def get_user_reports():
    """Return all reports belonging to the current user."""
    current_user_id = get_jwt_identity()
    reports = Report.get_reports_by_user(current_user_id)

    result = []
    for r in reports:
        r["_id"] = str(r["_id"])
        result.append(r)

    return jsonify({"reports": result}), 200


@report_bp.route("/api/reports/<report_id>", methods=["GET"])
@jwt_required()
def get_single_report(report_id):
    """Return a single report if it belongs to the current user."""
    current_user_id = get_jwt_identity()

    try:
        report = Report.get_report(ObjectId(report_id))
    except Exception:
        return jsonify({"error": "Invalid report ID"}), 400

    if not report:
        return jsonify({"error": "Report not found"}), 404

    if report.get("user_id") != current_user_id:
        return jsonify({"error": "Unauthorized"}), 403

    report["_id"] = str(report["_id"])
    return jsonify(report), 200


@report_bp.route("/api/reports/<report_id>", methods=["DELETE"])
@jwt_required()
def delete_report(report_id):
    """Delete a report if it belongs to the current user."""
    current_user_id = get_jwt_identity()

    try:
        report = Report.get_report(ObjectId(report_id))
    except Exception:
        return jsonify({"error": "Invalid report ID"}), 400

    if not report:
        return jsonify({"error": "Report not found"}), 404

    if report.get("user_id") != current_user_id:
        return jsonify({"error": "Unauthorized"}), 403

    Report.delete_report(ObjectId(report_id))
    return jsonify({"message": "Report deleted successfully"}), 200
