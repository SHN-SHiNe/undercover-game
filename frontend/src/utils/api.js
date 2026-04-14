export async function apiStartGame({ total_players, undercover_count, blank_count, players, categories }) {
  const useBlank = blank_count > 0
  const res = await fetch('/api/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      total_players,
      undercover_count,
      use_blank: useBlank,
      blank_count,
      players,
      categories,
    }),
  })
  const data = await res.json()
  if (!res.ok || !data.ok) throw new Error(data.error || '启动失败')
  return data
}

export async function apiGetState() {
  const res = await fetch('/api/state')
  const data = await res.json()
  if (!res.ok || !data.ok) throw new Error(data.error || '获取状态失败')
  return data
}

export async function apiGetWordStats() {
  const res = await fetch('/api/word_stats')
  const data = await res.json()
  if (!res.ok || !data.ok) return {}
  return data.categories || {}
}

export async function apiGetPlayerWord(pid) {
  const res = await fetch(`/api/player_word/${pid}`)
  const data = await res.json()
  if (!res.ok || !data.ok) return { word: '', role: '' }
  return { word: data.word || '', role: data.role || '' }
}

export async function apiVote(targetId) {
  const res = await fetch('/api/vote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target_id: targetId }),
  })
  const data = await res.json()
  if (!res.ok || !data.ok) throw new Error(data.error || '投票失败')
  return data
}

export async function apiReset() {
  const res = await fetch('/api/reset', { method: 'POST' })
  const data = await res.json()
  if (!res.ok || !data.ok) throw new Error(data.error || '重置失败')
  return data
}

export async function apiRedeal() {
  const res = await fetch('/api/redeal', { method: 'POST' })
  const data = await res.json()
  if (!res.ok || !data.ok) throw new Error(data.error || '再来一局失败')
  return data
}

export async function apiGetCategories() {
  const res = await fetch('/api/categories')
  const data = await res.json()
  if (!res.ok || !data.ok) return []
  return data.categories || []
}

export async function apiRenameCategory(category, name) {
  const res = await fetch(`/api/categories/${category}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  const data = await res.json()
  if (!res.ok || !data.ok) throw new Error(data.error || '重命名失败')
  return data
}

export async function apiAddCategory(key, name) {
  const res = await fetch('/api/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, name }),
  })
  const data = await res.json()
  if (!res.ok || !data.ok) throw new Error(data.error || '创建失败')
  return data
}

export async function apiDeleteCategory(category) {
  const res = await fetch(`/api/categories/${category}`, { method: 'DELETE' })
  const data = await res.json()
  if (!res.ok || !data.ok) throw new Error(data.error || '删除失败')
  return data
}

export async function apiGetWords(category) {
  const res = await fetch(`/api/words/${category}`)
  const data = await res.json()
  if (!res.ok || !data.ok) return []
  return data.pairs || []
}

export async function apiAddWord(category, word1, word2) {
  const res = await fetch(`/api/words/${category}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word1, word2 }),
  })
  const data = await res.json()
  if (!res.ok || !data.ok) throw new Error(data.error || '添加失败')
  return data
}

export async function apiEditWord(category, index, word1, word2) {
  const res = await fetch(`/api/words/${category}/${index}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word1, word2 }),
  })
  const data = await res.json()
  if (!res.ok || !data.ok) throw new Error(data.error || '修改失败')
  return data
}

export async function apiDeleteWord(category, index) {
  const res = await fetch(`/api/words/${category}/${index}`, { method: 'DELETE' })
  const data = await res.json()
  if (!res.ok || !data.ok) throw new Error(data.error || '删除失败')
  return data
}

export async function apiBatchImport(category, text) {
  const res = await fetch(`/api/words/${category}/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  const data = await res.json()
  if (!res.ok || !data.ok) throw new Error(data.error || '导入失败')
  return data
}
