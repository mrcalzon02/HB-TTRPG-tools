#!/usr/bin/env python3
"""Build the offline reading projection and deterministic redistribution archive."""
import argparse
import hashlib
import html
import io
import json
from pathlib import Path
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def inline(value):
    value = html.escape(value)
    value = re.sub(r"\[([^\]]+)\]\(([^)]+)\)",
                   lambda m: '<a href="' + m[2] + '">' + m[1] + '</a>'
                   if not re.match(r"(?:javascript|data|vbscript):", html.unescape(m[2]), re.I)
                   else m[1], value)
    value = re.sub(r"`([^`]+)`", r"<code>\1</code>", value)
    return re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", value)


def markdown(source):
    lines = source.splitlines()
    result, paragraph, code = [], [], None
    def flush():
        if paragraph:
            result.append('<p>' + inline(' '.join(paragraph)) + '</p>')
            paragraph.clear()
    for line in lines:
        if line.startswith('```'):
            flush()
            if code is None:
                code = []
            else:
                result.append('<pre><code>' + html.escape('\n'.join(code)) + '</code></pre>')
                code = None
        elif code is not None:
            code.append(line)
        elif line.startswith('#'):
            flush()
            n = min(6, len(line)-len(line.lstrip('#')))
            result.append(f'<h{n}>' + inline(line[n:].strip()) + f'</h{n}>')
        elif line.startswith('|'):
            flush()
            result.append('<pre class="table-row">' + html.escape(line) + '</pre>')
        elif re.match(r'^(?:- |\d+\. )', line):
            flush()
            result.append('<p class="list-item">' + inline(line) + '</p>')
        elif not line.strip():
            flush()
        else:
            paragraph.append(line)
    flush()
    return '\n'.join(result)


def outputs():
    docs = ['README.md', 'SKILL.md', 'references/WORKFLOW.md', 'references/STANDARDS.md',
            'references/CASE_STUDIES.md', 'references/PORTABILITY.md', 'PROVENANCE.md']
    page = ['<!doctype html><html lang="en"><meta charset="utf-8">',
            '<meta name="viewport" content="width=device-width,initial-scale=1">',
            '<title>Iterative environment production kit</title>',
            '<style>body{margin:0;background:#111b20;color:#e4ede7;font:17px/1.65 system-ui}main{max-width:960px;margin:auto;padding:2rem}a{color:#9dd9b6}h1,h2,h3{line-height:1.25;color:#fff}section{padding:2rem 0;border-top:1px solid #476158}pre{overflow:auto;background:#17272c;padding:.8rem;font-size:.86rem}code{color:#c4e5d1}.table-row{margin:0;padding:.1rem .5rem;white-space:pre}.list-item{padding-left:1rem}nav{display:flex;gap:1rem;flex-wrap:wrap}.note{padding:1rem;background:#253d37}</style>',
            '<main><h1>Iterative environment production kit</h1>',
            '<p>From measured plans to terrain, models, functional spaces and verified story detail.</p>',
            '<p class="note">Portable workflow and evidence tools, 28 October 2026. Recorded investigations demonstrate targeted results; they do not certify every map.</p>',
            '<p><a href="https://mrcalzon02.github.io/HB-TTRPG-tools/skills/environment-production/environment-production.zip">Download complete offline kit</a> · <a href="https://mrcalzon02.github.io/HB-TTRPG-tools/skills/environment-production/environment-production.zip.sha256">SHA-256</a> · <a href="manifest.json">Machine manifest</a> · <a href="source-index.json">Pinned sources</a> · <a href="https://mrcalzon02.github.io/HB-TTRPG-tools/agent-skills.html">Foundry skills</a></p>',
            '<nav>' + ''.join(f'<a href="#chapter-{i}">{Path(doc).stem}</a>' for i, doc in enumerate(docs)) + '</nav>']
    for i, doc in enumerate(docs):
        content = (ROOT / doc).read_text(encoding='utf-8')
        # Root-relative projection of references originally relative to their document.
        if '/' in doc:
            content = re.sub(r'\]\((?!https?://|#)([^)]+)\)',
                             lambda m: '](' + str(Path(doc).parent / m[1]).replace('\\', '/') + ')', content)
        page.append(f'<section id="chapter-{i}">' + markdown(content) + '</section>')
    page.append('</main></html>')
    index = '\n'.join(page).encode('utf-8')
    files = {p.relative_to(ROOT).as_posix(): p.read_text(encoding='utf-8').encode('utf-8') for p in ROOT.rglob('*')
             if p.is_file() and '__pycache__' not in p.parts and p.suffix != '.pyc'
             and p.name not in ('index.html', 'environment-production.zip', 'environment-production.zip.sha256')}
    files['index.html'] = index
    stream = io.BytesIO()
    # Stored entries avoid zlib-version differences between Windows and CI.
    with zipfile.ZipFile(stream, 'w', zipfile.ZIP_STORED) as archive:
        for name, data in sorted(files.items()):
            entry = zipfile.ZipInfo('environment-production/' + name, date_time=(2026, 10, 28, 0, 0, 0))
            entry.create_system = 3
            entry.compress_type = zipfile.ZIP_STORED
            entry.external_attr = 0o100644 << 16
            archive.writestr(entry, data)
    zipped = stream.getvalue()
    return {'index.html': index, 'environment-production.zip': zipped,
            'environment-production.zip.sha256': (hashlib.sha256(zipped).hexdigest() + '  environment-production.zip\n').encode('ascii')}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    stale = []
    for name, data in outputs().items():
        path = ROOT / name
        if args.check:
            if not path.exists() or path.read_bytes() != data:
                stale.append(name)
        else:
            path.write_bytes(data)
    if stale:
        raise SystemExit('Stale generated package: ' + ', '.join(stale))
    print('Package current' if args.check else 'HTML and deterministic ZIP built')


if __name__ == '__main__':
    main()
