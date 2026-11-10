"""Offline GitHub-style directory fixture and extension browser smoke tests.

Run: python tests/smoke_test.py
Requirements: playwright and Chromium (no GitHub network requests).
"""
import asyncio
import base64
import io
from pathlib import Path
from urllib.parse import urlparse
from PIL import Image, ImageDraw
from playwright.async_api import async_playwright

PROJECT = Path(__file__).resolve().parents[1]
BASE = 'https://github.com/mrcalzon02/Tanks-for-bob-Fork'
FOLDER = '/tree/main/art/third-party/unused-renders/item-mipped'
NAMES = ['part-bullet-casings-1.png', 'pile-ashes-1.png', 'pile-charcoal-2.png', 'pile-chunk-wood-chips-1.png']

CSS = '''
* { box-sizing: border-box; }
body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #0d1117; color: #c9d1d9; font-size: 14px; }
a { color: #e6edf3; text-decoration: none; }
.top { display:flex; align-items:center; padding:16px 26px; gap:26px; background:#010409; border-bottom:1px solid #30363d; }
.avatar { width:33px;height:33px;background:#e4cc70;color:#111;border-radius:50%;display:grid;place-items:center;font-weight:800; }
.repo { font-weight:650; }
.menu { margin-left:auto; color:#8b949e; }
nav { display:flex;gap:30px;padding:18px 24px;border-bottom:1px solid #30363d; }
nav strong { color: #f0f6fc; border-bottom:2px solid #f78166; padding-bottom:18px; margin-bottom:-19px; }
main { width: min(1200px, calc(100% - 70px)); margin: 28px auto; }
.path { color:#58a6ff; font-size:15px; margin:0 0 22px; }
.path b { color:#f0f6fc; }
.chip { display:inline-block; color:#c9d1d9; background:#21262d; border:1px solid #30363d;border-radius:6px;padding:8px 14px; margin-right:14px; }
.commit { border:1px solid #30363d; border-radius:7px; padding:16px; margin:0 0 16px; }
.note { display:inline-block;font-size:12px;color:#b6d8ac;background:#1b3228;border:1px solid #24533b;border-radius:4px;padding:5px 8px;margin-bottom:20px; }
.react-directory-table { border:1px solid #30363d; border-radius:7px; overflow:hidden; }
[role=row] { display:grid; grid-template-columns: 40% 45% 15%; align-items:center; padding:12px 16px; border-bottom:1px solid #30363d; }
[role=row]:last-child { border-bottom:none; }
[role=columnheader] { color:#8b949e; background:#161b22; padding-top:14px; padding-bottom:14px; }
.file-link { color:#f0f6fc; font-weight:550; }
.file-link:before { content:'▧'; font-size:16px;color:#8b949e; margin-right:14px; }
.small { color:#8b949e; font-size:12px; }
footer { font-size:12px; color:#8b949e; margin:24px auto; text-align:center; }
'''

def html_page(names, test_note=True):
    rows=''.join(f'<div class="react-directory-row" role="row"><div><a class="file-link" href="{BASE}/blob/main/art/third-party/unused-renders/item-mipped/{name}">{name}</a></div><div class="small">art: stage credited Unused Renders item sprites</div><div class="small">5 days ago</div></div>' for name in names)
    return f'''<!DOCTYPE html><html><head><title>GitHub Image Gallery fixture</title><meta charset="utf-8"><style>{CSS}</style></head>
<body><header class="top"><div class="avatar">M</div><div class="repo">mrcalzon02&nbsp; / &nbsp;Tanks-for-bob-Fork</div><div class="menu">Issues　 Pull requests　 Actions　 Wiki　 Settings</div></header>
<nav><strong>Code</strong><span>Issues</span><span>Pull requests</span><span>Actions</span><span>Projects</span><span>Wiki</span></nav>
<main><p class="path"><span class="chip">main ⌄</span> Tanks-for-bob-Fork&nbsp; / &nbsp;art&nbsp; / &nbsp;third-party&nbsp; / &nbsp;unused-renders&nbsp; / &nbsp;<b>item-mipped</b>&nbsp; /</p>
<div class="commit">🟡 &nbsp;mrcalzon02 &nbsp;<span class="small"> art: stage credited Unused Renders item sprites for visual reuse review</span></div>
{'<div class="note">LOCAL TEST FIXTURE — sample artwork, not the repository’s real images</div>' if test_note else ''}
<div class="react-directory-table" role="table"><div role="row" rolelabel="header"><div role="columnheader">Name</div><div role="columnheader">Last commit message</div><div role="columnheader">Last commit date</div></div>{rows}</div>
<article id="readme" class="markdown-body"><p>Example readme link: <a href="{BASE}/blob/main/README.png">README.png</a></p></article>
</main><footer>Offline extension behavior test • no external network</footer></body></html>'''


