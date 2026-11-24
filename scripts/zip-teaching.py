"""Rebuild a lesson's starter-files zip from teaching/<key>/vscode-files.
Usage:  python3 scripts/zip-teaching.py python-1   (writes public/teaching/<key>/<key>-starter-files.zip)
Run after changing the starter files. Answers live in teaching/<key>/answers and are never published."""
import pathlib, sys, zipfile
key = sys.argv[1] if len(sys.argv) > 1 else 'python-1'
src = pathlib.Path(f'teaching/{key}/vscode-files')
out = pathlib.Path(f'public/teaching/{key}/{key}-starter-files.zip')
folder = key.replace('python-', 'python_lesson').replace('-', '_')
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for f in sorted(src.glob('*.py')):
        z.write(f, f'{folder}/{f.name}')
print('wrote', out, out.stat().st_size, 'bytes')
