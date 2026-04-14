const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const state = {
  started: false,
  players: [],
  config: { total_players: 0, undercover_count: 0, blank_count: 0 },
  status: { ended: false, winner: null, alive_counts: { undercover: 0, good: 0 }},
  first_speaker_id: null,
};

const CN_NAMES = ['小明','小红','小刚','小丽','小强','小芳','小杰','小雪','阿华','阿美','晨曦','子涵','浩然','思琪','宇航','明悦','若晴','一帆','嘉怡','梓晨','悦宁','锦程','可欣','语桐'];
function randomPlayerName() { return CN_NAMES[Math.floor(Math.random() * CN_NAMES.length)]; }
function randomPastelHex() {
  const h = Math.floor(Math.random() * 360);
  const tmp = document.createElement('div');
  tmp.style.color = `hsl(${h}, 80%, 60%)`;
  document.body.appendChild(tmp);
  const rgb = getComputedStyle(tmp).color.match(/\d+/g).map(Number);
  document.body.removeChild(tmp);
  const hex = `#${rgb.map(x => x.toString(16).padStart(2,'0')).join('')}`;
  return pastelizeColor(hex, 0.35);
}

function pickTextColor(bg) {
  try {
    let hex = (bg || '').trim();
    if (hex.startsWith('rgb')) {
      const nums = hex.match(/\d+/g).map(Number);
      const [r, g, b] = nums;
      const yiq = (r * 299 + g * 587 + b * 114) / 1000;
      return yiq >= 140 ? '#111111' : '#ffffff';
    }
    if (hex.startsWith('#')) {
      if (hex.length === 4) {
        hex = '#' + [...hex.slice(1)].map(ch => ch + ch).join('');
      }
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      const yiq = (r * 299 + g * 587 + b * 114) / 1000;
      return yiq >= 140 ? '#111111' : '#ffffff';
    }
  } catch (e) {}
  return '#ffffff';
}

