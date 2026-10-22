"""Static dev server for the prototype with caching disabled, so edits show on reload."""
import http.server, os, sys

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

if __name__ == "__main__":
    os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
    http.server.ThreadingHTTPServer(("", int(sys.argv[1]) if len(sys.argv) > 1 else 5173), NoCache).serve_forever()
