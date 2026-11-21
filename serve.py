"""Loopback-only preview with byte-range support for browser video playback."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import re


class MediaHandler(SimpleHTTPRequestHandler):
    def send_head(self):
        self.byte_range = None
        path = Path(self.translate_path(self.path))
        if not path.is_file():
            return super().send_head()
        try:
            source = path.open('rb')
        except OSError:
            self.send_error(404, 'File not found')
            return None
        stat = path.stat()
        size = stat.st_size
        modified = self.date_time_string(stat.st_mtime)
        requested = self.headers.get('Range', '')
        if self.headers.get('If-Range', modified) != modified:
            requested = ''
        match = re.fullmatch(r'bytes=(\d*)-(\d*)', requested)
        if match and any(match.groups()):
            first, last = match.groups()
            start = int(first) if first else max(0, size - int(last))
            end = min(int(last), size - 1) if first and last else size - 1
            if start >= size or end < start or (not first and int(last) == 0):
                source.close()
                self.send_response(416)
                self.send_header('Content-Range', f'bytes */{size}')
                self.send_header('Content-Length', '0')
                self.end_headers()
                return None
            self.byte_range = (start, end)
            source.seek(start)
            self.send_response(206)
            self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
            length = end - start + 1
        else:
            self.send_response(200)
            length = size
        self.send_header('Content-Type', self.guess_type(str(path)))
        self.send_header('Content-Length', str(length))
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Last-Modified', modified)
        self.send_header('Cache-Control', 'no-cache')
        self.end_headers()
        return source

    def copyfile(self, source, outputfile):
        remaining = None if self.byte_range is None else self.byte_range[1] - self.byte_range[0] + 1
        try:
            while remaining is None or remaining > 0:
                chunk = source.read(256 * 1024 if remaining is None else min(256 * 1024, remaining))
                if not chunk:
                    break
                outputfile.write(chunk)
                if remaining is not None:
                    remaining -= len(chunk)
        except (BrokenPipeError, ConnectionResetError):
            pass  # Normal when a browser changes case or cancels preloading.


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8766)
    args = parser.parse_args()
    root = Path(__file__).resolve().parent
    handler = partial(MediaHandler, directory=str(root))
    server = ThreadingHTTPServer(('127.0.0.1', args.port), handler)
    print(f'Local preview: http://127.0.0.1:{args.port}/', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