// ---- Color helpers: pastelize arbitrary hex color for better readability
function hexToRgb(hex) {
  if (!hex) return { r: 0, g: 0, b: 0 };
  let h = hex.trim();
  if (h.startsWith('#')) h = h.slice(1);
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  return { r, g, b };
}
function rgbToHex(r, g, b) {
  const to = (x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}
function pastelizeColor(hex, weight = 0.35) {
  // Blend color with white by weight (0..1) to ensure pastel tone
  try {
    const { r, g, b } = hexToRgb(hex || '#888888');
    const wr = 255, wg = 255, wb = 255;
    const nr = r * (1 - weight) + wr * weight;
    const ng = g * (1 - weight) + wg * weight;
    const nb = b * (1 - weight) + wb * weight;
    return rgbToHex(nr, ng, nb);
  } catch (e) {
    return '#dddddd';
  }
}

// 保存当前设置与玩家信息到 localStorage
function saveSetupToLocal() {
  try {
    const setup = {
      total: clamp(parseInt(totalInput.value || '0', 10) || 0, 3, 20),
      undercover: clamp(parseInt(undercoverInput.value || '0', 10) || 0, 1, 6),
      blank: clamp(parseInt(blankCountInput.value || '0', 10) || 0, 0, 6),
    };
    localStorage.setItem(LS_KEY_SETUP, JSON.stringify(setup));

    const players = $$('.player-editor').map((div) => {
      const nameInput = div.querySelector('input[type="text"]');
      // 优先读取 data-color（在对局后可能被更新），否则留空
      const color = div.dataset.color || '';
      return { name: nameInput ? (nameInput.value || '') : '', color };
    });
    localStorage.setItem(LS_KEY_PLAYERS, JSON.stringify(players));
  } catch (_) {}
}

// 从 localStorage 恢复设置与玩家信息
function restoreSetupFromLocal() {
  try {
    const rawSetup = localStorage.getItem(LS_KEY_SETUP);
    if (rawSetup) {
      const setup = JSON.parse(rawSetup);
      if (setup && typeof setup === 'object') {
        if (typeof setup.total === 'number') totalInput.value = clamp(setup.total, 3, 20);
        if (typeof setup.undercover === 'number') undercoverInput.value = clamp(setup.undercover, 1, 6);
        if (typeof setup.blank === 'number') blankCountInput.value = clamp(setup.blank, 0, 6);
      }
    }
  } catch (_) {}

  // 先根据人数生成编辑器，再填充姓名与颜色
  generateEditors();

  try {
    const rawPlayers = localStorage.getItem(LS_KEY_PLAYERS);
    if (!rawPlayers) return;
    const players = JSON.parse(rawPlayers);
    if (!Array.isArray(players)) return;
    const editors = $$('.player-editor');
    players.forEach((p, idx) => {
      if (!p || typeof p !== 'object') return;
      if (idx >= editors.length) return;
      const div = editors[idx];
      const nameInput = div.querySelector('input[type="text"]');
      if (nameInput && typeof p.name === 'string') nameInput.value = p.name;
      if (typeof p.color === 'string' && p.color) {
        div.dataset.color = pastelizeColor(p.color, 0.35);
      }
    });
  } catch (_) {}
}

function toast(msg) {
  const modal = $('#modal');
  $('#modal-text').textContent = msg;
  modal.hidden = false;
}

function closeModal() {
  $('#modal').hidden = true;
}

$('#modal-close').addEventListener('click', closeModal);

// -------- Setup form logic --------
const totalInput = $('#total-players');
const undercoverInput = $('#undercover-count');
const useBlankInput = $('#use-blank');
const blankCountInput = $('#blank-count');
const playersEditor = $('#players-editor');

// -------- Local storage keys --------
const LS_KEY_SETUP = 'undercover-setup'; // 保存总人数、卧底数、白板数
const LS_KEY_PLAYERS = 'undercover-players'; // 保存玩家姓名与颜色

// 词库分类 key，与 tabs 顺序一一对应
const CATEGORY_KEYS = ['general', 'animals', 'food', 'jobs', 'objects', 'places'];
let activeCategories = new Set();

// Always allow editing whiteboard count in new UI
blankCountInput.disabled = false;

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function enforceConstraints(source) {
  const total = clamp(parseInt(totalInput.value || '0', 10) || 0, 3, 20);
  let u = clamp(parseInt(undercoverInput.value || '0', 10) || 0, 1, 6);
  let b = clamp(parseInt(blankCountInput.value || '0', 10) || 0, 0, 6);
  // Ensure at least 1 非卧底（留1名平民），即 u + b <= total - 1
  if (u + b >= total) {
    if (source === 'undercover') {
      u = Math.max(1, total - 1 - b);
    } else if (source === 'blank') {
      b = Math.max(0, total - 1 - u);
    } else { // total changed or direct edit
      if (u >= total) u = Math.max(1, total - 1);
      if (u + b >= total) b = Math.max(0, total - 1 - u);
    }
  }
  totalInput.value = total;
  undercoverInput.value = u;
  blankCountInput.value = b;
}

function bindStepper(id, input, delta, source) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.addEventListener('click', () => {
    const min = parseInt(input.getAttribute('min')) || 0;
    const max = parseInt(input.getAttribute('max')) || 999;
    let v = parseInt(input.value || '0', 10) || 0;
    v = clamp(v + delta, min, max);
    input.value = v;
    enforceConstraints(source);
    if (input === totalInput) generateEditors();
  });
}

// Bind steppers
bindStepper('dec-total', totalInput, -1, 'total');
bindStepper('inc-total', totalInput, +1, 'total');
bindStepper('dec-undercover', undercoverInput, -1, 'undercover');
bindStepper('inc-undercover', undercoverInput, +1, 'undercover');
bindStepper('dec-blank', blankCountInput, -1, 'blank');
bindStepper('inc-blank', blankCountInput, +1, 'blank');

// Manual edits
totalInput.addEventListener('input', () => { enforceConstraints('total'); generateEditors(); });
undercoverInput.addEventListener('input', () => enforceConstraints('undercover'));
blankCountInput.addEventListener('input', () => enforceConstraints('blank'));

function randomColor(i) {
  // Pleasant distributed hues
  const hue = Math.floor((i * 137.508) % 360);
  return `hsl(${hue}, 80%, 60%)`;
}

// 生成一个当前未被使用的随机柔和颜色
function uniqueRandomPastel(usedHexSet) {
  for (let tries = 0; tries < 40; tries++) {
    const hex = randomPastelHex();
    if (!usedHexSet || !usedHexSet.has(hex.toLowerCase())) {
      return hex;
    }
  }
  // 兜底：即使都撞色也返回一个
  return randomPastelHex();
}

