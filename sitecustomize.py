"""
Force UTF-8 encoding for stdout/stderr on Windows.
This file is automatically loaded by Python at startup when present in the working directory
or site-packages. Placed here so uvicorn --reload workers also pick it up.
"""
import sys
import io

if sys.platform == 'win32':
    if hasattr(sys.stdout, 'buffer'):
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace', line_buffering=True)
    if hasattr(sys.stderr, 'buffer'):
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace', line_buffering=True)
