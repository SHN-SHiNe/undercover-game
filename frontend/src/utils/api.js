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
