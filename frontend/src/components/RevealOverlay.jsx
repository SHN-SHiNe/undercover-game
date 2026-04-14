import React, { useState, useCallback, useRef, useEffect } from 'react'
import { apiGetPlayerWord } from '../utils/api'

export default function RevealOverlay({ players, onDone }) {
  const [index, setIndex] = useState(0)
  const [rotation, setRotation] = useState(0) // cumulative degrees
  const [wordText, setWordText] = useState('')
  const [swipeX, setSwipeX] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const touchStartRef = useRef(null)
  const timerRef = useRef(null)
  const [countdown, setCountdown] = useState(0)
  const fetchedRef = useRef(false)
  const lastDirRef = useRef(1)
  const [blurKey, setBlurKey] = useState(0) // increment to re-trigger animation
  const [noTransition, setNoTransition] = useState(false)

  const currentPlayer = players[index] || null
  // Card is showing back when rotation is an odd multiple of 180
  const isBack = Math.round(rotation / 180) % 2 !== 0

  const triggerBlur = useCallback(() => {
    setBlurKey(prev => prev + 1)
  }, [])

  const clearAutoFlip = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setCountdown(0)
  }, [])

  useEffect(() => () => clearAutoFlip(), [clearAutoFlip])

  // Pre-fetch word when player changes
  useEffect(() => {
    fetchedRef.current = false
    setWordText('')
    setRotation(0)
    setCountdown(0)
    clearAutoFlip()
    if (!currentPlayer) return
    apiGetPlayerWord(currentPlayer.id).then(({ word, role }) => {
      setWordText(role === 'blank' ? '你是白板（无词）' : (word || '（无）'))
      fetchedRef.current = true
    }).catch(() => {
      setWordText('获取失败')
      fetchedRef.current = true
    })
  }, [currentPlayer, clearAutoFlip])

  const startAutoFlipBack = useCallback((dir) => {
    clearAutoFlip()
    let left = 2
    setCountdown(left)
    timerRef.current = setInterval(() => {
      left -= 1
      if (left > 0) {
        setCountdown(left)
      } else {
        clearInterval(timerRef.current)
        timerRef.current = null
        setCountdown(0)
        // Flip back to front by adding 180 in last swipe direction
        setRotation(prev => prev + 180 * dir)
      }
    }, 1000)
  }, [clearAutoFlip])

  const doSwipe = useCallback((dir) => {
    if (!fetchedRef.current) return
    lastDirRef.current = dir
    const willBeBack = Math.round((rotation + 180 * dir) / 180) % 2 !== 0
    setRotation(prev => prev + 180 * dir)
    clearAutoFlip()
    if (willBeBack) {
      triggerBlur()
      startAutoFlipBack(dir)
    }
  }, [rotation, clearAutoFlip, startAutoFlipBack, triggerBlur])

  // Touch swipe
  const onTouchStart = useCallback((e) => {
    touchStartRef.current = e.touches[0].clientX
    setIsSwiping(true)
  }, [])

  const onTouchMove = useCallback((e) => {
    if (touchStartRef.current === null) return
    setSwipeX(e.touches[0].clientX - touchStartRef.current)
  }, [])

  const onTouchEnd = useCallback(() => {
    setIsSwiping(false)
    if (Math.abs(swipeX) > 50) {
      const dir = swipeX > 0 ? 1 : -1
      doSwipe(dir)
    }
    setSwipeX(0)
    touchStartRef.current = null
  }, [swipeX, doSwipe])

  // Mouse drag (desktop)
  const mouseDownRef = useRef(false)

  const onMouseDown = useCallback((e) => {
    e.preventDefault()
    touchStartRef.current = e.clientX
    mouseDownRef.current = true
    setIsSwiping(true)
  }, [])

  const onMouseMove = useCallback((e) => {
    if (!mouseDownRef.current || touchStartRef.current === null) return
    setSwipeX(e.clientX - touchStartRef.current)
  }, [])

  const onMouseUp = useCallback(() => {
    if (!mouseDownRef.current) return
    mouseDownRef.current = false
    setIsSwiping(false)
    if (Math.abs(swipeX) > 50) {
      const dir = swipeX > 0 ? 1 : -1
      doSwipe(dir)
    }
    setSwipeX(0)
    touchStartRef.current = null
  }, [swipeX, doSwipe])

  const handleNext = useCallback(() => {
    clearAutoFlip()
    // Disable transition, reset rotation instantly, then re-enable
    setNoTransition(true)
    setRotation(0)
    setBlurKey(0)
    setWordText('')
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setNoTransition(false))
    })
    if (index + 1 >= players.length) {
      onDone()
    } else {
      setIndex(index + 1)
    }
  }, [index, players.length, onDone, clearAutoFlip])

  if (!currentPlayer) return null

  const bg = currentPlayer.color || '#1a4a52'
  const swipeDeg = isSwiping ? swipeX / 3 : 0
  const baseDeg = rotation

  return (
    <div style={S.overlay}>
      {/* Progress bar */}
      <div style={S.topBar}>
        <span style={S.progress}>{index + 1} / {players.length}</span>
      </div>

      {/* 3D flip scene */}
      <div style={S.scene}>
        <div
          style={{
            ...S.card,
            transform: `rotateY(${baseDeg + swipeDeg}deg)`,
            transition: (isSwiping || noTransition) ? 'none' : 'transform 0.6s cubic-bezier(.4,.2,.2,1)',
          }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          {/* ---- FRONT ---- */}
          <div style={{ ...S.face, ...S.front, background: bg }}>
            <div style={S.fLabel}>请谨防他人偷看</div>
            <div style={S.fName}>{currentPlayer.name}</div>
            <div style={S.fHint}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.5 }}>
                <path d="M15 19l-7-7 7-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{ margin: '0 12px', color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>左右翻牌查看词语</span>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.5 }}>
                <path d="M9 5l7 7-7 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          {/* ---- BACK ---- */}
          <div style={{ ...S.face, ...S.back, background: bg }}>
            <div style={S.bLabel}>你的词语是</div>
            <div key={blurKey} className="word-blur-in" style={S.bWord}>{wordText || '...'}</div>
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 13, padding: '0 16px' }}>
              {isBack
                ? <>记住你的词！ {countdown > 0 && <span style={{ fontWeight: 700 }}>{countdown}s 后自动翻回</span>}</>
                : '请谨防他人偷看'
              }
            </div>
          </div>
        </div>
      </div>

      {/* Bottom button */}
      <button style={S.nextBtn} onClick={handleNext}>
        记住了，传给下一位
      </button>
      <div style={S.hint}>把手机交给该玩家，滑动翻牌查看词语</div>
    </div>
  )
}

