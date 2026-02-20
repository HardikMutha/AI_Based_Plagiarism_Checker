"""
Allows running the package as a module:
    python -m plagiarism_detector compare file1.py file2.py
"""

import sys
from app.services.code_plagiarism_detector.cli import main

sys.exit(main())