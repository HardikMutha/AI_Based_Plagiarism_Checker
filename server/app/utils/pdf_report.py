# from flask import render_template_string
# from weasyprint import HTML
# import os

# def generate_pdf_report(report_data):
#     rtype = report_data.get("type")
#     score_scale = 1 # if rtype in ["min_hash", "semantic_similarity"] else 100
#     report_data["score_scale"] = score_scale
    
#     html = render_template_string(REPORT_TEMPLATE, **report_data)
#     pdf = HTML(string=html, base_url="/").write_pdf()
#     return pdf

# # This template should match the frontend style as closely as possible.
# # You can expand this with CSS and HTML to match your React layout.
# REPORT_TEMPLATE = """
# <!DOCTYPE html>
# <html lang='en'>
# <head>
#     <meta charset='UTF-8'>
#     <title>{{ cfg.label }} Report</title>
#     <style>
#         @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
#         @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;600&display=swap');

#         body { font-family: 'Inter', sans-serif; background: #ffffff; color: #0f172a; margin: 0; padding: 0; }
#         .container { max-width: 800px; margin: 0 auto; padding: 32px 40px; }
        
#         .header { margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0; }
#         .header h2 { font-size: 1.875rem; font-weight: 700; margin: 0 0 4px 0; color: #0f172a; letter-spacing: -0.025em; }
#         .header p { color: #64748b; font-size: 0.875rem; margin: 0; }

#         .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px; box-sizing: border-box; }
        
#         .grid-4 { display: table; width: 100%; table-layout: auto; }
#         .grid-4-col { display: table-cell; vertical-align: top; padding-right: 24px; }
        
#         .meta-label { color: #64748b; font-size: 0.875rem; margin-bottom: 4px; }
#         .meta-value { font-weight: 500; font-size: 0.875rem; color: #0f172a; }
#         .meta-value-mono { font-family: 'Roboto Mono', monospace; font-size: 0.75rem; word-break: break-all; }

#         .section-title { font-size: 1.25rem; font-weight: 600; margin: 32px 0 16px 0; color: #0f172a; }

#         .verdict { font-weight: 700; font-size: 0.875rem; }
#         .verdict.red { color: #dc2626; }
#         .verdict.amber { color: #d97706; }
#         .verdict.green { color: #16a34a; }

#         .ai-prob { font-family: 'Roboto Mono', monospace; font-size: 1.125rem; font-weight: 700; }
#         .ai-prob.red { color: #dc2626; }
#         .ai-prob.amber { color: #d97706; }
#         .ai-prob.green { color: #16a34a; }

#         .progress-bg { height: 12px; background: #f1f5f9; border-radius: 9999px; overflow: hidden; margin-top: 8px; width: 100%; }
#         .progress-bar { height: 100%; border-radius: 9999px; }
#         .progress-bar.red { background: #ef4444; }
#         .progress-bar.amber { background: #f59e0b; }
#         .progress-bar.green { background: #22c55e; }

#         .progress-labels { display: table; width: 100%; margin-top: 4px; color: #64748b; font-size: 0.625rem; }
#         .progress-label-left { display: table-cell; text-align: left; }
#         .progress-label-right { display: table-cell; text-align: right; }

#         ul { margin-top: 8px; margin-bottom: 0; padding-left: 20px; color: #64748b; font-size: 0.875rem; line-height: 1.5; }
#         li { margin-bottom: 4px; }

#         .signal-row { display: table; width: 100%; margin-bottom: 8px; }
#         .signal-label { display: table-cell; width: 180px; font-size: 0.75rem; color: #64748b; vertical-align: middle; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 12px; }
#         .signal-bar-container { display: table-cell; vertical-align: middle; }
#         .signal-pct { display: table-cell; width: 40px; text-align: right; font-family: 'Roboto Mono', monospace; font-size: 0.75rem; color: #0f172a; vertical-align: middle; padding-left: 12px; }
        
#         .signal-progress-bg { height: 6px; background: #f1f5f9; border-radius: 9999px; overflow: hidden; width: 100%; }
        
#         .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 0.6875rem; font-weight: 600; }
#         .badge-red { background: rgba(239, 68, 68, 0.08); color: #dc2626; border: 1px solid rgba(239, 68, 68, 0.3); }
#         .badge-amber { background: rgba(245, 158, 11, 0.08); color: #d97706; border: 1px solid rgba(245, 158, 11, 0.3); }
#         .badge-green { background: rgba(34, 197, 94, 0.08); color: #16a34a; border: 1px solid rgba(34, 197, 94, 0.3); }
        
#         .badge-outline { background: transparent; border: 1px solid #e2e8f0; color: #0f172a; font-family: 'Roboto Mono', monospace; font-weight: 500; font-size: 0.625rem; padding: 1px 6px; border-radius: 4px; }

#         /* Comparison Card */
#         .comp-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 16px; background: #ffffff; page-break-inside: avoid; }
#         .comp-card.border-red { border-color: rgba(239, 68, 68, 0.25); }
#         .comp-card.border-amber { border-color: rgba(245, 158, 11, 0.25); }
#         .comp-card.border-green { border-color: rgba(34, 197, 94, 0.25); }
        
#         .comp-header { display: table; width: 100%; margin-bottom: 16px; }
#         .comp-title-area { display: table-cell; vertical-align: top; }
#         .comp-score-area { display: table-cell; vertical-align: top; text-align: right; width: 140px; }
        
#         .comp-title { font-size: 0.875rem; font-weight: 600; color: #0f172a; margin: 0 0 6px 0; }
#         .comp-title .vs { font-weight: 400; color: #64748b; margin: 0 6px; }
        
#         .comp-score-val { font-family: 'Roboto Mono', monospace; font-size: 1.5rem; font-weight: 700; margin-left: 12px; display: inline-block; vertical-align: middle; }
#         .comp-score-val span { font-size: 0.875rem; font-weight: 400; color: #64748b; }
#         .comp-score-val.text-red { color: #dc2626; }
#         .comp-score-val.text-amber { color: #d97706; }
#         .comp-score-val.text-green { color: #16a34a; }

#         .comp-score-bar-container { display: inline-block; width: 60px; vertical-align: middle; margin-top: 4px; }
        
