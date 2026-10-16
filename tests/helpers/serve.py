"""Serve unchanged static files at both / and /TWBW/ for Pages path checks."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import sys


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith("/TWBW/"):
            self.path = self.path[len("/TWBW"):]
        super().do_GET()


root = Path(__file__).resolve().parents[2]
ThreadingHTTPServer(("127.0.0.1", int(sys.argv[1])), partial(Handler, directory=str(root))).serve_forever()