// 初始化词库分类 tabs：多选、高亮状态、显示每类词条数量
function initWordTabs() {
  const tabsContainer = document.querySelector('.tabs');
  if (!tabsContainer) return;
  const tabs = Array.from(tabsContainer.querySelectorAll('.tab'));
  if (!tabs.length) return;

  activeCategories = new Set();
  tabs.forEach((tab, idx) => {
    const key = CATEGORY_KEYS[idx] || `cat${idx}`;
    tab.dataset.category = key;
    if (tab.classList.contains('active')) {
      activeCategories.add(key);
    }
    tab.addEventListener('click', () => {
      const isActive = tab.classList.contains('active');
      // 至少保留一个分类为选中状态
      if (isActive && activeCategories.size === 1) {
        return;
      }
      if (isActive) {
        tab.classList.remove('active');
        activeCategories.delete(key);
      } else {
        tab.classList.add('active');
        activeCategories.add(key);
      }
    });
  });

  // 如果初始没有任何激活的分类，则默认全选
  if (!activeCategories.size) {
    tabs.forEach((tab, idx) => {
      const key = CATEGORY_KEYS[idx] || `cat${idx}`;
      tab.classList.add('active');
      activeCategories.add(key);
    });
  }

  // 拉取各分类词条数量，并将 tab 文本改为“数量 + 词”
  fetch('/api/word_stats')
    .then((res) => res.json())
    .then((data) => {
      if (!data || !data.ok || !data.categories) return;
      const counts = data.categories;
      tabs.forEach((tab) => {
        const key = tab.dataset.category;
        const count = (counts && Object.prototype.hasOwnProperty.call(counts, key)) ? counts[key] : 0;
        tab.textContent = `${count} 词`;
      });
    })
    .catch(() => {});
}

function generateEditors() {
  const total = Math.max(3, Math.min(20, parseInt(totalInput.value || '0', 10) || 0));
  // 先读出现有玩家卡片的数据，以便在人数调整时保留已输入的名字和颜色
  const existing = Array.from(playersEditor.querySelectorAll('.player-editor')).map((div) => {
    const nameInput = div.querySelector('input[type="text"]');
    return {
      name: nameInput ? nameInput.value : '',
      color: div.dataset.color || ''
    };
  });

  playersEditor.innerHTML = '';

  // 重新渲染前 total 个玩家：
  // - 若已有数据则复用名字和颜色
  // - 若是新玩家则给默认名字和新颜色
  for (let i = 0; i < total; i++) {
    const prev = existing[i] || null;

    const div = document.createElement('div');
    div.className = 'player-editor';
    div.innerHTML = `
      <header>
        <span>玩家 #${i + 1}</span>
        <button type="button" class="tab rand-name">随机名字</button>
      </header>
      <div class="row">
        <input type="text" placeholder="输入名字" value="${prev && prev.name ? prev.name : `玩家${i + 1}`}" />
      </div>
    `;
    const nameInput = div.querySelector('input[type="text"]');
    const btnName = div.querySelector('.rand-name');
    if (btnName) btnName.addEventListener('click', () => { nameInput.value = randomPlayerName(); });

    // 颜色：优先使用旧颜色，否则为新玩家分配一个未被使用的随机色
    const usedColors = new Set(
      Array.from(playersEditor.querySelectorAll('.player-editor'))
        .map(x => (x.dataset.color || '').toLowerCase())
        .filter(Boolean)
    );
    let color = prev && prev.color ? prev.color : uniqueRandomPastel(usedColors);
    div.dataset.color = color;
    div.style.background = color;
    div.style.borderColor = '#334155';
    div.style.color = 'var(--text)';

    // 点击卡片空白区域随机更换颜色（不占用已经被其他玩家使用的颜色）
    div.addEventListener('click', (e) => {
      // 避免点击输入框或按钮时触发换色
      const target = e.target;
      if (target.closest('input') || target.closest('button')) return;
      const editors = Array.from(playersEditor.querySelectorAll('.player-editor'));
      const used = new Set(
        editors
          .filter(x => x !== div)
          .map(x => (x.dataset.color || '').toLowerCase())
          .filter(Boolean)
      );
      const nextColor = uniqueRandomPastel(used);
      div.dataset.color = nextColor;
      div.style.background = nextColor;
      // 同时更新本地保存，方便重置后还能恢复
      try { saveSetupToLocal(); } catch (_) {}
    });

    playersEditor.appendChild(div);
  }

  // 人数减少时：existing 中超出的最后几位自然被丢弃，不再渲染
}

