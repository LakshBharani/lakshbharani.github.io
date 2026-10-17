from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

root = Path(__file__).parent / 'dist'
class Page(HTMLParser):
    def __init__(self):
        super().__init__(); self.ids=set(); self.links=[]; self.assets=[]; self.headings=0
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if 'id' in a:
            assert a['id'] not in self.ids, f'Duplicate ID: {a["id"]}'
            self.ids.add(a['id'])
        if tag=='h1': self.headings+=1
        if tag=='a':
            assert a.get('href') is not None
            self.links.append(a['href'])
            if a.get('target')=='_blank': assert 'noopener' in a.get('rel','')
        if tag=='img':
            assert 'alt' in a, 'Image missing alternative text'
            self.assets.append(a['src'])
        if tag=='link' and a.get('href'): self.assets.append(a['href'])
        if tag=='script' and a.get('src'): self.assets.append(a['src'])
p=Page(); p.feed((root/'index.html').read_text())
assert p.headings==1
for value in p.links+p.assets:
    u=urlsplit(value)
    if u.scheme or u.netloc: continue
    if u.path: assert (root/unquote(u.path)).is_file(), f'Missing asset: {value}'
    if u.fragment: assert u.fragment in p.ids, f'Missing section: {value}'
assert (root/'assets/Laksh-Bharani-Resume.pdf').read_bytes().startswith(b'%PDF-')
print(f'PASS: {len(p.links)} links, {len(p.assets)} assets, section targets, PDF, heading and image checks')
