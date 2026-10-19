#!/bin/sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec python3 - "$script_dir" <<'PY'
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import sys
import webbrowser


directory = Path(sys.argv[1])
handler = partial(SimpleHTTPRequestHandler, directory=directory)

with ThreadingHTTPServer(("127.0.0.1", 0), handler) as server:
	url = f"http://127.0.0.1:{server.server_address[1]}"
	print(f"Application ouverte sur {url}. Arrêtez avec Ctrl+C.", flush=True)
	webbrowser.open_new_tab(url)
	try:
		server.serve_forever()
	except KeyboardInterrupt:
		print("\nServeur arrêté.")
PY
