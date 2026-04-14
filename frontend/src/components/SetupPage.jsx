import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  clamp, randomPlayerName, uniqueRandomPastel, getPlayerColor,
  randomizePlayerColor,
  LS_KEY_SETUP, LS_KEY_PLAYERS, pastelizeColor, randomColor,
} from '../utils/helpers'
import { apiStartGame, apiGetCategories } from '../utils/api'

const MinusIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11.875 5C13.2557 5 14.375 6.11929 14.375 7.5C14.375 8.88071 13.2557 10 11.875 10H3.125C1.74429 10 0.625 8.88071 0.625 7.5C0.625 6.11929 1.74429 5 3.125 5H11.875Z" fill="white"/>
  </svg>
)

const PlusIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g clipPath="url(#clip0_plus)">
      <path d="M7.5 0.625C8.88071 0.625 10 1.74429 10 3.125V5H11.875C13.2557 5 14.375 6.11929 14.375 7.5C14.375 8.88071 13.2557 10 11.875 10H10V11.875C10 13.2557 8.88071 14.375 7.5 14.375C6.11929 14.375 5 13.2557 5 11.875V10H3.125C1.74429 10 0.625 8.88071 0.625 7.5C0.625 6.11929 1.74429 5 3.125 5H5V3.125C5 1.74429 6.11929 0.625 7.5 0.625Z" fill="white"/>
    </g>
    <defs>
      <clipPath id="clip0_plus">
        <rect width="15" height="15" fill="white"/>
      </clipPath>
    </defs>
  </svg>
)

function Stepper({ value, onDec, onInc }) {
  return (
    <div className="stepper-row">
      <button type="button" className="stepper-btn" onClick={onDec}>
        <MinusIcon />
      </button>
      <div className="stepper-value">{value}</div>
      <button type="button" className="stepper-btn" onClick={onInc}>
        <PlusIcon />
      </button>
    </div>
  )
}

