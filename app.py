from __future__ import annotations
import json
import os
import shutil
from pathlib import Path
import random
from dataclasses import dataclass, field
from typing import Dict, List, Optional
from flask import Flask, jsonify, request, render_template, send_from_directory

app = Flask(__name__, static_folder='static')
app.config['TEMPLATES_AUTO_RELOAD'] = True
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

@app.after_request
def add_no_cache_headers(resp):
    resp.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    resp.headers['Pragma'] = 'no-cache'
    resp.headers['Expires'] = '0'
    return resp

# -----------------------------
# Data models
# -----------------------------
@dataclass
class Player:
    id: int
    name: str
    color: str
    alive: bool = True

@dataclass
class GameState:
    started: bool = False
    total_players: int = 0
    undercover_count: int = 0
    blank_count: int = 0
    players: List[Player] = field(default_factory=list)
    roles: Dict[int, str] = field(default_factory=dict)  # id -> 'civilian'|'undercover'|'blank'
    words: Dict[str, str] = field(default_factory=dict)  # {'civilian': xxx, 'undercover': yyy}
    eliminated_order: List[int] = field(default_factory=list)
    first_speaker_id: Optional[int] = None

    def reset(self):
        self.started = False
        self.total_players = 0
        self.undercover_count = 0
        self.blank_count = 0
        self.players = []
        self.roles = {}
        self.words = {}
        self.eliminated_order = []
        self.first_speaker_id = None


game_state = GameState()

# -----------------------------
# Words storage path (persistent on HF Spaces)
# -----------------------------
def _get_words_path() -> Path:
    """Return the path to words.json.
    On HF Spaces, use /data/ for persistent storage.
    Locally, use the project's data/ directory.
    """
    base_dir = Path(__file__).resolve().parent
    default_path = base_dir / 'data' / 'words.json'
    # HF Spaces persistent storage
    if os.environ.get('SPACE_ID') or Path('/data').is_dir():
        persistent_path = Path('/data/words.json')
        if not persistent_path.exists() and default_path.exists():
            shutil.copy2(str(default_path), str(persistent_path))
        if persistent_path.exists():
            return persistent_path
    return default_path

WORDS_PATH = _get_words_path()

# -----------------------------
# Words loading (by category)
# -----------------------------

