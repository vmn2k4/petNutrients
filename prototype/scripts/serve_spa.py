#!/usr/bin/env python3
"""Dev server with SPA fallback to index.html for History API routes."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
class H(SimpleHTTPRequestHandler):
  def __init__(self, *a, **k):
    super().__init__(*a, directory=str(ROOT), **k)
  def end_headers(self):
    self.send_header('Cache-Control', 'no-store')
    super().end_headers()
  def do_GET(self):
    path = self.path.split('?',1)[0]
    file = ROOT / path.lstrip('/')
    if path != '/' and not file.is_file() and not (file / 'index.html').is_file():
      self.path = '/index.html'
    return super().do_GET()
import sys
if __name__ == '__main__':
  ThreadingHTTPServer(('127.0.0.1', int(sys.argv[1]) if len(sys.argv) > 1 else 8767), H).serve_forever()