$('#btn-generate').addEventListener('click', generateEditors);
// Auto-generate on load（优先从浏览器本地还原上次设置）
window.addEventListener('DOMContentLoaded', () => {
  try {
    const hasSaved = !!localStorage.getItem(LS_KEY_SETUP) || !!localStorage.getItem(LS_KEY_PLAYERS);
    if (hasSaved) {
      restoreSetupFromLocal();
    } else {
      generateEditors();
    }
  } catch (_) {
    generateEditors();
  }
});

async function startGame() {
  const total = clamp(parseInt(totalInput.value || '0', 10) || 0, 3, 20);
  const undercover = clamp(parseInt(undercoverInput.value || '0', 10) || 0, 1, 6);
  const blank = clamp(parseInt(blankCountInput.value || '0', 10) || 0, 0, 6);
  const useBlank = blank > 0;
  const players = $$('.player-editor').map((div, idx) => {
    const nameInput = div.querySelector('input[type="text"]');
    // 给每个玩家分配一个初始颜色（用于整张卡片背景），使用随机柔和色
    const tmp = document.createElement('div');
    tmp.style.color = randomColor(idx);
    document.body.appendChild(tmp);
    const rgb = getComputedStyle(tmp).color.match(/\d+/g).map(Number);
    document.body.removeChild(tmp);
    const hex = `#${rgb.map(x => x.toString(16).padStart(2,'0')).join('')}`;
    const pastel = pastelizeColor(hex, 0.35);
    return { name: (nameInput?.value || '').trim(), color: pastel };
  });

  // 读取当前选中的词库分类，转换为数组传给后端
  const categories = (activeCategories && activeCategories.size)
    ? Array.from(activeCategories)
    : [];

  try {
    // 启动前保存一次，方便后面重置时从浏览器历史记录中恢复
    saveSetupToLocal();
    const res = await fetch('/api/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ total_players: total, undercover_count: undercover, use_blank: useBlank, blank_count: blank, players, categories }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || '启动失败');
    applyState(data.state);
    $('#setup-section').hidden = true;
    $('#game-section').hidden = false;
    const endPanel = document.getElementById('end-panel');
    if (endPanel) endPanel.hidden = true;
    // 开启传手机逐人看词流程
    startRevealFlow();
  } catch (err) {
    toast(err.message);
  }
}

$('#btn-start').addEventListener('click', startGame);

function applyState(s) {
  state.started = s.started;
  state.players = s.players;
  state.config = s.config;
  state.status = s.status;
  state.first_speaker_id = s.first_speaker_id ?? null;
  renderBoard();
  renderStatus();
  renderEndPanel();
  // Auto-redirect to result page when game has ended
  if (state.status && state.status.ended && window.location.pathname !== '/result') {
    setTimeout(() => {
      try { window.location.href = '/result'; } catch (_) {}
    }, 200);
  }
}

function renderBoard() {
  const board = $('#players-board');
  board.innerHTML = '';
  state.players.forEach((p) => {
    const card = document.createElement('div');
    card.className = 'player-card' + (p.alive ? '' : ' eliminated');
    card.dataset.pid = p.id;
    card.innerHTML = `
      <header>
        <span class="name">${p.name}</span>
        ${state.first_speaker_id === p.id ? '<span class="badge-first">先发言</span>' : ''}
      </header>
      ${p.alive ? '' : '<div class="dead">出局</div>'}
    `;

    // Use player's (pastelized) color as whole card background and set text color for contrast
    const pastelBg = pastelizeColor(p.color || '#222222', 0.35);
    const textColor = pickTextColor(pastelBg);
    card.style.background = pastelBg;
    card.style.color = textColor;

    // 点击整张卡片弹出投票浮窗（不再支持长按看词）
    card.addEventListener('click', () => {
      if (!p.alive) return;
      try {
        openVoteOverlay(p.id);
      } catch (err) {
        console.error('[ERROR] openVoteOverlay 出错:', err);
      }
    });

    board.appendChild(card);
  });
}

function renderStatus() {
  const bar = $('#status-bar');
  if (!bar) return;
  // 不在对局中暴露任何存活人数或阵营信息
  bar.textContent = '';
}

function renderEndPanel() {
  const panel = document.getElementById('end-panel');
  if (!panel) return;
  const s = state.status;
  if (!s.ended || !s.reveal) {
    panel.hidden = true;
    return;
  }
  const title = document.getElementById('end-title');
  const cw = document.getElementById('end-civilian-word');
  const uw = document.getElementById('end-undercover-word');
  const un = document.getElementById('end-undercover-names');
  const bn = document.getElementById('end-blank-names');
  if (title) {
    title.textContent = s.winner === 'civilians' ? '平民阵营胜利' : (s.winner === 'undercover' ? '卧底阵营胜利' : '白板胜利');
  }
  if (cw) cw.textContent = s.reveal.words?.civilian || '';
  if (uw) uw.textContent = s.reveal.words?.undercover || '';
  if (un) un.textContent = (s.reveal.undercover_names || []).join('、');
  if (bn) bn.textContent = (s.reveal.blank_names || []).join('、');
  panel.hidden = false;
}

async function revealWord(pid) {
  try {
    const res = await fetch(`/api/player_word/${pid}`);
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || '获取失败');
    const roleText = data.role === 'blank' ? '白板（无词）' : '你的词';
    const word = data.word || '（无）';
    toast(`${roleText}：${word}`);
  } catch (err) {
    toast(err.message);
  }
}