export default function SetupPage({ toast, applyState, onGameStarted }) {
  const navigate = useNavigate()
  const [totalPlayers, setTotalPlayers] = useState(6)
  const [undercoverCount, setUndercoverCount] = useState(1)
  const [blankCount, setBlankCount] = useState(0)
  const [activeCategories, setActiveCategories] = useState(new Set(['general']))
  const [categoryList, setCategoryList] = useState([])
  const [players, setPlayers] = useState([])
  const initialized = useRef(false)

  // Initialize players when totalPlayers changes
  const generatePlayers = useCallback((count, existingPlayers = []) => {
    const newPlayers = []
    for (let i = 0; i < count; i++) {
      if (i < existingPlayers.length) {
        newPlayers.push({ ...existingPlayers[i] })
      } else {
        newPlayers.push({
          name: randomPlayerName(),
          color: getPlayerColor(i),
        })
      }
    }
    return newPlayers
  }, [])

  // Restore from localStorage on mount
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    let restoredTotal = 6
    let restoredUndercover = 1
    let restoredBlank = 0
    let restoredPlayers = null

    try {
      const rawSetup = localStorage.getItem(LS_KEY_SETUP)
      if (rawSetup) {
        const setup = JSON.parse(rawSetup)
        if (setup && typeof setup === 'object') {
          if (typeof setup.total === 'number') restoredTotal = clamp(setup.total, 3, 20)
          if (typeof setup.undercover === 'number') restoredUndercover = clamp(setup.undercover, 1, 6)
          if (typeof setup.blank === 'number') restoredBlank = clamp(setup.blank, 0, 6)
        }
      }
    } catch (_) {}

    try {
      const rawPlayers = localStorage.getItem(LS_KEY_PLAYERS)
      if (rawPlayers) {
        const parsed = JSON.parse(rawPlayers)
        if (Array.isArray(parsed)) {
          restoredPlayers = parsed.map((p, i) => ({
            name: (p && typeof p.name === 'string') ? p.name : `玩家${i + 1}`,
            color: (p && typeof p.color === 'string' && p.color) ? p.color : getPlayerColor(i),
          }))
        }
      }
    } catch (_) {}

    setTotalPlayers(restoredTotal)
    setUndercoverCount(restoredUndercover)
    setBlankCount(restoredBlank)

    if (restoredPlayers && restoredPlayers.length > 0) {
      const ps = generatePlayers(restoredTotal, restoredPlayers)
      setPlayers(ps)
    } else {
      setPlayers(generatePlayers(restoredTotal))
    }
  }, [generatePlayers])

  // Fetch categories
  useEffect(() => {
    apiGetCategories().then(setCategoryList).catch(() => {})
  }, [])

  // Enforce constraints
  const enforceConstraints = useCallback((total, u, b, source) => {
    total = clamp(total, 3, 20)
    u = clamp(u, 1, 6)
    b = clamp(b, 0, 6)
    if (u + b >= total) {
      if (source === 'undercover') {
        u = Math.max(1, total - 1 - b)
      } else if (source === 'blank') {
        b = Math.max(0, total - 1 - u)
      } else {
        if (u >= total) u = Math.max(1, total - 1)
        if (u + b >= total) b = Math.max(0, total - 1 - u)
      }
    }
    return { total, u, b }
  }, [])

  const handleTotalChange = useCallback((delta) => {
    const newTotal = clamp(totalPlayers + delta, 3, 20)
    const { u, b } = enforceConstraints(newTotal, undercoverCount, blankCount, 'total')
    setTotalPlayers(newTotal)
    setUndercoverCount(u)
    setBlankCount(b)
    setPlayers(prev => generatePlayers(newTotal, prev))
  }, [totalPlayers, undercoverCount, blankCount, enforceConstraints, generatePlayers])

  const handleUndercoverChange = useCallback((delta) => {
    const newU = clamp(undercoverCount + delta, 1, 6)
    const { u, b } = enforceConstraints(totalPlayers, newU, blankCount, 'undercover')
    setUndercoverCount(u)
    setBlankCount(b)
  }, [totalPlayers, undercoverCount, blankCount, enforceConstraints])

  const handleBlankChange = useCallback((delta) => {
    const newB = clamp(blankCount + delta, 0, 6)
    const { u, b } = enforceConstraints(totalPlayers, undercoverCount, newB, 'blank')
    setUndercoverCount(u)
    setBlankCount(b)
  }, [totalPlayers, undercoverCount, blankCount, enforceConstraints])

  const toggleCategory = useCallback((key) => {
    setActiveCategories(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        if (next.size === 1) return prev // at least one
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])

  const handlePlayerNameChange = useCallback((index, name) => {
    setPlayers(prev => {
      const copy = [...prev]
      copy[index] = { ...copy[index], name }
      return copy
    })
  }, [])

  const handlePlayerColorClick = useCallback((index) => {
    setPlayers(prev => {
      const copy = [...prev]
      copy[index] = { ...copy[index], color: randomizePlayerColor() }
      return copy
    })
  }, [])

  const randomizeAllColors = useCallback(() => {
    setPlayers(prev => prev.map((p, i) => ({
      ...p,
      color: getPlayerColor(Math.floor(Math.random() * 20)),
    })))
  }, [])

  const randomizeAllNames = useCallback(() => {
    setPlayers(prev => prev.map(p => ({
      ...p,
      name: randomPlayerName(),
    })))
  }, [])

  // Save to localStorage
  const saveToLocal = useCallback(() => {
    try {
      localStorage.setItem(LS_KEY_SETUP, JSON.stringify({
        total: totalPlayers,
        undercover: undercoverCount,
        blank: blankCount,
      }))
      localStorage.setItem(LS_KEY_PLAYERS, JSON.stringify(
        players.map(p => ({ name: p.name, color: p.color }))
      ))
    } catch (_) {}
  }, [totalPlayers, undercoverCount, blankCount, players])

  const handleStartGame = useCallback(async () => {
    saveToLocal()

    const playersPayload = players.map((p, idx) => {
      const color = p.color || getPlayerColor(idx)
      return { name: (p.name || '').trim() || `玩家${idx + 1}`, color }
    })

    const categories = activeCategories.size ? Array.from(activeCategories) : []

    try {
      const data = await apiStartGame({
        total_players: totalPlayers,
        undercover_count: undercoverCount,
        blank_count: blankCount,
        players: playersPayload,
        categories,
      })
      applyState(data.state)
      onGameStarted()
    } catch (err) {
      toast(err.message)
    }
  }, [totalPlayers, undercoverCount, blankCount, players, activeCategories, saveToLocal, applyState, onGameStarted, toast])

  return (
    <div className="app-wrapper">
      {/* Header */}
      <div className="app-header">
        <span className="title">谁是卧底</span>
        <span className="subtitle">发牌助手</span>
      </div>

      {/* Content */}
      <div className="setup-content" style={{ paddingBottom: 30 }}>
        <div className="section-title">游戏设置</div>

        {/* Player Count */}
        <div className="setting-card">
          <div className="card-label">玩家人数</div>
          <div className="card-desc">选择参与游玩的小伙伴人数</div>
          <Stepper
            value={totalPlayers}
            onDec={() => handleTotalChange(-1)}
            onInc={() => handleTotalChange(1)}
          />
        </div>

        {/* Undercover & Blank counts side by side */}
        <div className="card-group">
          <div className="setting-card">
            <div className="card-label">卧底数</div>
            <div className="card-desc">最少要1个卧底哦</div>
            <Stepper
              value={undercoverCount}
              onDec={() => handleUndercoverChange(-1)}
              onInc={() => handleUndercoverChange(1)}
            />
          </div>
          <div className="setting-card">
            <div className="card-label">白板数</div>
            <div className="card-desc">选择0代表没有白板</div>
            <Stepper
              value={blankCount}
              onDec={() => handleBlankChange(-1)}
              onInc={() => handleBlankChange(1)}
            />
          </div>
        </div>

        {/* Word Categories */}
        <div className="setting-card">
          <div className="card-label">词组</div>
          <div className="card-desc">选择想要游玩的词组</div>
          <div className="category-grid">
            {categoryList.map((cat) => (
              <button
                key={cat.key}
                className={`category-tab ${activeCategories.has(cat.key) ? 'active' : ''}`}
                onClick={() => toggleCategory(cat.key)}
              >
                <span className="cat-name">{cat.name}</span>
                <span className="cat-count">{cat.count}词</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => navigate('/words')}
            style={{
              marginTop: 12, width: '100%', padding: '12px 16px', borderRadius: 10,
              border: '1px dashed rgba(255,255,255,0.25)', background: 'transparent',
              color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            管理词库
          </button>
        </div>

        {/* Player Info */}
        <div className="setting-card">
          <div className="card-label">玩家信息</div>
          <div className="card-desc">录入大家的名字方便记录哦，点击卡片可以更换颜色</div>

          <div className="player-actions-row">
            <button className="player-action-btn" onClick={randomizeAllColors}>
              颜色全部随机
            </button>
            <button className="player-action-btn" onClick={randomizeAllNames}>
              姓名全部随机
            </button>
          </div>

          <div className="players-list">
            {players.map((p, idx) => (
              <div
                key={idx}
                className="player-card-editor"
                style={{ background: p.color }}
                onClick={(e) => {
                  if (e.target.tagName === 'INPUT') return
                  handlePlayerColorClick(idx)
                }}
              >
                <div className="name-area">
                  <input
                    className="name-input"
                    type="text"
                    value={p.name}
                    placeholder={`玩家${idx + 1}`}
                    onChange={(e) => handlePlayerNameChange(idx, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="number-area">
                  <span className="player-number">#{idx + 1}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ready hint */}
        <div className="ready-card">
          <div style={{ paddingLeft: 20, paddingRight: 20 }}>
            <div className="ready-title">一切就绪！</div>
            <div className="ready-hint">
              提示：开始后，长按某位玩家卡片的名字即可查看该玩家的词；点击卡片进行投票，会弹出确认框。
            </div>
          </div>
        </div>
      </div>

      {/* Start Game Button */}
      <div className="start-btn-container" onClick={handleStartGame}>
        <span className="start-btn-text">开始游戏</span>
      </div>
    </div>
  )
}
