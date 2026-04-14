"""Minimal word library sync API for HF Spaces."""
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import json, os
from pathlib import Path

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)

DATA_DIR = Path(os.environ.get('DATA_DIR', '/data'))
WORDS_FILE = DATA_DIR / 'words.json'
CATS_FILE = DATA_DIR / 'cat_names.json'

def load_json(path, default=None):
    try:
        if path.exists():
            return json.loads(path.read_text('utf-8'))
    except Exception:
        pass
    return default or {}

def save_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), 'utf-8')


@app.get('/api/sync')
def sync_get():
    """Return full word library + category names."""
    words = load_json(WORDS_FILE)
    cats = load_json(CATS_FILE)
    return jsonify(ok=True, words=words, cat_names=cats)


@app.post('/api/sync')
def sync_post():
    """Receive and save full word library + category names."""
    data = request.json or {}
    if 'words' in data:
        save_json(WORDS_FILE, data['words'])
    if 'cat_names' in data:
        save_json(CATS_FILE, data['cat_names'])
    return jsonify(ok=True)


# --- Serve frontend SPA ---
DIST_DIR = Path(__file__).parent / 'static'

@app.get('/')
def index():
    return send_from_directory(str(DIST_DIR), 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    full = DIST_DIR / path
    if full.exists() and full.is_file():
        return send_from_directory(str(DIST_DIR), path)
    return send_from_directory(str(DIST_DIR), 'index.html')


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=7860, debug=True)