// -------- Pass-the-phone reveal flow --------
const overlay = {
  el: null,
  card: null,
  name: null,
  progress: null,
  content: null,
  remember: null,
  index: 0,
  revealed: false,
  order: [],
  timer: null,
  timerEl: null,
};

function initRevealRefs() {
  overlay.el = document.getElementById('reveal-overlay');
  overlay.card = overlay.el ? overlay.el.querySelector('.reveal-card') : null;
  overlay.name = document.getElementById('reveal-name');
  overlay.progress = document.getElementById('reveal-progress');
  overlay.content = document.getElementById('reveal-content');
  overlay.remember = document.getElementById('reveal-remember');
  overlay.timerEl = document.getElementById('reveal-timer');
}

function startRevealFlow() {
  if (!overlay.el) initRevealRefs();
  if (!state.players.length) return;
  overlay.order = Array.from({ length: state.players.length }, (_, i) => i); // 0..n-1 顺序
  overlay.index = 0;
  showRevealCurrent();
}

async function fetchPlayerSecret(pid) {
  try {
    const res = await fetch(`/api/player_word/${pid}`);
    const data = await res.json();
    if (!res.ok || !data.ok) return { word: '', role: '' };
    return { word: data.word || '', role: data.role || '' };
  } catch (_) {
    return { word: '', role: '' };
  }
}

function showRevealCurrent() {
  if (overlay.index >= overlay.order.length) {
    closeReveal();
    // 完成后提示先发言者
    try {
      const pid = state.first_speaker_id;
      const p = state.players.find(x => x.id === pid);
      if (p) toast(`所有玩家已查看，请 ${p.name} 先发言`);
    } catch (_) {}
    return;
  }
  const pid = overlay.order[overlay.index];
  const p = state.players.find(x => x.id === pid);
  overlay.el.hidden = false;
  overlay.revealed = false;
  overlay.name.textContent = p ? p.name : `玩家${overlay.index + 1}`;
  overlay.progress.textContent = `${overlay.index + 1}/${overlay.order.length}`;
  const nameLabel = p ? p.name : `玩家${overlay.index + 1}`;
  overlay.content.innerHTML = `<div>请</div><div><strong style="font-size:1.4em;">${nameLabel}</strong></div><div>点击卡片显示你的词语</div>`;
  overlay.remember.disabled = false;
  if (overlay.timer) { clearInterval(overlay.timer); overlay.timer = null; }
  if (overlay.timerEl) overlay.timerEl.textContent = '';
  // Apply player's color to the floating card background with readable text color
  if (!overlay.card) overlay.card = overlay.el.querySelector('.reveal-card');
  if (overlay.card) {
    const bg = (p && p.color) ? p.color : '#222222';
    const pastelBg = pastelizeColor(bg, 0.35);
    const tc = pickTextColor(pastelBg);
    overlay.card.style.background = pastelBg;
    overlay.card.style.color = tc;
  }

  overlay.content.onclick = async () => {
    if (!overlay.revealed) {
      const { word, role } = await fetchPlayerSecret(pid);
      const text = role === 'blank' ? '你是白板（无词）' : (word || '（无）');
      overlay.content.textContent = text;
      overlay.revealed = true;
      overlay.remember.disabled = false;
      // start 2s auto hide countdown
      let left = 2;
      if (overlay.timer) { clearInterval(overlay.timer); }
      if (overlay.timerEl) overlay.timerEl.textContent = `${left}s`;
      overlay.timer = setInterval(() => {
        left -= 1;
        if (left > 0) {
          if (overlay.timerEl) overlay.timerEl.textContent = `${left}s`;
        } else {
          // auto hide
          clearInterval(overlay.timer);
          overlay.timer = null;
          if (overlay.timerEl) overlay.timerEl.textContent = '';
          overlay.content.innerHTML = `<div>请</div><div><strong style="font-size:1.4em;">${nameLabel}</strong></div><div>点击卡片显示你的词语</div>`;
          overlay.revealed = false;
          overlay.remember.disabled = false;
        }
      }, 1000);
    } else {
      // manual hide cancels timer
      if (overlay.timer) { clearInterval(overlay.timer); overlay.timer = null; }
      if (overlay.timerEl) overlay.timerEl.textContent = '';
      overlay.content.innerHTML = `<div>请</div><div><strong style="font-size:1.4em;">${nameLabel}</strong></div><div>点击卡片显示你的词语</div>`;
      overlay.revealed = false;
      overlay.remember.disabled = false;
    }
  };
  overlay.remember.onclick = () => {
    if (overlay.timer) { clearInterval(overlay.timer); overlay.timer = null; }
    if (overlay.timerEl) overlay.timerEl.textContent = '';
    overlay.index += 1;
    showRevealCurrent();
  };
}