#         .diff-container { margin-top: 16px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
#         .diff-header { display: table; width: 100%; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-family: 'Roboto Mono', monospace; font-size: 0.6875rem; font-weight: 500; color: #64748b; }
#         .diff-h-left { display: table-cell; width: 45%; padding: 8px 12px; }
#         .diff-h-mid { display: table-cell; width: 10%; text-align: center; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; }
#         .diff-h-right { display: table-cell; width: 45%; padding: 8px 12px; }
        
#         .diff-row { display: table; width: 100%; border-bottom: 1px solid #f1f5f9; page-break-inside: avoid; }
#         .diff-row:last-child { border-bottom: none; }
        
#         .diff-cell { display: table-cell; padding: 0; vertical-align: top; }
        
#         .diff-code-wrapper { display: table; width: 100%; table-layout: fixed; }
#         .diff-line-num { display: table-cell; width: 40px; text-align: right; padding: 6px 8px 6px 4px; font-family: 'Roboto Mono', monospace; font-size: 0.6875rem; color: #94a3b8; user-select: none; border-right: 1px solid rgba(226, 232, 240, 0.5); }
#         .diff-code { display: table-cell; padding: 6px 8px; font-family: 'Roboto Mono', monospace; font-size: 0.75rem; color: #0f172a; white-space: pre-wrap; word-wrap: break-word; }
        
#         .match-pct { display: table-cell; width: 10%; text-align: center; vertical-align: middle; border-left: 1px solid rgba(226, 232, 240, 0.5); border-right: 1px solid rgba(226, 232, 240, 0.5); background: #f8fafc; font-family: 'Roboto Mono', monospace; font-size: 0.625rem; font-weight: 600; }
#         .match-pct.text-red { color: #dc2626; }
#         .match-pct.text-amber { color: #d97706; }
        
#         .bg-red-light { background: rgba(239, 68, 68, 0.08); }
#         .bg-amber-light { background: rgba(245, 158, 11, 0.06); }
        
#         /* Semantics Chunk Diff */
#         .chunk-container { border: 1px solid #e2e8f0; border-radius: 8px; margin-top: 12px; overflow: hidden; page-break-inside: avoid; }
#         .chunk-header { display: table; width: 100%; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
#         .chunk-h-left { display: table-cell; width: 45%; padding: 6px 12px; font-family: 'Roboto Mono', monospace; font-size: 0.6875rem; color: #64748b; font-weight: 500; }
#         .chunk-h-mid { display: table-cell; width: 10%; text-align: center; font-family: 'Roboto Mono', monospace; font-size: 0.625rem; color: #64748b; vertical-align: middle; }
#         .chunk-h-right { display: table-cell; width: 45%; padding: 6px 12px; font-family: 'Roboto Mono', monospace; font-size: 0.6875rem; color: #64748b; font-weight: 500; text-align: right; }
        
#         .chunk-body { display: table; width: 100%; table-layout: fixed; }
#         .chunk-side { display: table-cell; width: 50%; padding: 12px; font-size: 0.75rem; color: #0f172a; line-height: 1.6; white-space: pre-wrap; vertical-align: top; }
#         .chunk-side:first-child { border-right: 1px solid rgba(226, 232, 240, 0.5); }
        
#         .chunk-bg-red { background: rgba(239, 68, 68, 0.04); }
#         .chunk-bg-amber { background: rgba(245, 158, 11, 0.03); }

#         .summary-title { font-size: 0.75rem; font-weight: 500; color: #64748b; margin: 16px 0 8px 0; }
#     </style>
# </head>
# <body>
#     <div class='container'>
#         <div class="header">
#             <h2>{{ cfg.label }} Report</h2>
#             <p>Report ID: {{ report._id }}</p>
#         </div>

#         <div class="card">
#             <div class="grid-4">
#                 <div class="grid-4-col">
#                     <div class="meta-label">Created At</div>
#                     <div class="meta-value">{{ (report.created_at|string)[:19].replace('T', ' ') if report.created_at else '' }}</div>
#                 </div>
#                 <div class="grid-4-col">
#                     <div class="meta-label">Total Files</div>
#                     <div class="meta-value">{{ data.total_files or 0 }}</div>
#                 </div>
#                 {% if not isAIDetection %}
#                 <div class="grid-4-col">
#                     <div class="meta-label">Total Comparisons</div>
#                     <div class="meta-value">{{ data.total_comparisons or 0 }}</div>
#                 </div>
#                 {% endif %}
#                 <div class="grid-4-col">
#                     <div class="meta-label">Type</div>
#                     <div class="meta-value">{{ type.replace('_', ' ').title() }}</div>
#                 </div>
#             </div>
#         </div>

#         {% if isAIDetection and results %}
#         <div class='section-title'>Detection Results</div>
#         <div class='card'>
#             {% set pct = (results.ai_probability * 100)|round(1) %}
#             {% set sev = 'red' if pct >= 70 else ('amber' if pct >= 40 else 'green') %}
#             <div class="grid-4">
#                 <div class="grid-4-col">
#                     <div class="meta-label">File</div>
#                     <div class="meta-value meta-value-mono">{{ results.file_name }}</div>
#                 </div>
#                 <div class="grid-4-col">
#                     <div class="meta-label">Language</div>
#                     <div class="meta-value">{{ results.language }}</div>
#                 </div>
#                 <div class="grid-4-col">
#                     <div class="meta-label">Verdict</div>
#                     <div class="verdict {{ sev }}">{{ results.verdict }}</div>
#                 </div>
#                 <div class="grid-4-col">
#                     <div class="meta-label">AI Probability</div>
#                     <div class="ai-prob {{ sev }}">{{ pct }}%</div>
#                 </div>
#             </div>

#             <div style="margin-top: 16px;">
#                 <div class="progress-bg">
#                     <div class="progress-bar {{ sev }}" style="width: {{ pct }}%;"></div>
#                 </div>
#                 <div class="progress-labels">
#                     <div class="progress-label-left">Human-written</div>
#                     <div class="progress-label-right">AI-generated</div>
#                 </div>
#             </div>

#             {% if results.explanations and results.explanations|length > 0 %}
#             <div style="margin-top: 24px;">
#                 <div class="summary-title" style="font-weight: 600; color: #0f172a; margin-bottom: 4px;">Analysis Notes</div>
#                 <ul>
#                     {% for exp in results.explanations %}<li>{{ exp }}</li>{% endfor %}
#                 </ul>
#             </div>
#             {% endif %}

