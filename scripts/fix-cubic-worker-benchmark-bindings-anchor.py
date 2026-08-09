#!/usr/bin/env python3
from pathlib import Path

path = Path('scripts/apply-cubic-worker-benchmark.py')
text = path.read_text()
old = """replace_once(ui,
\"\"\"    target.querySelector('[data-bccd-start]').addEventListener('click', () => void runSearch().catch(error => { if (error?.name !== 'AbortError') setStatus(error.message, 'error'); }));
    target.querySelector('[data-bccd-pause]').addEventListener('click', pauseSearch);
\"\"\",
\"\"\"    target.querySelector('[data-bccd-start]').addEventListener('click', () => void runSearch().catch(error => { if (error?.name !== 'AbortError') setStatus(error.message, 'error'); }));
    target.querySelector('[data-bccd-pause]').addEventListener('click', pauseSearch);
    target.querySelector('[data-bccd-benchmark-workers]').addEventListener('click', () => void benchmarkWorkers().catch(error => setStatus(error.message, 'error')));
    target.querySelector('[data-bccd-apply-worker-recommendation]').addEventListener('click', () => { try { applyWorkerRecommendation(); } catch (error) { setStatus(error.message, 'error'); } });
\"\"\",
'Cubic worker benchmark bindings')"""
new = """replace_once(ui,
\"\"\"    target.querySelector('[data-bccd-start]').addEventListener('click', () => void runSearch().catch(error => { if (error?.name !== 'AbortError') console.error(error); }));
    target.querySelector('[data-bccd-pause]').addEventListener('click', pauseSearch);
\"\"\",
\"\"\"    target.querySelector('[data-bccd-start]').addEventListener('click', () => void runSearch().catch(error => { if (error?.name !== 'AbortError') console.error(error); }));
    target.querySelector('[data-bccd-pause]').addEventListener('click', pauseSearch);
    target.querySelector('[data-bccd-benchmark-workers]').addEventListener('click', () => void benchmarkWorkers().catch(error => setStatus(error.message, 'error')));
    target.querySelector('[data-bccd-apply-worker-recommendation]').addEventListener('click', () => { try { applyWorkerRecommendation(); } catch (error) { setStatus(error.message, 'error'); } });
\"\"\",
'Cubic worker benchmark bindings')"""
if new in text and old not in text:
    print('Cubic benchmark binding migration anchor already aligned.')
elif text.count(old) == 1:
    path.write_text(text.replace(old, new, 1))
    print('Cubic benchmark binding migration anchor aligned to current UI.')
else:
    raise SystemExit(f'Expected exactly one stale Cubic benchmark binding anchor, found {text.count(old)}')