const S = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.85)',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center',
    padding: '16px',
    zIndex: 1000,
  },
  topBar: {
    width: '100%', maxWidth: 480,
    display: 'flex', justifyContent: 'center',
    padding: '8px 0 4px',
  },
  progress: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14, fontWeight: 600,
  },
  scene: {
    flex: 1,
    width: '100%', maxWidth: 480,
    perspective: '1200px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '12px 0',
  },
  card: {
    width: '100%', height: '100%',
    position: 'relative',
    transformStyle: 'preserve-3d',
  },
  face: {
    position: 'absolute', inset: 0,
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    borderRadius: 20,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: 24, gap: 12,
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  },
  front: {},
  back: {
    transform: 'rotateY(180deg)',
  },
  fLabel: {
    color: 'rgba(255,255,255,0.50)',
    fontSize: 14, fontWeight: 500,
  },
  fName: {
    color: 'white',
    fontSize: 48, fontWeight: 900,
    fontStyle: 'italic',
    textShadow: '0 4px 12px rgba(0,0,0,0.3)',
    textAlign: 'center',
    wordBreak: 'break-all',
  },
  fHint: {
    display: 'flex', alignItems: 'center',
    marginTop: 8,
  },
  bLabel: {
    color: 'rgba(255,255,255,0.60)',
    fontSize: 16, fontWeight: 500,
  },
  bWord: {
    color: 'white',
    fontSize: 52, fontWeight: 900,
    textShadow: '0 4px 16px rgba(0,0,0,0.35)',
    textAlign: 'center',
    wordBreak: 'break-all',
  },
  bTimer: {
    color: 'rgba(255,255,255,0.50)',
    fontSize: 14, fontWeight: 600,
    marginTop: 8,
  },
  nextBtn: {
    width: '100%', maxWidth: 480,
    padding: '16px 20px',
    background: '#22C55E',
    color: '#052e16',
    border: 'none',
    borderRadius: 14,
    fontSize: 18, fontWeight: 800,
    cursor: 'pointer',
    marginTop: 8,
  },
  hint: {
    color: 'rgba(255,255,255,0.40)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    paddingBottom: 8,
  },
}
