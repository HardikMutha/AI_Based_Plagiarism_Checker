import sys
import os

sys.path.append(os.path.abspath('/home/amehta/Desktop/5Guys1Code_Techfiesta/server'))
from app.utils.pdf_report import generate_pdf_report

def run_tests():
    # 1. AI Detection
    ai_data = {
        "cfg": {"label": "Code AI Detection"},
        "report": {"_id": "test_ai_123", "created_at": "2026-02-21T10:00:00.000Z"},
        "data": {"total_files": 1, "total_comparisons": 0},
        "type": "code_ai_detection",
        "isAIDetection": True,
        "results": {
            "file_name": "main.py",
            "language": "python",
            "verdict": "AI GENERATED",
            "ai_probability": 0.85,
            "explanations": ["Highly regular structures detected.", "Predictable token frequencies."],
            "signal_details": {
                "signal1": {"label": "Entropy", "value": 0.9, "tip": "Low entropy indicates machine generation"}
            }
        }
    }
    
    # 2. AST Comparison
    ast_data = {
        "cfg": {"label": "Code — AST"},
        "report": {"_id": "test_ast_123", "created_at": "2026-02-21T10:00:00.000Z"},
        "data": {"total_files": 2, "total_comparisons": 1},
        "type": "ast_comparison",
        "isAIDetection": False,
        "results": [
            {
                "file_a": "dir/file1.py",
                "file_b": "dir/file2.py",
                "language_a": "python",
                "language_b": "python",
                "overall_score": 0.95,
                "verdict": "HIGH SIMILARITY",
                "similar_lines": [
                    {"line_a": 1, "text_a": "def foo():\n    pass", "line_b": 1, "text_b": "def foo():\n    pass", "similarity": 1.0}
                ]
            }
        ]
    }

    # 3. Semantic Similarity
    sem_data = {
        "cfg": {"label": "Text — Semantic"},
        "report": {"_id": "test_sem_123", "created_at": "2026-02-21T10:00:00.000Z"},
        "data": {"total_files": 2, "total_comparisons": 1},
        "type": "semantic_similarity",
        "isAIDetection": False,
        "results": [
            {
                "file_a": "doc1.txt",
                "file_b": "doc2.txt",
                "overall_score": 0.88,
                "verdict": "HIGH SIMILARITY",
                "similar_chunks": [
                    {"similarity": 0.92, "text_a": "This is a test document.", "text_b": "This is a testing document."}
                ]
            }
        ]
    }
    
    # 4. MinHash
    min_data = {
        "cfg": {"label": "Text — MinHash"},
        "report": {"_id": "test_min_123", "created_at": "2026-02-21T10:00:00.000Z"},
        "data": {"total_files": 2, "total_comparisons": 1},
        "type": "min_hash",
        "isAIDetection": False,
        "results": [
            {
                "file_a": "doc1.txt",
                "file_b": "doc2.txt",
                "overall_score": 0.65,
                "verdict": "MODERATE SIMILARITY",
                "similar_lines": [
                    {"line_a": 1, "text_a": "Hello world", "line_b": 2, "text_b": "Hello world", "similarity": 1.0}
                ]
            }
        ]
    }

    for name, data in [("ai", ai_data), ("ast", ast_data), ("sem", sem_data), ("min", min_data)]:
        try:
            pdf = generate_pdf_report(data)
            with open(f"/home/amehta/Desktop/5Guys1Code_Techfiesta/server/test_{name}.pdf", "wb") as f:
                f.write(pdf)
            print(f"Generated test_{name}.pdf")
        except Exception as e:
            print(f"Error generating {name}: {e}")

if __name__ == "__main__":
    run_tests()
