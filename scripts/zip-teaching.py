"""Rebuild public/teaching/python-1/python-1-starter-files.zip from teaching/python-1/vscode-files.
Run after changing the starter files:  python3 scripts/zip-teaching.py
(Answers live in teaching/python-1/answers and are never published.)"""
import pathlib, zipfile
src = pathlib.Path('teaching/python-1/vscode-files')
out = pathlib.Path('public/teaching/python-1/python-1-starter-files.zip')
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for f in sorted(src.glob('*.py')):
        z.write(f, f'python_lesson1/{f.name}')
print('wrote', out, out.stat().st_size, 'bytes')