def load_words_by_category() -> Dict[str, List[Dict[str, str]]]:
    """Load word pairs grouped by category from words.json.
    
    Supported formats:
    - Old format: top-level list of {"civilian": ..., "undercover": ...}
      will be treated as a single "general" category.
    - New format: dict mapping category key -> list of such pairs.
    """
    
    try:
        words_path = WORDS_PATH
        with open(words_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Old format: top-level list -> put into "general"
        if isinstance(data, list):
            pairs: List[Dict[str, str]] = []
            for item in data:
                if not isinstance(item, dict):
                    continue
                c = item.get('civilian')
                u = item.get('undercover')
                if isinstance(c, str) and isinstance(u, str) and c and u:
                    pairs.append({'civilian': c, 'undercover': u})
            if pairs:
                return {"general": pairs}
        
        # New format: mapping category -> list of pairs
        if isinstance(data, dict):
            by_cat: Dict[str, List[Dict[str, str]]] = {}
            for cat, items in data.items():
                if not isinstance(items, list):
                    continue
                collected: List[Dict[str, str]] = []
                for it in items:
                    if not isinstance(it, dict):
                        continue
                    c = it.get('civilian')
                    u = it.get('undercover')
                    if isinstance(c, str) and isinstance(u, str) and c and u:
                        collected.append({'civilian': c, 'undercover': u})
                if collected:
                    by_cat[str(cat)] = collected
            if by_cat:
                return by_cat
    except Exception:
        # Any error -> fall back to builtins
        pass
    
    # Fallback defaults, single "general" category
    return {
        "general": [
            {"civilian": "苹果", "undercover": "香蕉"},
            {"civilian": "手机", "undercover": "座机"},
            {"civilian": "火车", "undercover": "地铁"},
            {"civilian": "篮球", "undercover": "足球"},
            {"civilian": "牛奶", "undercover": "酸奶"},
        ]
    }


WORD_CATEGORIES: Dict[str, List[Dict[str, str]]] = load_words_by_category()

def pick_word_pair(selected_categories: Optional[List[str]] = None) -> Dict[str, str]:
    """Pick a random word pair from the configured categories."""
    non_empty = {k: v for k, v in WORD_CATEGORIES.items() if v}
    if not non_empty:
        raise RuntimeError('No word pairs available')
    
    if selected_categories:
        cats = [c for c in selected_categories if c in non_empty]
        if not cats:
            cats = list(non_empty.keys())
    else:
        cats = list(non_empty.keys())
    
    pool: List[Dict[str, str]] = []
    for c in cats:
        pool.extend(non_empty[c])
    if not pool:
        pool = next(iter(non_empty.values()))
    pair = random.choice(pool)
    # Randomly swap which word is civilian vs undercover
    if random.random() < 0.5:
        return {'civilian': pair['undercover'], 'undercover': pair['civilian']}
    return pair

# -----------------------------
# Helpers
# -----------------------------

def validate_setup(payload: dict) -> Optional[str]:
    try:
        total = int(payload.get('total_players', 0))
        undercover = int(payload.get('undercover_count', 0))
        use_blank = bool(payload.get('use_blank', False))
        blank = int(payload.get('blank_count', 0)) if use_blank else 0
        players = payload.get('players', [])
    except Exception:
        return '参数格式错误'

    if total <= 2:
        return '玩家人数必须大于 2'
    if undercover < 0 or blank < 0:
        return '卧底/白板数量不能为负数'
    if undercover + blank >= total:
        return '卧底 + 白板 必须小于 玩家总数（至少留 1 名平民）'
    if not isinstance(players, list) or len(players) != total:
        return '玩家信息数量必须与总人数一致'
    for i, p in enumerate(players):
        if not isinstance(p, dict):
            return f'玩家 {i+1} 信息格式错误'
        name = (p.get('name') or '').strip()
        color = (p.get('color') or '').strip()
        if not name:
            return f'玩家 {i+1} 名字不能为空'
        if not color:
            return f'玩家 {i+1} 颜色不能为空'
    return None


def assign_roles(total: int, undercover_count: int, blank_count: int) -> Dict[int, str]:
    ids = list(range(total))
    random.shuffle(ids)
    undercovers = set(ids[:undercover_count])
    blanks = set(ids[undercover_count:undercover_count + blank_count])
    roles = {}
    for i in range(total):
        if i in undercovers:
            roles[i] = 'undercover'
        elif i in blanks:
            roles[i] = 'blank'
        else:
            roles[i] = 'civilian'
    return roles


def evaluate_winner() -> Optional[str]:
    if not game_state.started:
        return None
    alive_ids = {p.id for p in game_state.players if p.alive}
    u = sum(1 for i, r in game_state.roles.items() if r == 'undercover' and i in alive_ids)
    b = sum(1 for i, r in game_state.roles.items() if r == 'blank' and i in alive_ids)
    c = sum(1 for i, r in game_state.roles.items() if r == 'civilian' and i in alive_ids)
    total_alive = len(alive_ids)
    # 胜负规则：
    # - 白板胜利：仅剩 2 人且包含 1 名白板（可与卧底或平民同场）
    if total_alive == 2 and b == 1:
        return 'blank'
    # - 卧底胜利：场上存在卧底，且“非卧底（平民+白板）”存活总数为 1
    if u > 0 and (c + b) == 1:
        return 'undercover'
    # - 平民胜利：所有卧底和白板都出局（场上无卧底且无白板）
    if u == 0 and b == 0:
        return 'civilians'
    return None


def public_state() -> dict:
    winner = evaluate_winner()
    # Build reveal data if game ended
    reveal = None
    if winner is not None:
        undercover_ids = [i for i, r in game_state.roles.items() if r == 'undercover']
        blank_ids = [i for i, r in game_state.roles.items() if r == 'blank']
        undercover_names = [game_state.players[i].name for i in undercover_ids]
        blank_names = [game_state.players[i].name for i in blank_ids]
        reveal = {
            'words': game_state.words,
            'undercover_ids': undercover_ids,
            'blank_ids': blank_ids,
            'undercover_names': undercover_names,
            'blank_names': blank_names,
        }
    return {
        'started': game_state.started,
        'config': {
            'total_players': game_state.total_players,
            'undercover_count': game_state.undercover_count,
            'blank_count': game_state.blank_count,
        },
        'players': [
            {
                'id': p.id,
                'name': p.name,
                'color': p.color,
                'alive': p.alive,
            } for p in game_state.players
        ],
        'first_speaker_id': game_state.first_speaker_id,
        'status': {
            'ended': winner is not None,
            'winner': winner,
            'alive_counts': {
                'undercover': sum(1 for i, r in game_state.roles.items() if r == 'undercover' and game_state.players[i].alive),
                'civilian': sum(1 for i, r in game_state.roles.items() if r == 'civilian' and game_state.players[i].alive),
                'blank': sum(1 for i, r in game_state.roles.items() if r == 'blank' and game_state.players[i].alive),
            },
            'reveal': reveal
        }
    }


# -----------------------------
# Routes
# -----------------------------

REACT_DIR = Path(__file__).parent / 'static' / 'react'

@app.get('/')
def index():
    if (REACT_DIR / 'index.html').exists():
        return send_from_directory(str(REACT_DIR), 'index.html')
    return render_template('index.html')

@app.get('/result')
def result_page():
    if (REACT_DIR / 'index.html').exists():
        return send_from_directory(str(REACT_DIR), 'index.html')
    return render_template('result.html')

@app.get('/game')
def game_page():
    if (REACT_DIR / 'index.html').exists():
        return send_from_directory(str(REACT_DIR), 'index.html')
    return render_template('index.html')

@app.get('/words')
def words_page():
    if (REACT_DIR / 'index.html').exists():
        return send_from_directory(str(REACT_DIR), 'index.html')
    return render_template('index.html')

@app.route('/assets/<path:filename>')
def react_assets(filename):
    return send_from_directory(str(REACT_DIR / 'assets'), filename)


@app.post('/api/start')
def api_start():
    payload = request.get_json(silent=True) or {}
    error = validate_setup(payload)
    if error:
        return jsonify({'ok': False, 'error': error}), 400

    total = int(payload['total_players'])
    undercover = int(payload['undercover_count'])
    use_blank = bool(payload.get('use_blank', False))
    blank = int(payload.get('blank_count', 0)) if use_blank else 0
    players_payload = payload['players']
    # 选中的词库分类（可选，前端可以不传）
    categories = payload.get('categories') or []
    if not isinstance(categories, list):
        categories = []

    # Prepare players
    players: List[Player] = []
    for i in range(total):
        p = players_payload[i]
        players.append(Player(id=i, name=p['name'].strip(), color=p['color'].strip(), alive=True))

    # Assign roles
    roles = assign_roles(total, undercover, blank)

    # Pick a word pair based on selected categories
    pair = pick_word_pair(categories)

    # Set game state
    game_state.started = True
    game_state.total_players = total
    game_state.undercover_count = undercover
    game_state.blank_count = blank
    game_state.players = players
    game_state.roles = roles
    game_state.words = {'civilian': pair['civilian'], 'undercover': pair['undercover']}
    game_state.eliminated_order = []
    # Randomly choose first speaker among all players
    game_state.first_speaker_id = random.randrange(total) if total > 0 else None

    return jsonify({'ok': True, 'state': public_state()})


@app.get('/api/state')
def api_state():
    return jsonify({'ok': True, 'state': public_state()})


@app.get('/api/word_stats')
def api_word_stats():
    """Return word counts per category so that frontend can display them."""
    counts = {k: len(v) for k, v in WORD_CATEGORIES.items()}
    return jsonify({'ok': True, 'categories': counts})


def _save_words():
    """Persist WORD_CATEGORIES back to words.json (persistent path)."""
    with open(WORDS_PATH, 'w', encoding='utf-8') as f:
        json.dump(WORD_CATEGORIES, f, ensure_ascii=False, indent=2)


@app.get('/api/words/<category>')
def api_get_words(category: str):
    """Get all word pairs in a category."""
    pairs = WORD_CATEGORIES.get(category, [])
    return jsonify({'ok': True, 'pairs': pairs})


@app.post('/api/words/<category>')
def api_add_word(category: str):
    """Add a single word pair to a category."""
    payload = request.get_json(silent=True) or {}
    w1 = (payload.get('word1') or '').strip()
    w2 = (payload.get('word2') or '').strip()
    if not w1 or not w2:
        return jsonify({'ok': False, 'error': '两个词语都不能为空'}), 400
    if category not in WORD_CATEGORIES:
        WORD_CATEGORIES[category] = []
    # Check duplicate
    for p in WORD_CATEGORIES[category]:
        if (p['civilian'] == w1 and p['undercover'] == w2) or \
           (p['civilian'] == w2 and p['undercover'] == w1):
            return jsonify({'ok': False, 'error': '该词对已存在'}), 400
    WORD_CATEGORIES[category].append({'civilian': w1, 'undercover': w2})
    _save_words()
    return jsonify({'ok': True, 'count': len(WORD_CATEGORIES[category])})


@app.delete('/api/words/<category>/<int:index>')
def api_delete_word(category: str, index: int):
    """Delete a word pair by index from a category."""
    pairs = WORD_CATEGORIES.get(category, [])
    if index < 0 or index >= len(pairs):
        return jsonify({'ok': False, 'error': '索引无效'}), 400
    pairs.pop(index)
    _save_words()
    return jsonify({'ok': True, 'count': len(pairs)})


@app.post('/api/words/<category>/batch')
def api_batch_import(category: str):
    """Batch import word pairs. Format: word1,word2;word3,word4; ..."""
    payload = request.get_json(silent=True) or {}
    text = (payload.get('text') or '').strip()
    if not text:
        return jsonify({'ok': False, 'error': '内容不能为空'}), 400
    if category not in WORD_CATEGORIES:
        WORD_CATEGORIES[category] = []
    added = 0
    errors = []
    # Split by semicolons, then each part by comma
    entries = [e.strip() for e in text.replace('\n', ';').split(';') if e.strip()]
    for i, entry in enumerate(entries):
        parts = [p.strip() for p in entry.split(',')]
        if len(parts) != 2 or not parts[0] or not parts[1]:
            errors.append(f'第{i+1}条格式错误: "{entry}"')
            continue
        w1, w2 = parts[0], parts[1]
        # Check duplicate
        dup = False
        for p in WORD_CATEGORIES[category]:
            if (p['civilian'] == w1 and p['undercover'] == w2) or \
               (p['civilian'] == w2 and p['undercover'] == w1):
                dup = True
                break
        if dup:
            errors.append(f'第{i+1}条已存在: "{w1},{w2}"')
            continue
        WORD_CATEGORIES[category].append({'civilian': w1, 'undercover': w2})
        added += 1
    _save_words()
    return jsonify({'ok': True, 'added': added, 'errors': errors, 'count': len(WORD_CATEGORIES[category])})


@app.get('/api/player_word/<int:pid>')
def api_player_word(pid: int):
    if not game_state.started or pid < 0 or pid >= len(game_state.players):
        return jsonify({'ok': False, 'error': '无效的玩家或游戏未开始'}), 400
    role = game_state.roles.get(pid)
    if role == 'civilian':
        word = game_state.words.get('civilian', '')
    elif role == 'undercover':
        word = game_state.words.get('undercover', '')
    else:  # blank
        word = ''
    return jsonify({'ok': True, 'word': word, 'role': role})


@app.post('/api/vote')
def api_vote():
    payload = request.get_json(silent=True) or {}
    pid = payload.get('target_id')
    if not game_state.started or not isinstance(pid, int) or pid < 0 or pid >= len(game_state.players):
        return jsonify({'ok': False, 'error': '无效的投票对象或游戏未开始'}), 400
    player = game_state.players[pid]
    if not player.alive:
        return jsonify({'ok': False, 'error': '该玩家已出局'}), 400

    # Eliminate
    player.alive = False
    game_state.eliminated_order.append(pid)

    # Check winner
    winner = evaluate_winner()
    return jsonify({'ok': True, 'state': public_state(), 'just_eliminated': pid, 'winner': winner})


@app.post('/api/reset')
def api_reset():
    game_state.reset()
    return jsonify({'ok': True, 'state': public_state()})


@app.post('/api/redeal')
def api_redeal():
    # Must have an existing setup
    if not game_state.players or game_state.total_players <= 0:
        return jsonify({'ok': False, 'error': '当前没有可复用的玩家配置，请先开始一局'}), 400

    total = game_state.total_players
    undercover = game_state.undercover_count
    blank = game_state.blank_count
    if undercover < 0 or blank < 0 or undercover + blank >= total:
        return jsonify({'ok': False, 'error': '配置不合法，请重新设置'}), 400

    # Reset players alive
    for p in game_state.players:
        p.alive = True

    # Redeal roles and words
    game_state.roles = assign_roles(total, undercover, blank)
    pair = pick_word_pair()
    game_state.words = {'civilian': pair['civilian'], 'undercover': pair['undercover']}
    game_state.eliminated_order = []
    game_state.started = True
    game_state.first_speaker_id = random.randrange(total) if total > 0 else None

    return jsonify({'ok': True, 'state': public_state()})

if __name__ == '__main__':
    # For local development
    app.run(host='0.0.0.0', port=5000, debug=True)