function closeReveal() {
  if (!overlay.el) return;
  overlay.el.hidden = true;
  overlay.revealed = false;
  if (overlay.timer) { clearInterval(overlay.timer); overlay.timer = null; }
  if (overlay.timerEl) overlay.timerEl.textContent = '';
}

// -------- Vote overlay (点击玩家卡片弹出投票大浮窗) --------
let currentVotePid = null;
let voteWordTimer = null;

function openVoteOverlay(pid) {
  console.log('[DEBUG] openVoteOverlay 被调用, pid:', pid);
  const player = (state.players || []).find(x => x.id === pid);
  console.log('[DEBUG] 找到玩家:', player);
  const ov = document.getElementById('vote-overlay');
  console.log('[DEBUG] vote-overlay 元素:', ov);
  const nameEl = document.getElementById('vote-player-name');
  const wordEl = document.getElementById('vote-word');
  const timerEl = document.getElementById('vote-word-timer');
  const cardEl = ov ? ov.querySelector('.reveal-card') : null;
  console.log('[DEBUG] vote-player-name 元素:', nameEl, 'vote-word 元素:', wordEl, 'timerEl:', timerEl, 'cardEl:', cardEl);
  if (!ov || !nameEl || !player) {
    console.error('[ERROR] 缺少必要元素: ov=', ov, 'nameEl=', nameEl, 'player=', player, 'wordEl=', wordEl, 'timerEl=', timerEl);
    return;
  }
  currentVotePid = pid;
  nameEl.textContent = player.name || '';
  if (wordEl) wordEl.textContent = '';
  if (timerEl) timerEl.textContent = '';
  if (voteWordTimer) {
    clearInterval(voteWordTimer);
    voteWordTimer = null;
  }
  // 根据玩家颜色给投票卡片着色
  if (cardEl) {
    try {
      const base = player.color || '#222222';
      const bg = pastelizeColor(base, 0.35);
      const tc = pickTextColor(bg);
      cardEl.style.background = bg;
      cardEl.style.color = tc;
    } catch (e) {
      console.warn('vote card color error', e);
    }
  }
  ov.style.display = 'flex';
  ov.removeAttribute('hidden');
  console.log('[DEBUG] 投票浮窗已显示, display=', ov.style.display);
}

function closeVoteOverlay() {
  const ov = document.getElementById('vote-overlay');
  if (!ov) return;
  ov.style.display = 'none';
  ov.setAttribute('hidden', '');
  const timerEl = document.getElementById('vote-word-timer');
  const wordEl = document.getElementById('vote-word');
  if (timerEl) timerEl.textContent = '';
  if (wordEl) wordEl.textContent = '';
  if (voteWordTimer) {
    clearInterval(voteWordTimer);
    voteWordTimer = null;
  }
  currentVotePid = null;
}

