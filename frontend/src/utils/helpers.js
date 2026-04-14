export const CN_NAMES = [
  '小明','小红','小刚','小丽','小强','小芳','小杰','小雪',
  '阿华','阿美','晨曦','子涵','浩然','思琪','宇航','明悦',
  '若晴','一帆','嘉怡','梓晨','悦宁','锦程','可欣','语桐'
]

export function randomPlayerName() {
  return CN_NAMES[Math.floor(Math.random() * CN_NAMES.length)]
}

export function hexToRgb(hex) {
  if (!hex) return { r: 0, g: 0, b: 0 }
  let h = hex.trim()
  if (h.startsWith('#')) h = h.slice(1)
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  const r = parseInt(h.slice(0, 2), 16) || 0
  const g = parseInt(h.slice(2, 4), 16) || 0
  const b = parseInt(h.slice(4, 6), 16) || 0
  return { r, g, b }
}

export function rgbToHex(r, g, b) {
  const to = (x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}

export function pastelizeColor(hex, weight = 0.35) {
  try {
    const { r, g, b } = hexToRgb(hex || '#888888')
    const nr = r * (1 - weight) + 255 * weight
    const ng = g * (1 - weight) + 255 * weight
    const nb = b * (1 - weight) + 255 * weight
    return rgbToHex(nr, ng, nb)
  } catch (e) {
    return '#dddddd'
  }
}

export function randomPastelHex() {
  const h = Math.floor(Math.random() * 360)
  const s = 70 + Math.random() * 20
  const l = 55 + Math.random() * 15
  return hslToHex(h, s, l)
}

function hslToHex(h, s, l) {
  s /= 100
  l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

export function uniqueRandomPastel(usedSet) {
  for (let tries = 0; tries < 40; tries++) {
    const hex = randomPastelHex()
    if (!usedSet || !usedSet.has(hex.toLowerCase())) {
      return hex
    }
  }
  return randomPastelHex()
}

export function pickTextColor(bg) {
  try {
    let hex = (bg || '').trim()
    if (hex.startsWith('rgb')) {
      const nums = hex.match(/\d+/g).map(Number)
      const [r, g, b] = nums
      const yiq = (r * 299 + g * 587 + b * 114) / 1000
      return yiq >= 140 ? '#111111' : '#ffffff'
    }
    if (hex.startsWith('#')) {
      if (hex.length === 4) {
        hex = '#' + [...hex.slice(1)].map(ch => ch + ch).join('')
      }
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      const yiq = (r * 299 + g * 587 + b * 114) / 1000
      return yiq >= 140 ? '#111111' : '#ffffff'
    }
  } catch (e) {}
  return '#ffffff'
}

export function randomColor(i) {
  const hue = Math.floor((i * 137.508) % 360)
  return hslToHex(hue, 80, 60)
}

export const clamp = (v, min, max) => Math.max(min, Math.min(max, v))

export const CATEGORY_KEYS = ['general', 'animals', 'food', 'jobs', 'objects', 'places']
export const CATEGORY_NAMES = ['通用', '动物', '美食饮品', '职业', '物品', '地点']

export const PLAYER_COLORS = [
  'rgba(233, 87, 98, 0.80)',
  'rgba(123, 56, 195, 0.80)',
  'rgba(87, 143, 207, 0.80)',
  'rgba(207, 151, 87, 0.80)',
  'rgba(207, 87, 177, 0.80)',
  'rgba(65, 159, 86, 0.80)',
  'rgba(207, 87, 87, 0.80)',
  'rgba(87, 207, 177, 0.80)',
  'rgba(159, 143, 65, 0.80)',
  'rgba(87, 87, 207, 0.80)',
  'rgba(207, 143, 87, 0.80)',
  'rgba(87, 207, 87, 0.80)',
  'rgba(175, 87, 207, 0.80)',
  'rgba(87, 175, 207, 0.80)',
  'rgba(207, 87, 143, 0.80)',
  'rgba(143, 207, 87, 0.80)',
  'rgba(87, 207, 143, 0.80)',
  'rgba(207, 175, 87, 0.80)',
  'rgba(143, 87, 207, 0.80)',
  'rgba(87, 143, 143, 0.80)',
]

export function getPlayerColor(index) {
  return PLAYER_COLORS[index % PLAYER_COLORS.length]
}

export function randomizePlayerColor() {
  return PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)]
}

export const LS_KEY_SETUP = 'undercover-setup'
export const LS_KEY_PLAYERS = 'undercover-players'