def sample_image(name):
    size = 112
    im = Image.new('RGBA', (size,size), (0,0,0,0))
    d = ImageDraw.Draw(im)
    if 'casings' in name:
        for x,off in [(25,10),(52,0),(79,14)]:
            d.rounded_rectangle((x,21+off,x+13,76+off), radius=3, fill='#c7a45d',outline='#efcd88',width=2)
            d.ellipse((x,18+off,x+13,26+off),fill='#e8bd70')
    elif 'ashes' in name:
        for k in range(12):
            x = 12 + (k*19)%88; y = 68+((k*13)%27)
            d.ellipse((x-14,y-5,x+16,y+5),fill=('#6d6f74' if k%2 else '#999a9c'))
    elif 'charcoal' in name:
        for k in range(10):
            x=13+(k*19)%80; y=58+(k*17)%35
            d.rounded_rectangle((x-6,y-12,x+22,y+4),radius=3,fill='#35383e',outline='#777985',width=1)
    else:
        for k in range(10):
            x=15+(k*26)%82; y=60+(k*18)%28
            d.polygon([(x-9,y-4),(x+15,y-10),(x+20,y+1),(x-5,y+7)],fill=('#b9864e' if k%2 else '#d5a16b'))
    out=io.BytesIO();im.save(out,format='PNG');return out.getvalue()


async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
        page = await browser.new_page(viewport={'width':1280,'height':1000},device_scale_factor=1)
        await page.set_content(html_page(NAMES))
        # All external navigations are blocked in this offline test environment.
        # The injected test location stands in for GitHub's current route.
        await page.evaluate("(url) => { window.__fixtureLocation = {href: url, origin: 'https://github.com', pathname: new URL(url).pathname}; }", BASE + FOLDER)
        await page.add_style_tag(path=str(PROJECT/'content.css'))
        image_map = {name: 'data:image/png;base64,' + base64.b64encode(sample_image(name)).decode() for name in NAMES}
        image_map['next.png'] = 'data:image/png;base64,' + base64.b64encode(sample_image('next.png')).decode()
        await page.evaluate('(images) => window.__fixtureImages = images', image_map)
        # Patch only the test copy, leaving the distributable content script unchanged.
        source = (PROJECT/'content.js').read_text()
        source = source.replace("'use strict';", "'use strict';\n  const location = window.__fixtureLocation;", 1)
        source = source.replace('image.src = item.src;', 'image.src = window.__fixtureImages?.[item.name] || item.src;', 1)
        await page.add_script_tag(content=source)
        await page.locator('#gh-image-gallery .ghig-card').first.wait_for()
        await page.wait_for_timeout(180)
        assert await page.locator('#gh-image-gallery .ghig-card').count() == 4
        assert await page.locator('#gh-image-gallery').count() == 1
        assert await page.locator('#gh-image-gallery .ghig-filename').all_text_contents() == NAMES
        assert await page.locator('#gh-image-gallery .ghig-card').first.get_attribute('href') == BASE + '/blob/main/art/third-party/unused-renders/item-mipped/' + NAMES[0]
        assert await page.locator('#gh-image-gallery .ghig-image-frame img').first.evaluate('(img) => img.complete && img.naturalWidth > 0')
        assert await page.locator('#gh-image-gallery .ghig-card').first.evaluate('(el) => !!el.querySelector("img[loading=lazy]")')
        assert await page.locator('[data-ghig-size="medium"]').get_attribute('aria-pressed') == 'true'

        await page.locator('[data-ghig-size="large"]').click()
        assert await page.locator('#gh-image-gallery').get_attribute('data-size') == 'large'
        await page.locator('.ghig-collapse').click()
        assert 'ghig-collapsed' in (await page.locator('#gh-image-gallery').get_attribute('class'))
        await page.locator('.ghig-collapse').click()
        assert 'ghig-collapsed' not in (await page.locator('#gh-image-gallery').get_attribute('class'))
        await page.locator('[data-ghig-size="medium"]').click()

        await page.evaluate('''() => document.querySelector('[role="table"]').append(document.createComment('react update'))''')
        await page.wait_for_timeout(180)
        assert await page.locator('#gh-image-gallery').count() == 1

        # Capture the actual extension DOM, not a design rendering.
        output = PROJECT.parents[0] / 'github-image-gallery-preview.png'
        await page.screenshot(path=str(output),full_page=True)

        # Simulate GitHub's Turbo/React changing the directory without a full load.
        await page.evaluate('''() => {
          window.__fixtureLocation.pathname = '/mrcalzon02/Tanks-for-bob-Fork/tree/main/images/next-folder';
          window.__fixtureLocation.href = 'https://github.com' + window.__fixtureLocation.pathname;
          const rows = document.querySelectorAll('.react-directory-row');
          for (const row of rows) row.remove();
          const row = document.createElement('div');
          row.className = 'react-directory-row'; row.setAttribute('role', 'row');
          row.innerHTML = '<div><a href="/mrcalzon02/Tanks-for-bob-Fork/blob/main/images/next-folder/next.png">next.png</a></div>';
          document.querySelector('[role="table"]').append(row);
        }''')
        await page.wait_for_timeout(250)
        assert await page.locator('#gh-image-gallery .ghig-card').count() == 1
        assert await page.locator('#gh-image-gallery .ghig-filename').inner_text() == 'next.png'
        await page.evaluate("window.__fixtureLocation.pathname = '/mrcalzon02/Tanks-for-bob-Fork/issues'")
        await page.evaluate("document.querySelector('[role=table]').remove()")
        await page.wait_for_timeout(250)
        assert await page.locator('#gh-image-gallery').count() == 0
        print('PASS: gallery/links/images/toggle/sizes/React updates/navigation; screenshot:', output)
        await browser.close()


if __name__ == '__main__':
    asyncio.run(main())