document.addEventListener('DOMContentLoaded', () => {
  const btnClose = document.getElementById('vote-close');
  const btnElim = document.getElementById('vote-eliminate');
  const btnView = document.getElementById('vote-view-word');
  const ov = document.getElementById('vote-overlay');

  if (btnClose) {
    btnClose.addEventListener('click', (e) => {
      e.stopPropagation();
      closeVoteOverlay();
    });
  }

  if (ov) {
    ov.addEventListener('click', (e) => {
      if (e.target === ov) closeVoteOverlay();
    });
  }

  if (btnElim) {
    btnElim.addEventListener('click', async () => {
      const pid = currentVotePid;
      if (pid == null || !state.players || !state.players.length) return;
      try {
        const res = await fetch('/api/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target_id: pid }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || '投票失败');
        applyState(data.state);
        closeVoteOverlay();
        if (data.winner) {
          if (window.location.pathname !== '/result') {
            window.location.href = '/result';
          }
        }
      } catch (err) {
        toast(err.message);
      }
    });
  }

  if (btnView) {
    btnView.addEventListener('click', async () => {
      const pid = currentVotePid;
      if (pid == null) return;
      const wordEl = document.getElementById('vote-word');
      const timerEl = document.getElementById('vote-word-timer');
      if (!wordEl || !timerEl) return;
      try {
        const { word, role } = await fetchPlayerSecret(pid);
        const text = role === 'blank' ? '你是白板（无词）' : (word || '（无）');
        wordEl.textContent = text;
        // 先清理旧的倒计时
        if (voteWordTimer) {
          clearInterval(voteWordTimer);
          voteWordTimer = null;
        }
        let left = 2;
        timerEl.textContent = `${left}s`;
        voteWordTimer = setInterval(() => {
          left -= 1;
          if (left > 0) {
            timerEl.textContent = `${left}s`;
          } else {
            clearInterval(voteWordTimer);
            voteWordTimer = null;
            timerEl.textContent = '';
            wordEl.textContent = '';
          }
        }, 1000);
      } catch (err) {
        toast(err.message || '获取词失败');
      }
    });
  }
});


// 初始化词库分类 tabs
document.addEventListener('DOMContentLoaded', () => {
  try { initWordTabs(); } catch (_) {}
});


// 再来一局：复用玩家与配置，仅重新发牌与词
document.addEventListener('DOMContentLoaded', () => {
  const btnRedeal = document.getElementById('btn-redeal');
  if (btnRedeal) {
    btnRedeal.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/redeal', { method: 'POST' });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || '再来一局失败');
        applyState(data.state);
        const endPanel = document.getElementById('end-panel');
        if (endPanel) endPanel.hidden = true;
        toast('已重新发牌，开始传手机逐人看词');
        startRevealFlow();
      } catch (err) {
        toast(err.message);
      }
    });
  }
});

// 新的“重置游戏”按钮（位于对局区块下方，较小全宽）
document.addEventListener('DOMContentLoaded', () => {
  const btnResetGame = document.getElementById('btn-reset-game');
  if (btnResetGame) {
    btnResetGame.addEventListener('click', async () => {
      const sure = confirm('确认重置当前对局？');
      if (!sure) return;
      try {
        const res = await fetch('/api/reset', { method: 'POST' });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error('重置失败');
        applyState(data.state);
        // 返回设置界面
        try {
          document.getElementById('setup-section').hidden = false;
          document.getElementById('game-section').hidden = true;
        } catch (_) {}
        closeReveal();
        const endPanel = document.getElementById('end-panel');
        if (endPanel) endPanel.hidden = true;
        // 回到设置页后，自动再从本地恢复一次，确保玩家看到之前输入的姓名与颜色
        try {
          restoreSetupFromLocal();
        } catch (_) {}
      } catch (err) {
        toast(err.message);
      }
    });
  }
});

// Auto reveal flow when landing with ?reveal=1 (used by result page Redeal)
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('reveal') === '1') {
      const res = await fetch('/api/state');
      const data = await res.json();
      if (!res.ok || !data.ok) return;
      applyState(data.state);
      // Switch sections based on started
      try {
        document.getElementById('setup-section').hidden = state.started;
        document.getElementById('game-section').hidden = !state.started;
      } catch (_) {}
      // Start pass-the-phone flow
      startRevealFlow();
      // Clean URL
      try { window.history.replaceState({}, '', window.location.pathname); } catch (_) {}
    }
  } catch (_) {}
});
