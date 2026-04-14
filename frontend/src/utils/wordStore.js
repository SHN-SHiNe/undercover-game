import { DEFAULT_WORDS, DEFAULT_CAT_NAMES } from '../data/defaultWords'

const LS_WORDS = 'uc_words'
const LS_CAT_NAMES = 'uc_cat_names'
const SYNC_URL = 'https://shnshine-undercover-game.hf.space/api/sync'

function loadWords() {
  try {
    const raw = localStorage.getItem(LS_WORDS)
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

function saveWords(data) {
  localStorage.setItem(LS_WORDS, JSON.stringify(data))
  pushToRemote()
}

function loadCatNames() {
  try {
    const raw = localStorage.getItem(LS_CAT_NAMES)
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

function saveCatNames(data) {
  localStorage.setItem(LS_CAT_NAMES, JSON.stringify(data))
  pushToRemote()
}

function getWords() {
  return loadWords() || structuredClone(DEFAULT_WORDS)
}

function getCatNames() {
  return loadCatNames() || { ...DEFAULT_CAT_NAMES }
}

// --- Remote sync ---

let syncPromise = null

export function pullFromRemote() {
  if (syncPromise) return syncPromise
  syncPromise = fetch(SYNC_URL, { signal: AbortSignal.timeout(5000) })
    .then(r => r.json())
    .then(data => {
      if (data.ok) {
        const remoteWords = data.words
        const remoteCats = data.cat_names
        if (remoteWords && Object.keys(remoteWords).length > 0) {
          // Merge: remote is base, add any local-only categories on top
          const localWords = loadWords()
          const localCats = loadCatNames()
          const merged = { ...remoteWords }
          const mergedCats = { ...remoteCats }
          if (localWords) {
            for (const [key, pairs] of Object.entries(localWords)) {
              if (!merged[key]) {
                // Local-only category, keep it
                merged[key] = pairs
                if (localCats && localCats[key]) mergedCats[key] = localCats[key]
              }
            }
          }
          localStorage.setItem(LS_WORDS, JSON.stringify(merged))
          localStorage.setItem(LS_CAT_NAMES, JSON.stringify(mergedCats))
        }
      }
    })
    .catch(() => {})
    .finally(() => { syncPromise = null })
  return syncPromise
}

export function pushToRemote() {
  const words = loadWords()
  const cats = loadCatNames()
  if (!words) return Promise.reject(new Error('本地无词库'))
  return fetch(SYNC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ words, cat_names: cats || {} }),
    signal: AbortSignal.timeout(5000),
  }).then(r => r.json())
}

// Trigger initial sync on import
pullFromRemote()

// --- Category management ---

export function getCategories() {
  const words = getWords()
  const names = getCatNames()
  return Object.keys(words).map(key => ({
    key,
    name: names[key] || key,
    count: words[key]?.length || 0,
  }))
}

export function renameCategory(key, name) {
  const names = getCatNames()
  names[key] = name
  saveCatNames(names)
}

export function addCategory(key, name) {
  const words = getWords()
  if (words[key]) throw new Error('该分类已存在')
  words[key] = []
  saveWords(words)
  const names = getCatNames()
  names[key] = name
  saveCatNames(names)
}

export function deleteCategory(key) {
  const words = getWords()
  delete words[key]
  saveWords(words)
  const names = getCatNames()
  delete names[key]
  saveCatNames(names)
}

// --- Word pair CRUD ---

export function getWordPairs(category) {
  const words = getWords()
  return words[category] || []
}

function isDuplicate(words, w1, w2) {
  for (const pairs of Object.values(words)) {
    for (const p of pairs) {
      if ((p.civilian === w1 && p.undercover === w2) ||
          (p.civilian === w2 && p.undercover === w1)) return true
    }
  }
  return false
}

export function addWordPair(category, word1, word2) {
  const words = getWords()
  if (!words[category]) words[category] = []
  if (isDuplicate(words, word1, word2)) throw new Error('该词对已存在于词库中')
  words[category].push({ civilian: word1, undercover: word2 })
  saveWords(words)
}

export function editWordPair(category, index, word1, word2) {
  const words = getWords()
  const pairs = words[category]
  if (!pairs || index < 0 || index >= pairs.length) throw new Error('索引无效')
  pairs[index] = { civilian: word1, undercover: word2 }
  saveWords(words)
}

export function deleteWordPair(category, index) {
  const words = getWords()
  const pairs = words[category]
  if (!pairs || index < 0 || index >= pairs.length) throw new Error('索引无效')
  pairs.splice(index, 1)
  saveWords(words)
}

export function batchImport(category, text) {
  const words = getWords()
  if (!words[category]) words[category] = []
  let added = 0, duplicated = 0
  const errors = []
  const entries = text.replace(/\n/g, ';').split(/[;；]/).map(e => e.trim()).filter(Boolean)
  for (let i = 0; i < entries.length; i++) {
    const parts = entries[i].split(/[,，]/).map(p => p.trim())
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      errors.push(`第${i + 1}条格式错误: "${entries[i]}"`)
      continue
    }
    const [w1, w2] = parts
    if (isDuplicate(words, w1, w2)) { duplicated++; continue }
    words[category].push({ civilian: w1, undercover: w2 })
    added++
  }
  saveWords(words)
  return { added, duplicated, errors }
}

// --- Game: pick word pair ---

export function pickWordPair(selectedCategories) {
  const words = getWords()
  const nonEmpty = Object.fromEntries(Object.entries(words).filter(([, v]) => v && v.length > 0))
  if (Object.keys(nonEmpty).length === 0) throw new Error('没有可用的词对')

  let cats = selectedCategories?.filter(c => nonEmpty[c])
  if (!cats || cats.length === 0) cats = Object.keys(nonEmpty)

  const pool = []
  for (const c of cats) pool.push(...nonEmpty[c])
  if (pool.length === 0) pool.push(...Object.values(nonEmpty)[0])

  const pair = pool[Math.floor(Math.random() * pool.length)]
  // Randomly swap
  if (Math.random() < 0.5) return { civilian: pair.undercover, undercover: pair.civilian }
  return { ...pair }
}
