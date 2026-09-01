#!/usr/bin/env python3
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

HOST = "0.0.0.0"
PORT = 5176


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        print("%s - %s" % (self.address_string(), format % args), flush=True)


if __name__ == "__main__":
    server = ThreadingHTTPServer((HOST, PORT), QuietHandler)
    print(f"HEARTH_UP http://127.0.0.1:{PORT}", flush=True)
    server.serve_forever()