#             {% if results.signal_details %}
#             <div style="margin-top: 24px;">
#                 <div class="summary-title" style="font-weight: 600; color: #0f172a; margin-bottom: 12px;">Signal Breakdown</div>
#                 {% for key, s in results.signal_details.items() %}
#                 {% set spct = [s.value * 100, 100]|min %}
#                 {% set ssev = 'red' if spct >= 70 else ('amber' if spct >= 40 else 'green') %}
#                 <div class="signal-row">
#                     <div class="signal-label" title="{{ s.tip }}">{{ s.label or key }}</div>
#                     <div class="signal-bar-container">
#                         <div class="signal-progress-bg">
#                             <div class="progress-bar {{ ssev }}" style="width: {{ spct }}%;"></div>
#                         </div>
#                     </div>
#                     <div class="signal-pct">{{ spct|round(0)|int }}%</div>
#                 </div>
#                 {% endfor %}
#             </div>
#             {% endif %}
#         </div>
#         {% endif %}

#         {% if not isAIDetection and results and results|length > 0 %}
#         <div class='section-title'>Comparison Results</div>
#         {% for r in results %}
#             {% set score = (r.overall_score or r.similarity_score or r.overall_similarity or r.similarity or r.jaccard_similarity or 0) %}
#             {% set pct = (score * 100)|round(1) if score_scale == 1 else score|round(1) %}
#             {% set sev = 'red' if pct >= 60 else ('amber' if pct >= 40 else 'green') %}
#             {% set badge_verdict = r.verdict or ('HIGH SIMILARITY' if pct >= 60 else ('MODERATE SIMILARITY' if pct >= 40 else 'LOW SIMILARITY')) %}
#             {% set fileA = (r.file_a or r.file1 or '')|default('File A', true) %}
#             {% set fileB = (r.file_b or r.file2 or '')|default('File B', true) %}
#             {% set fileA_name = fileA.split('/')[-1] %}
#             {% set fileB_name = fileB.split('/')[-1] %}
            
#             <div class="comp-card border-{{ sev }}">
#                 <div class="comp-header">
#                     <div class="comp-title-area">
#                         <p class="comp-title">{{ fileA_name }}<span class="vs">vs</span>{{ fileB_name }}</p>
#                         {% if r.language_a or r.language_b %}
#                         <div style="margin-top: 4px;">
#                             <span class="badge-outline">{{ r.language_a }}</span>
#                             <span style="color: #94a3b8; font-size: 0.75rem; margin: 0 4px;">/</span>
#                             <span class="badge-outline">{{ r.language_b }}</span>
#                         </div>
#                         {% elif r.type %}
#                         <div style="margin-top: 4px;">
#                             <span class="badge-outline">{{ r.type }}</span>
#                         </div>
#                         {% endif %}
#                         <div style="margin-top: 12px;">
#                             <span class="badge badge-{{ sev }}">{{ badge_verdict }}</span>
#                         </div>
#                     </div>
#                     <div class="comp-score-area">
#                         <div class="comp-score-bar-container">
#                             <div class="signal-progress-bg" style="height: 8px;">
#                                 <div class="progress-bar {{ sev }}" style="width: {{ [pct, 100]|min }}%;"></div>
#                             </div>
#                         </div>
#                         <div class="comp-score-val text-{{ sev }}">{{ pct }}<span>%</span></div>
#                     </div>
#                 </div>

#                 {% if r.similar_lines and r.similar_lines|length > 0 %}
#                 <div class="summary-title">{{ r.similar_lines|length }} similar line{% if r.similar_lines|length > 1 %}s{% endif %} found</div>
#                 <div class="diff-container">
#                     <div class="diff-header">
#                         <div class="diff-h-left">{{ fileA_name }}</div>
#                         <div class="diff-h-mid">match</div>
#                         <div class="diff-h-right">{{ fileB_name }}</div>
#                     </div>
#                     {% for line in r.similar_lines %}
#                         {% set l_pct = ((line.similarity or 0) * 100)|round(0)|int %}
#                         {% set l_hl = 'bg-red-light' if (line.similarity or 0) >= 0.9 else 'bg-amber-light' %}
#                         {% set l_text_col = 'text-red' if (line.similarity or 0) >= 0.9 else 'text-amber' %}
#                         <div class="diff-row">
#                             <div class="diff-cell {{ l_hl }}" style="width: 45%;">
#                                 <div class="diff-code-wrapper">
#                                     <div class="diff-line-num">{{ line.line_a }}</div>
#                                     <div class="diff-code">{{ line.text_a }}</div>
#                                 </div>
#                             </div>
#                             <div class="match-pct {{ l_text_col }}">{{ l_pct }}%</div>
#                             <div class="diff-cell {{ l_hl }}" style="width: 45%;">
#                                 <div class="diff-code-wrapper">
#                                     <div class="diff-line-num">{{ line.line_b }}</div>
#                                     <div class="diff-code">{{ line.text_b }}</div>
#                                 </div>
#                             </div>
#                         </div>
#                     {% endfor %}
#                 </div>
#                 {% endif %}

#                 {% if r.similar_chunks and r.similar_chunks|length > 0 %}
#                 <div class="summary-title" style="margin-top: 20px;">{{ r.similar_chunks|length }} similar chunk{% if r.similar_chunks|length > 1 %}s{% endif %} found</div>
#                 {% for chunk in r.similar_chunks %}
#                     {% set c_pct = ((chunk.similarity or 0) * 100)|round(1) %}
#                     {% set c_hl = 'chunk-bg-red' if (chunk.similarity or 0) >= 0.7 else 'chunk-bg-amber' %}
#                     <div class="chunk-container">
#                         <div class="chunk-header">
#                             <div class="chunk-h-left">{{ fileA_name }}</div>
#                             <div class="chunk-h-mid">{{ c_pct }}%</div>
#                             <div class="chunk-h-right">{{ fileB_name }}</div>
#                         </div>
#                         <div class="chunk-body">
#                             <div class="chunk-side {{ c_hl }}">{{ chunk.text_a }}</div>
#                             <div class="chunk-side {{ c_hl }}">{{ chunk.text_b }}</div>
#                         </div>
#                     </div>
#                 {% endfor %}
#                 {% endif %}
#             </div>
#         {% endfor %}
#         {% endif %}

