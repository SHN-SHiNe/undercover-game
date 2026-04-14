import { pickWordPair } from './wordStore'

// --- Game state (in-memory singleton) ---
let state = {
  started: false,
  totalPlayers: 0,
  undercoverCount: 0,
  blankCount: 0,
  selectedCategories: [],
  players: [],       // [{id, name, color, alive}]
  roles: {},         // {id: 'civilian'|'undercover'|'blank'}
  words: {},         // {civilian: '...', undercover: '...'}
  eliminatedOrder: [],
  firstSpeakerId: null,
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function assignRoles(total, undercoverCount, blankCount) {
  const ids = shuffle([...Array(total).keys()])
  const undercovers = new Set(ids.slice(0, undercoverCount))
  const blanks = new Set(ids.slice(undercoverCount, undercoverCount + blankCount))
  const roles = {}
  for (let i = 0; i < total; i++) {
    if (undercovers.has(i)) roles[i] = 'undercover'
    else if (blanks.has(i)) roles[i] = 'blank'
    else roles[i] = 'civilian'
  }
  return roles
}

function evaluateWinner() {
  if (!state.started) return null
  const aliveIds = new Set(state.players.filter(p => p.alive).map(p => p.id))
  let u = 0, b = 0, c = 0
  for (const [id, role] of Object.entries(state.roles)) {
    if (!aliveIds.has(Number(id))) continue
    if (role === 'undercover') u++
    else if (role === 'blank') b++
    else c++
  }
  const total = aliveIds.size
  if (total === 2 && b === 1) return 'blank'
  if (u > 0 && (c + b) === 1) return 'undercover'
  if (u === 0 && b === 0) return 'civilians'
  return null
}

function buildPublicState() {
  const winner = evaluateWinner()
  let reveal = null
  if (winner !== null) {
    const undercover_ids = []
    const blank_ids = []
    for (const [id, role] of Object.entries(state.roles)) {
      if (role === 'undercover') undercover_ids.push(Number(id))
      if (role === 'blank') blank_ids.push(Number(id))
    }
    reveal = {
      words: state.words,
      undercover_ids,
      blank_ids,
      undercover_names: undercover_ids.map(i => state.players[i].name),
      blank_names: blank_ids.map(i => state.players[i].name),
    }
  }
  return {
    started: state.started,
    config: {
      total_players: state.totalPlayers,
      undercover_count: state.undercoverCount,
      blank_count: state.blankCount,
    },
    players: state.players.map(p => ({ id: p.id, name: p.name, color: p.color, alive: p.alive })),
    first_speaker_id: state.firstSpeakerId,
    status: {
      ended: winner !== null,
      winner,
      alive_counts: {
        undercover: Object.entries(state.roles).filter(([i, r]) => r === 'undercover' && state.players[Number(i)]?.alive).length,
        civilian: Object.entries(state.roles).filter(([i, r]) => r === 'civilian' && state.players[Number(i)]?.alive).length,
        blank: Object.entries(state.roles).filter(([i, r]) => r === 'blank' && state.players[Number(i)]?.alive).length,
      },
      reveal,
    },
  }
}

// --- Public API (sync, returns same shape as backend) ---

export function startGame({ total_players, undercover_count, blank_count, players, categories }) {
  const total = total_players
  const pair = pickWordPair(categories)
  state.started = true
  state.totalPlayers = total
  state.undercoverCount = undercover_count
  state.blankCount = blank_count
  state.selectedCategories = categories || []
  state.players = players.map((p, i) => ({ id: i, name: p.name.trim(), color: p.color.trim(), alive: true }))
  state.roles = assignRoles(total, undercover_count, blank_count)
  state.words = { civilian: pair.civilian, undercover: pair.undercover }
  state.eliminatedOrder = []
  state.firstSpeakerId = total > 0 ? Math.floor(Math.random() * total) : null
  return { ok: true, state: buildPublicState() }
}

export function getState() {
  return { ok: true, state: buildPublicState() }
}

export function getPlayerWord(pid) {
  const role = state.roles[pid]
  let word = ''
  if (role === 'civilian') word = state.words.civilian || ''
  else if (role === 'undercover') word = state.words.undercover || ''
  return { word, role: role || '' }
}

export function vote(targetId) {
  if (!state.started || targetId < 0 || targetId >= state.players.length) {
    throw new Error('无效的投票对象或游戏未开始')
  }
  const player = state.players[targetId]
  if (!player.alive) throw new Error('该玩家已出局')
  player.alive = false
  state.eliminatedOrder.push(targetId)
  const winner = evaluateWinner()
  return { ok: true, state: buildPublicState(), just_eliminated: targetId, winner }
}

export function resetGame() {
  state.started = false
  state.totalPlayers = 0
  state.undercoverCount = 0
  state.blankCount = 0
  state.players = []
  state.roles = {}
  state.words = {}
  state.selectedCategories = []
  state.eliminatedOrder = []
  state.firstSpeakerId = null
  return { ok: true, state: buildPublicState() }
}

export function redeal() {
  if (!state.players.length || state.totalPlayers <= 0) {
    throw new Error('当前没有可复用的玩家配置，请先开始一局')
  }
  for (const p of state.players) p.alive = true
  state.roles = assignRoles(state.totalPlayers, state.undercoverCount, state.blankCount)
  const pair = pickWordPair(state.selectedCategories)
  state.words = { civilian: pair.civilian, undercover: pair.undercover }
  state.eliminatedOrder = []
  state.started = true
  state.firstSpeakerId = state.totalPlayers > 0 ? Math.floor(Math.random() * state.totalPlayers) : null
  return { ok: true, state: buildPublicState() }
}