#         {% if not isAIDetection and (not results or results|length == 0) %}
#         <div style="color: #64748b; font-size: 0.875rem;">No matches found.</div>
#         {% endif %}
#     </div>
# </body>
# </html>
# """


from flask import render_template_string
from weasyprint import HTML
import os

def generate_pdf_report(report_data):
    rtype = report_data.get("type")
    score_scale = 1 if rtype in ["min_hash", "semantic_similarity"] else 100
    report_data["score_scale"] = score_scale
    
    html = render_template_string(REPORT_TEMPLATE, **report_data)
    pdf = HTML(string=html, base_url="/").write_pdf()
    return pdf

REPORT_TEMPLATE = """
<!DOCTYPE html>
<html lang='en'>
<head>
    <meta charset='UTF-8'>
    <title>{{ cfg.label }} Report</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;600&display=swap');

        * { box-sizing: border-box; }

        body {
            font-family: 'Inter', sans-serif;
            background: #ffffff;
            color: #0f172a;
            margin: 0;
            padding: 0;
            font-size: 13px;
            line-height: 1.4;
        }

        .container { max-width: 760px; margin: 0 auto; padding: 28px 36px; }

        /* ── Header ── */
        .header { margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0; }
        .header h2 { font-size: 1.6rem; font-weight: 700; margin: 0 0 2px 0; color: #0f172a; letter-spacing: -0.02em; }
        .header p { color: #64748b; font-size: 0.75rem; margin: 0; }

        /* ── Card ── */
        .card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 16px 20px;
            margin-bottom: 14px;
        }

        /* ── Meta grid — use flexbox, not table ── */
        .meta-row { display: flex; flex-wrap: wrap; gap: 0 28px; }
        .meta-col { min-width: 100px; }
        .meta-label { color: #64748b; font-size: 0.72rem; margin-bottom: 2px; }
        .meta-value { font-weight: 500; font-size: 0.8rem; color: #0f172a; }
        .meta-value-mono { font-family: 'Roboto Mono', monospace; font-size: 0.7rem; word-break: break-all; }

        /* ── Section title ── */
        .section-title { font-size: 1.05rem; font-weight: 600; margin: 18px 0 10px 0; color: #0f172a; }

        /* ── Verdict / probability ── */
        .verdict { font-weight: 700; font-size: 0.8rem; }
        .verdict.red   { color: #dc2626; }
        .verdict.amber { color: #d97706; }
        .verdict.green { color: #16a34a; }

        .ai-prob { font-family: 'Roboto Mono', monospace; font-size: 1rem; font-weight: 700; }
        .ai-prob.red   { color: #dc2626; }
        .ai-prob.amber { color: #d97706; }
        .ai-prob.green { color: #16a34a; }

        /* ── Progress bars ── */
        .progress-bg { height: 10px; background: #f1f5f9; border-radius: 9999px; overflow: hidden; margin-top: 10px; width: 100%; }
        .progress-bar { height: 100%; border-radius: 9999px; }
        .progress-bar.red   { background: #ef4444; }
        .progress-bar.amber { background: #f59e0b; }
        .progress-bar.green { background: #22c55e; }

        .progress-labels { display: flex; justify-content: space-between; margin-top: 3px; color: #94a3b8; font-size: 0.6rem; }

        /* ── Lists ── */
        ul { margin: 6px 0 0 0; padding-left: 18px; color: #64748b; font-size: 0.8rem; line-height: 1.55; }
        li { margin-bottom: 3px; }

        /* ── Signal breakdown ── */
        .signal-section-label { font-weight: 600; font-size: 0.8rem; color: #0f172a; margin: 14px 0 8px 0; }

        .signal-row { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
        .signal-label { width: 170px; flex-shrink: 0; font-size: 0.7rem; color: #64748b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .signal-bar-wrap { flex: 1; }
        .signal-progress-bg { height: 5px; background: #f1f5f9; border-radius: 9999px; overflow: hidden; }
        .signal-pct { width: 36px; text-align: right; font-family: 'Roboto Mono', monospace; font-size: 0.7rem; color: #0f172a; flex-shrink: 0; }

        /* ── Badges ── */
        .badge { display: inline-block; padding: 2px 7px; border-radius: 9999px; font-size: 0.65rem; font-weight: 600; line-height: 1.4; }
        .badge-red   { background: rgba(239,68,68,.08);  color: #dc2626; border: 1px solid rgba(239,68,68,.25); }
        .badge-amber { background: rgba(245,158,11,.08); color: #d97706; border: 1px solid rgba(245,158,11,.25); }
        .badge-green { background: rgba(34,197,94,.08);  color: #16a34a; border: 1px solid rgba(34,197,94,.25); }
        .badge-outline { background: transparent; border: 1px solid #e2e8f0; color: #475569; font-family: 'Roboto Mono', monospace; font-weight: 500; font-size: 0.6rem; padding: 1px 5px; border-radius: 4px; }

        /* ── Comparison card ── */
        .comp-card {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 14px 16px;
            margin-bottom: 12px;
            background: #ffffff;
        }
        .comp-card.border-red   { border-color: rgba(239,68,68,.3); }
        .comp-card.border-amber { border-color: rgba(245,158,11,.3); }
        .comp-card.border-green { border-color: rgba(34,197,94,.3); }

        /* Comp header: flex so score sits naturally to the right */
        .comp-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; gap: 12px; }
        .comp-title-area { flex: 1; }
        .comp-score-area { text-align: right; flex-shrink: 0; min-width: 90px; }

        .comp-title { font-size: 0.82rem; font-weight: 600; color: #0f172a; margin: 0 0 4px 0; }
        .comp-title .vs { font-weight: 400; color: #94a3b8; margin: 0 5px; font-size: 0.75rem; }

        .comp-langs { margin-bottom: 6px; }

        .comp-score-val { font-family: 'Roboto Mono', monospace; font-size: 1.3rem; font-weight: 700; display: block; }
        .comp-score-val span { font-size: 0.75rem; font-weight: 400; color: #64748b; }
        .comp-score-val.text-red   { color: #dc2626; }
        .comp-score-val.text-amber { color: #d97706; }
        .comp-score-val.text-green { color: #16a34a; }

        .comp-score-bar { margin-top: 4px; }

        /* ── Diff table (similar lines) ── */
        .summary-label { font-size: 0.72rem; font-weight: 500; color: #64748b; margin: 10px 0 6px 0; }

        .diff-container { border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; }

        /* diff header row */
        .diff-header { display: flex; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
        .diff-h-left  { flex: 1; padding: 5px 10px; font-family: 'Roboto Mono', monospace; font-size: 0.62rem; font-weight: 500; color: #64748b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .diff-h-mid   { width: 52px; flex-shrink: 0; text-align: center; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; font-family: 'Roboto Mono', monospace; font-size: 0.6rem; color: #64748b; padding: 5px 2px; }
        .diff-h-right { flex: 1; padding: 5px 10px; font-family: 'Roboto Mono', monospace; font-size: 0.62rem; font-weight: 500; color: #64748b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        /* diff data rows */
        .diff-row { display: flex; border-bottom: 1px solid #f1f5f9; }
        .diff-row:last-child { border-bottom: none; }

        .diff-cell { flex: 1; display: flex; overflow: hidden; }
        .diff-cell.bg-red-light   { background: rgba(239,68,68,.06); }
        .diff-cell.bg-amber-light { background: rgba(245,158,11,.05); }

        .diff-line-num { width: 34px; flex-shrink: 0; text-align: right; padding: 5px 6px 5px 4px; font-family: 'Roboto Mono', monospace; font-size: 0.6rem; color: #94a3b8; border-right: 1px solid rgba(226,232,240,.5); }
        .diff-code { flex: 1; padding: 5px 8px; font-family: 'Roboto Mono', monospace; font-size: 0.68rem; color: #0f172a; white-space: pre-wrap; word-break: break-all; overflow-wrap: break-word; }

        .match-pct { width: 52px; flex-shrink: 0; text-align: center; border-left: 1px solid rgba(226,232,240,.5); border-right: 1px solid rgba(226,232,240,.5); background: #f8fafc; font-family: 'Roboto Mono', monospace; font-size: 0.6rem; font-weight: 600; display: flex; align-items: center; justify-content: center; }
        .match-pct.text-red   { color: #dc2626; }
        .match-pct.text-amber { color: #d97706; }
        .match-pct.text-green { color: #16a34a; }

        /* ── Chunk diff (semantic) ── */
        .chunk-container { border: 1px solid #e2e8f0; border-radius: 6px; margin-top: 8px; overflow: hidden; page-break-inside: avoid; }
        .chunk-header { display: flex; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
        .chunk-h-left  { flex: 1; padding: 5px 10px; font-family: 'Roboto Mono', monospace; font-size: 0.62rem; color: #64748b; font-weight: 500; }
        .chunk-h-mid   { width: 52px; flex-shrink: 0; text-align: center; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; font-family: 'Roboto Mono', monospace; font-size: 0.6rem; color: #64748b; padding: 5px 2px; display: flex; align-items: center; justify-content: center; }
        .chunk-h-right { flex: 1; padding: 5px 10px; font-family: 'Roboto Mono', monospace; font-size: 0.62rem; color: #64748b; font-weight: 500; text-align: right; }
        .chunk-body    { display: flex; }
        .chunk-side    { flex: 1; padding: 10px 12px; font-size: 0.72rem; color: #0f172a; line-height: 1.55; white-space: pre-wrap; word-break: break-word; vertical-align: top; }
        .chunk-side:first-child { border-right: 1px solid rgba(226,232,240,.5); }
        .chunk-bg-red   { background: rgba(239,68,68,.04); }
        .chunk-bg-amber { background: rgba(245,158,11,.03); }

        /* ── PDF Analysis ── */
        .pdf-overview-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
        .pdf-file-card { flex: 1; min-width: 200px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; }
        .pdf-img-container { display: flex; gap: 12px; margin-top: 12px; }
        .pdf-img-box { flex: 1; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; background: #f8fafc; text-align: center; overflow-x: auto; }
        .pdf-img-box img { max-width: 100%; max-height: 200px; object-fit: contain; }
        .pdf-table { width: 100%; border-collapse: collapse; font-size: 0.7rem; margin-top: 6px; }
        .pdf-table th { border-bottom: 1px solid #e2e8f0; padding: 6px; background: #f1f5f9; text-align: left; }
        .pdf-table td { border-bottom: 1px solid #f1f5f9; padding: 6px; }

        /* ── Web Sources ── */
        .web-source-card { display: flex; gap: 14px; border: 1px solid rgba(59,130,246,.25); border-radius: 8px; padding: 14px 16px; margin-bottom: 12px; background: #ffffff; }
        .ws-img-box { flex-shrink: 0; width: 100px; height: 100px; border: 1px solid #e2e8f0; border-radius: 6px; background: #f8fafc; display: flex; align-items: center; justify-content: center; padding: 4px; }
        .ws-img-box img { max-width: 100%; max-height: 100%; object-fit: contain; }
        .ws-content { flex: 1; min-width: 0; }
        .ws-title { font-size: 0.82rem; font-weight: 600; margin: 0 0 4px 0; color: #0f172a; }
        .ws-meta { font-size: 0.65rem; color: #64748b; margin-bottom: 8px; }
        .badge-blue { background: rgba(59,130,246,.08); color: #2563eb; border: 1px solid rgba(59,130,246,.25); }
        .ws-links { margin-top: 10px; }
        .ws-link-item { display: block; padding: 6px 10px; border: 1px solid #e2e8f0; border-radius: 6px; background: #f8fafc; margin-bottom: 4px; text-decoration: none; color: #0f172a; font-size: 0.72rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ws-search-link { display: inline-block; margin-top: 6px; font-size: 0.68rem; color: #64748b; text-decoration: none; }
    </style>
</head>
<body>
<div class='container'>

    <div class="header">
        <h2>{{ cfg.label }} Report</h2>
        <p>Report ID: {{ report._id }}</p>
    </div>

    <!-- ── Meta card ── -->
    <div class="card">
        <div class="meta-row">
            <div class="meta-col">
                <div class="meta-label">Created At</div>
                <div class="meta-value">{{ (report.created_at|string)[:19].replace('T', ' ') if report.created_at else '' }}</div>
            </div>
            <div class="meta-col">
                <div class="meta-label">Total Files</div>
                <div class="meta-value">{{ data.total_files or 0 }}</div>
            </div>
            {% if not isAIDetection %}
            <div class="meta-col">
                <div class="meta-label">Total Comparisons</div>
                <div class="meta-value">{{ data.total_comparisons or 0 }}</div>
            </div>
            {% endif %}
            <div class="meta-col">
                <div class="meta-label">Type</div>
                <div class="meta-value">{{ type.replace('_', ' ').title() }}</div>
            </div>
        </div>
    </div>

    <!-- ── AI Detection ── -->
    {% if isAIDetection and results %}
    <div class='section-title'>Detection Results</div>
    <div class='card'>
        {% set pct = (results.ai_probability * 100)|round(1) %}
        {% set sev = 'red' if pct >= 70 else ('amber' if pct >= 40 else 'green') %}

        <div class="meta-row" style="margin-bottom: 12px;">
            <div class="meta-col" style="min-width:160px;">
                <div class="meta-label">File</div>
                <div class="meta-value meta-value-mono">{{ results.file_name }}</div>
            </div>
            <div class="meta-col">
                <div class="meta-label">Language</div>
                <div class="meta-value">{{ results.language }}</div>
            </div>
            <div class="meta-col">
                <div class="meta-label">Verdict</div>
                <div class="verdict {{ sev }}">{{ results.verdict }}</div>
            </div>
            <div class="meta-col">
                <div class="meta-label">AI Probability</div>
                <div class="ai-prob {{ sev }}">{{ pct }}%</div>
            </div>
        </div>

        <div class="progress-bg">
            <div class="progress-bar {{ sev }}" style="width: {{ pct }}%;"></div>
        </div>
        <div class="progress-labels">
            <span>Human-written</span>
            <span>AI-generated</span>
        </div>

        {% if results.explanations and results.explanations|length > 0 %}
        <div style="margin-top: 12px;">
            <div class="signal-section-label">Analysis Notes</div>
            <ul>{% for exp in results.explanations %}<li>{{ exp }}</li>{% endfor %}</ul>
        </div>
        {% endif %}

        {% if results.signal_details %}
        <div style="margin-top: 12px;">
            <div class="signal-section-label">Signal Breakdown</div>
            {% for key, s in results.signal_details.items() %}
            {% set spct = [s.value * 100, 100]|min %}
            {% set ssev = 'red' if spct >= 70 else ('amber' if spct >= 40 else 'green') %}
            <div class="signal-row">
                <div class="signal-label" title="{{ s.tip }}">{{ s.label or key }}</div>
                <div class="signal-bar-wrap">
                    <div class="signal-progress-bg">
                        <div class="progress-bar {{ ssev }}" style="width: {{ spct }}%;"></div>
                    </div>
                </div>
                <div class="signal-pct">{{ spct|round(0)|int }}%</div>
            </div>
            {% endfor %}
        </div>
        {% endif %}
    </div>
    {% endif %}

    <!-- ── Comparison Results ── -->
    {% if not isAIDetection and type != 'pdf_analysis' and results and results|length > 0 %}
    <div class='section-title'>Comparison Results</div>

    {% for r in results %}
        {% set score = (r.overall_score or r.similarity_score or r.overall_similarity or r.similarity or r.jaccard_similarity or 0) %}
        {% set pct = (score * 100)|round(1) if score_scale == 1 else score|round(1) %}
        {% set sev = 'red' if pct >= 60 else ('amber' if pct >= 40 else 'green') %}
        {% set badge_verdict = r.verdict or ('HIGH SIMILARITY' if pct >= 60 else ('MODERATE SIMILARITY' if pct >= 40 else 'LOW SIMILARITY')) %}
        {% set fileA = (r.file_a or r.file1 or '')|default('File A', true) %}
        {% set fileB = (r.file_b or r.file2 or '')|default('File B', true) %}
        {% set fileA_name = fileA.split('/')[-1] %}
        {% set fileB_name = fileB.split('/')[-1] %}

        <div class="comp-card border-{{ sev }}">

            <div class="comp-header">
                <div class="comp-title-area">
                    <p class="comp-title">{{ fileA_name }}<span class="vs">vs</span>{{ fileB_name }}</p>
                    <div class="comp-langs">
                        {% if r.language_a or r.language_b %}
                        <span class="badge-outline">{{ r.language_a }}</span>
                        <span style="color:#94a3b8;font-size:0.7rem;margin:0 3px;">/</span>
                        <span class="badge-outline">{{ r.language_b }}</span>
                        {% elif r.type %}
                        <span class="badge-outline">{{ r.type }}</span>
                        {% endif %}
                    </div>
                    <span class="badge badge-{{ sev }}">{{ badge_verdict }}</span>
                </div>
                <div class="comp-score-area">
                    <div class="comp-score-bar">
                        <div class="signal-progress-bg" style="height: 7px;">
                            <div class="progress-bar {{ sev }}" style="width: {{ [pct, 100]|min }}%;"></div>
                        </div>
                    </div>
                    <span class="comp-score-val text-{{ sev }}">{{ pct }}<span>%</span></span>
                </div>
            </div>

            {% if r.similar_lines and r.similar_lines|length > 0 %}
            <div class="summary-label">{{ r.similar_lines|length }} similar line{% if r.similar_lines|length != 1 %}s{% endif %} found</div>
            <div class="diff-container">
                <div class="diff-header">
                    <div class="diff-h-left">{{ fileA_name }}</div>
                    <div class="diff-h-mid">match</div>
                    <div class="diff-h-right">{{ fileB_name }}</div>
                </div>
                {% for line in r.similar_lines %}
                {% set l_pct = ((line.similarity or 0) * 100)|round(0)|int %}
                {% set l_hl  = 'bg-red-light' if (line.similarity or 0) >= 0.9 else 'bg-amber-light' %}
                {% set l_col = 'text-red'   if (line.similarity or 0) >= 0.9 else 'text-amber' %}
                <div class="diff-row">
                    <div class="diff-cell {{ l_hl }}">
                        <div class="diff-line-num">{{ line.line_a }}</div>
                        <div class="diff-code">{{ line.text_a }}</div>
                    </div>
                    <div class="match-pct {{ l_col }}">{{ l_pct }}%</div>
                    <div class="diff-cell {{ l_hl }}">
                        <div class="diff-line-num">{{ line.line_b }}</div>
                        <div class="diff-code">{{ line.text_b }}</div>
                    </div>
                </div>
                {% endfor %}
            </div>
            {% endif %}

            {% if r.similar_chunks and r.similar_chunks|length > 0 %}
            <div class="summary-label" style="margin-top: 12px;">{{ r.similar_chunks|length }} similar chunk{% if r.similar_chunks|length != 1 %}s{% endif %} found</div>
            {% for chunk in r.similar_chunks %}
            {% set c_pct = ((chunk.similarity or 0) * 100)|round(1) %}
            {% set c_hl  = 'chunk-bg-red' if (chunk.similarity or 0) >= 0.7 else 'chunk-bg-amber' %}
            <div class="chunk-container">
                <div class="chunk-header">
                    <div class="chunk-h-left">{{ fileA_name }}</div>
                    <div class="chunk-h-mid">{{ c_pct }}%</div>
                    <div class="chunk-h-right">{{ fileB_name }}</div>
                </div>
                <div class="chunk-body">
                    <div class="chunk-side {{ c_hl }}">{{ chunk.text_a }}</div>
                    <div class="chunk-side {{ c_hl }}">{{ chunk.text_b }}</div>
                </div>
            </div>
            {% endfor %}
            {% endif %}

        </div>
    {% endfor %}
    {% endif %}

    <!-- ── PDF Analysis Results ── -->
    {% if type == 'pdf_analysis' and results %}
    <div class="card">
        <div class="comp-header" style="margin-bottom: 0;">
            <div class="comp-title-area">
                <p class="comp-title" style="font-size: 1rem;">Comparison Complete</p>
                <div style="color:#64748b;font-size:0.75rem;">{{ results.total_files }} PDFs compared ({{ results.total_comparisons }} pairwise)</div>
            </div>
            <div class="comp-score-area" style="display:flex; gap:6px; align-items:center;">
                {% if results.total_image_matches > 0 %}
                <span class="badge badge-red">{{ results.total_image_matches }} image match{% if results.total_image_matches != 1 %}es{% endif %}</span>
                {% else %}
                <span class="badge badge-outline">0 image matches</span>
                {% endif %}
                {% if results.total_table_matches > 0 %}
                <span class="badge badge-amber">{{ results.total_table_matches }} table match{% if results.total_table_matches != 1 %}es{% endif %}</span>
                {% else %}
                <span class="badge badge-outline">0 table matches</span>
                {% endif %}
            </div>
        </div>
    </div>

    <!-- Per-File Overview -->
    <div class="section-title">Per-File Overview</div>
    <div class="pdf-overview-grid">
        {% for f in results.files %}
        <div class="pdf-file-card">
            <div style="font-weight:600; font-size:0.8rem; margin-bottom:4px; word-break:break-all;">{{ f.file }}</div>
            <div style="color:#64748b; font-size:0.65rem;">{{ f.total_images }} image{% if f.total_images != 1 %}s{% endif %} &middot; {{ f.total_tables }} table{% if f.total_tables != 1 %}s{% endif %}</div>
        </div>
        {% endfor %}
    </div>

    {% if results.image_matches and results.image_matches|length > 0 %}
    <div class="section-title" style="margin-top: 24px;">Image Matches ({{ results.total_image_matches }})</div>
    {% for match in results.image_matches %}
        {% set pct = (match.similarity * 100)|round(0)|int %}
        {% set sev = 'red' if pct >= 80 else ('amber' if pct >= 68 else 'green') %}
        <div class="comp-card border-{{ sev }}">
            <div class="comp-header">
                <div class="comp-title-area">
                    <p class="comp-title">{{ match.file_a }} <span class="vs">vs</span> {{ match.file_b }}</p>
                    <div style="margin-top:2px; margin-bottom:8px;">
                        <span class="badge-outline">Page {{ match.page_a }}</span>
                        <span style="color:#94a3b8;font-size:0.7rem;margin:0 3px;">/</span>
                        <span class="badge-outline">Page {{ match.page_b }}</span>
                    </div>
                    {% set mtype = "EMBEDDED IN SCREENSHOT" if match.match_type == "contained_in" else ("PAGE SCREENSHOT" if match.match_type == "page_screenshot" else ("IDENTICAL / COPY" if pct >= 90 else ("LIKELY SCREENSHOT" if pct >= 75 else "SIMILAR IMAGE"))) %}
                    <span class="badge badge-{{ sev }}">{{ mtype }}</span>
                </div>
                <div class="comp-score-area">
                    <div style="display:flex; align-items:center;">
                        <div class="comp-score-bar" style="width: 70px; margin-right:8px;">
                            <div class="signal-progress-bg" style="height: 7px;">
                                <div class="progress-bar {{ sev }}" style="width: {{ [pct, 100]|min }}%;"></div>
                            </div>
                        </div>
                        <span class="comp-score-val text-{{ sev }}">{{ pct }}<span>%</span></span>
                    </div>
                </div>
            </div>

            <div class="pdf-img-container">
                <div class="pdf-img-box">
                    <div style="font-family:'Roboto Mono',monospace; font-size:0.65rem; color:#64748b; margin-bottom:6px;">{{ match.file_a }} &mdash; p.{{ match.page_a }}</div>
                    <div><img src="{{ match.data_a }}" /></div>
                    <div style="font-size:0.6rem; color:#64748b; margin-top:4px;">{{ match.width_a }}&times;{{ match.height_a }}px</div>
                </div>
                <div class="pdf-img-box">
                    <div style="font-family:'Roboto Mono',monospace; font-size:0.65rem; color:#64748b; margin-bottom:6px;">{{ match.file_b }} &mdash; p.{{ match.page_b }}</div>
                    <div><img src="{{ match.data_b }}" /></div>
                    <div style="font-size:0.6rem; color:#64748b; margin-top:4px;">{{ match.width_b }}&times;{{ match.height_b }}px</div>
                </div>
            </div>
        </div>
    {% endfor %}
    {% endif %}

    {% if results.table_matches and results.table_matches|length > 0 %}
    <div class="section-title" style="margin-top: 24px;">Table Matches ({{ results.total_table_matches }})</div>
    {% for match in results.table_matches %}
        {% set pct = ((match.similarity or 1) * 100)|round(0)|int %}
        {% set sev = 'red' if pct >= 80 else ('amber' if pct >= 68 else 'green') %}
        {% set mtype = "IDENTICAL TABLE" if match.match_type == "identical" else ("ROW SUBSET" if match.match_type == "subset" else ("COLUMN SUBSET" if match.match_type == "column_subset" else "SIMILAR TABLE")) %}
        <div class="comp-card border-{{ sev }}">
            <div class="comp-header">
                <div class="comp-title-area">
                    <p class="comp-title">{{ match.file_a }} <span class="vs">vs</span> {{ match.file_b }}</p>
                    <div style="margin-top:2px; margin-bottom:8px;">
                        <span class="badge-outline">Page {{ match.page_a }}</span>
                        <span style="color:#94a3b8;font-size:0.7rem;margin:0 3px;">/</span>
                        <span class="badge-outline">Page {{ match.page_b }}</span>
                    </div>
                    <span class="badge badge-{{ sev }}">{{ mtype }}</span>
                </div>
                <div class="comp-score-area">
                    <div style="display:flex; align-items:center;">
                        {% if pct < 100 %}
                        <div class="comp-score-bar" style="width: 70px; margin-right:8px;">
                            <div class="signal-progress-bg" style="height: 7px;">
                                <div class="progress-bar {{ sev }}" style="width: {{ [pct, 100]|min }}%;"></div>
                            </div>
                        </div>
                        {% endif %}
                        <span class="comp-score-val text-{{ sev }}">{{ pct }}<span>%</span></span>
                    </div>
                </div>
            </div>

            {% set tblA = match.table_a %}
            {% set tblB = match.table_b or match.table_a %}
            {% set show_side_by_side = match.match_type and match.match_type != "identical" %}

            <div class="pdf-img-container">
                <div class="pdf-img-box" style="text-align:left;">
                    {% if show_side_by_side %}<div style="font-family:'Roboto Mono',monospace; font-size:0.65rem; color:#64748b; margin-bottom:6px;">{{ match.file_a }} &mdash; p.{{ match.page_a }}</div>{% endif %}
                    <table class="pdf-table">
                        {% if tblA.headers and tblA.headers|length > 0 %}
                        <thead><tr>{% for h in tblA.headers %}<th>{{ h or '—' }}</th>{% endfor %}</tr></thead>
                        {% endif %}
                        <tbody>
                            {% for row in tblA.rows[:6] %}
                            <tr style="background: {{ loop.cycle('', '#f8fafc') }};">
                                {% for cell in row %}<td>{{ cell or '—' }}</td>{% endfor %}
                            </tr>
                            {% endfor %}
                            {% if tblA.rows|length > 6 %}
                            <tr><td colspan="{{ tblA.headers|length }}" style="text-align:center; color:#94a3b8;">… {{ tblA.rows|length - 6 }} more rows</td></tr>
                            {% endif %}
                        </tbody>
                    </table>
                </div>

                {% if show_side_by_side %}
                <div class="pdf-img-box" style="text-align:left;">
                    <div style="font-family:'Roboto Mono',monospace; font-size:0.65rem; color:#64748b; margin-bottom:6px;">{{ match.file_b }} &mdash; p.{{ match.page_b }}</div>
                    <table class="pdf-table">
                        {% if tblB.headers and tblB.headers|length > 0 %}
                        <thead><tr>{% for h in tblB.headers %}<th>{{ h or '—' }}</th>{% endfor %}</tr></thead>
                        {% endif %}
                        <tbody>
                            {% for row in tblB.rows[:6] %}
                            <tr style="background: {{ loop.cycle('', '#f8fafc') }};">
                                {% for cell in row %}<td>{{ cell or '—' }}</td>{% endfor %}
                            </tr>
                            {% endfor %}
                            {% if tblB.rows|length > 6 %}
                            <tr><td colspan="{{ tblB.headers|length }}" style="text-align:center; color:#94a3b8;">… {{ tblB.rows|length - 6 }} more rows</td></tr>
                            {% endif %}
                        </tbody>
                    </table>
                </div>
                {% endif %}
            </div>

        </div>
    {% endfor %}
    {% endif %}

    {% set ns = namespace(has_web_sources=false) %}
    {% for f in results.files %}
        {% for img in (f.images or []) %}
            {% if img.web_sources and img.web_sources|length > 0 %}
                {% set ns.has_web_sources = true %}
            {% endif %}
        {% endfor %}
    {% endfor %}

    {% if ns.has_web_sources %}
    <div class="section-title" style="margin-top: 24px;">Web Sources</div>
    {% for f in results.files %}
        {% for img in (f.images or []) %}
            {% if img.web_sources and img.web_sources|length > 0 %}
            <div class="web-source-card">
                <div class="ws-img-box">
                    <img src="{{ img.data }}" />
                </div>
                <div class="ws-content">
                    <p class="ws-title">{{ f.file }}</p>
                    <p class="ws-meta">Page {{ img.page }} &middot; {{ img.width }}&times;{{ img.height }}px</p>
                    <span class="badge badge-blue">
                        {{ img.web_sources|length }} SOURCE{% if img.web_sources|length != 1 %}S{% endif %} FOUND
                    </span>
                    <div class="ws-links">
                        {% for src in img.web_sources %}
                        <a href="{{ src.url }}" class="ws-link-item">{{ src.title }}</a>
                        {% endfor %}
                    </div>
                    {% if img.search_url %}
                    <a href="{{ img.search_url }}" class="ws-search-link">Open full Google Lens results &rarr;</a>
                    {% endif %}
                </div>
            </div>
            {% endif %}
        {% endfor %}
    {% endfor %}
    {% endif %}

    {% endif %}

    {% if not isAIDetection and (not results or results|length == 0) %}
    <p style="color:#64748b;font-size:0.85rem;">No matches found.</p>
    {% endif %}

</div>
</body>
</html>
"""