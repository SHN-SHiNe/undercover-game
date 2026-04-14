import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { pastelizeColor, pickTextColor } from '../utils/helpers'
import { apiGetState, apiRedeal, apiReset, apiGetPlayerWord } from '../utils/api'
import RevealOverlay from './RevealOverlay'
import VoteOverlay from './VoteOverlay'

export default function GamePage({ gameState, applyState, toast, onReset }) {
  const [showReveal, setShowReveal] = useState(false)
  const [votePid, setVotePid] = useState(null)
  const [revealInfo, setRevealInfo] = useState(null) // { pid, name, role, word }
  const navigate = useNavigate()
  const location = useLocation()
  const initDone = useRef(false)

  // On mount, check if we need to fetch state and start reveal
  useEffect(() => {
    if (initDone.current) return
    initDone.current = true

    const sp = new URLSearchParams(location.search)
    const needReveal = sp.get('reveal') === '1'

    if (gameState.started && needReveal) {
      setShowReveal(true)
      // Clean URL
      try { window.history.replaceState({}, '', '/game') } catch (_) {}
    } else if (!gameState.started) {
      // Try to fetch state
      apiGetState().then((data) => {
        applyState(data.state)
        if (data.state.started && needReveal) {
          setShowReveal(true)
        } else if (!data.state.started) {
          navigate('/', { replace: true })
        }
        try { window.history.replaceState({}, '', '/game') } catch (_) {}
      }).catch(() => {
        navigate('/', { replace: true })
      })
    }
  }, [gameState.started, location.search, applyState, navigate])

  // Auto redirect to result page when game ends
  useEffect(() => {
    if (gameState.status && gameState.status.ended) {
      setTimeout(() => {
        navigate('/result')
      }, 200)
    }
  }, [gameState.status, navigate])

  const handleRedeal = useCallback(async () => {
    try {
      const data = await apiRedeal()
      applyState(data.state)
      toast('已重新发牌，开始传手机逐人看词')
      setShowReveal(true)
    } catch (err) {
      toast(err.message)
    }
  }, [applyState, toast])

  const handleReset = useCallback(async () => {
    if (!confirm('确认重置当前对局？')) return
    try {
      const data = await apiReset()
      applyState(data.state)
      onReset()
    } catch (err) {
      toast(err.message)
    }
  }, [applyState, toast, onReset])

  const handleRevealDone = useCallback(() => {
    setShowReveal(false)
    // Announce first speaker
    const pid = gameState.first_speaker_id
    const p = gameState.players.find(x => x.id === pid)
    if (p) toast(`所有玩家已查看，请 ${p.name} 先发言`)
  }, [gameState.first_speaker_id, gameState.players, toast])

  const handleVoteDone = useCallback((data) => {
    applyState(data.state)
    setVotePid(null)
    if (data.winner) {
      navigate('/result')
    }
  }, [applyState, navigate])

  const { players, first_speaker_id, status } = gameState

  return (
    <div className="game-wrapper">
      {/* Header */}
      <div className="game-header">
        <span className="title">对局进行中</span>
      </div>

      {/* Content */}
      <div className="game-content">
        {players.map((p) => {
          const bg = p.color || '#222222'
          return (
            <div
              key={p.id}
              className={`game-player-card ${!p.alive ? 'eliminated' : ''}`}
              style={{ background: bg }}
              onClick={async () => {
                if (p.alive) {
                  setVotePid(p.id)
                } else {
                  // Show eliminated player identity
                  try {
                    const { word, role } = await apiGetPlayerWord(p.id)
                    const roleLabel = role === 'undercover' ? '卧底' : role === 'blank' ? '白板' : '平民'
                    const wordLabel = role === 'blank' ? '无词' : (word || '未知')
                    setRevealInfo({ pid: p.id, name: p.name, role: roleLabel, word: wordLabel, color: p.color })
                  } catch (_) {
                    toast('获取身份失败')
                  }
                }
              }}
            >
              <div className="name-area">
                <span className="player-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {p.name}
                  {first_speaker_id === p.id && (
                    <span className="badge-first">先发言</span>
                  )}
                  {!p.alive && (
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                      <path d="M12 3.0498C16.3805 3.04981 19.9493 6.56662 19.9502 10.9268L19.9453 11.2236C19.8989 12.4965 19.5392 13.7362 18.9033 14.8359C19.0124 15.0994 19.0742 15.3877 19.0742 15.6904C19.0742 16.5996 18.5337 17.3727 17.7627 17.7285V17.9941C17.7627 18.8189 17.3668 19.6658 16.5762 20.1289C13.6369 21.8508 10.3638 21.8507 7.42383 20.1289C6.63342 19.666 6.2373 18.82 6.2373 17.9941V17.7295C5.46596 17.3733 4.92578 16.5992 4.92578 15.6904C4.92583 15.3873 4.98675 15.099 5.0957 14.8359C4.43048 13.684 4.04987 12.3491 4.0498 10.9287C4.0498 6.56783 7.619 3.0498 12 3.0498ZM12 4.9502C8.64971 4.9502 5.9502 7.63571 5.9502 10.9287C5.95027 12.1733 6.33431 13.3281 6.99316 14.2852C7.24261 14.6477 7.21007 15.1344 6.91504 15.4609C6.85687 15.5255 6.82529 15.6041 6.8252 15.6904C6.8252 15.8749 6.97925 16.04 7.1875 16.04C7.71204 16.0402 8.13764 16.4657 8.1377 16.9902V17.9941C8.1377 18.2387 8.25195 18.4119 8.38379 18.4893C8.71985 18.6861 9.06052 18.8537 9.40332 18.9941V18.8232C9.40347 18.2988 9.82814 17.8733 10.3525 17.873C10.8771 17.873 11.3026 18.2987 11.3027 18.8232V19.4824C11.7672 19.5323 12.2328 19.5322 12.6973 19.4824V18.8232C12.6974 18.2987 13.1229 17.873 13.6475 17.873C14.1719 17.8733 14.5965 18.2988 14.5967 18.8232V18.9941C14.9395 18.8537 15.2802 18.6861 15.6162 18.4893C15.7478 18.412 15.8623 18.2382 15.8623 17.9941V16.9893C15.8624 16.4648 16.288 16.0392 16.8125 16.0391C17.0215 16.0391 17.1748 15.8741 17.1748 15.6904C17.1747 15.6031 17.1425 15.5244 17.0859 15.4619C16.7896 15.1351 16.7572 14.6473 17.0078 14.2842C17.6885 13.2984 18.0518 12.1277 18.0498 10.9297V10.9287C18.0498 7.63571 15.3503 4.9502 12 4.9502ZM12.1621 13.7666C12.5246 13.8156 12.7752 14.0198 12.9111 14.1504C12.9848 14.2212 13.0583 14.3053 13.1289 14.3896L13.3271 14.6348L13.5684 14.9395C13.8938 15.3507 13.825 15.9487 13.4141 16.2744C13.0028 16.6001 12.4049 16.5302 12.0791 16.1191L12 16.0195L11.9219 16.1191C11.5962 16.5304 10.9982 16.5999 10.5869 16.2744C10.1756 15.9487 10.1059 15.3508 10.4316 14.9395L10.6729 14.6348H10.6738C10.7936 14.4837 10.9425 14.292 11.0898 14.1504C11.2452 14.0011 11.5495 13.756 12 13.7559L12.1621 13.7666ZM9.0498 10.0498C9.56549 10.0498 10.0691 10.2445 10.4473 10.6045C10.8271 10.9662 11.0498 11.4675 11.0498 12C11.0498 12.5325 10.8271 13.0338 10.4473 13.3955C10.0691 13.7555 9.56549 13.9502 9.0498 13.9502C8.53409 13.9501 8.0305 13.7555 7.65234 13.3955C7.27254 13.0338 7.0498 12.5325 7.0498 12C7.0498 11.4675 7.27254 10.9662 7.65234 10.6045C8.0305 10.2445 8.53409 10.0499 9.0498 10.0498ZM14.9502 10.0498C15.4659 10.0499 15.9695 10.2445 16.3477 10.6045C16.7275 10.9662 16.9502 11.4675 16.9502 12C16.9502 12.5325 16.7275 13.0338 16.3477 13.3955C15.9695 13.7555 15.4659 13.9501 14.9502 13.9502C14.4345 13.9502 13.9309 13.7555 13.5527 13.3955C13.1729 13.0338 12.9502 12.5325 12.9502 12C12.9502 11.4675 13.1729 10.9662 13.5527 10.6045C13.9309 10.2445 14.4345 10.0498 14.9502 10.0498Z" fill="white"/>
                    </svg>
                  )}
                </span>
              </div>
              <div className="number-area">
                <span className="player-number">#{p.id + 1}</span>
              </div>
            </div>
          )
        })}

        {/* End panel */}
        {status && status.ended && status.reveal && (
          <div className="end-panel">
            <div className="end-title">
              {status.winner === 'civilians' ? '平民阵营胜利' :
               status.winner === 'undercover' ? '卧底阵营胜利' : '白板胜利'}
            </div>
            <div className="end-words">
              <div>平民词：<strong>{status.reveal.words?.civilian || ''}</strong></div>
              <div>卧底词：<strong>{status.reveal.words?.undercover || ''}</strong></div>
            </div>
            <div className="end-roles">
              <div>卧底玩家：{(status.reveal.undercover_names || []).join('、')}</div>
              <div>白板玩家：{(status.reveal.blank_names || []).join('、')}</div>
            </div>
            <button className="btn-result" onClick={() => navigate('/result')}>
              查看完整结果
            </button>
          </div>
        )}

        {/* Game actions */}
        <div className="game-actions">
          <button className="btn-redeal" onClick={handleRedeal}>再来一局</button>
          <button className="btn-reset" onClick={handleReset}>重置游戏</button>
        </div>
      </div>

      {/* Reveal overlay */}
      {showReveal && gameState.players.length > 0 && (
        <RevealOverlay
          players={gameState.players}
          onDone={handleRevealDone}
        />
      )}

      {/* Vote overlay */}
      {votePid !== null && (
        <VoteOverlay
          pid={votePid}
          player={players.find(x => x.id === votePid)}
          onClose={() => setVotePid(null)}
          onVoteDone={handleVoteDone}
          toast={toast}
        />
      )}

      {/* Eliminated player identity reveal */}
      {revealInfo && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 999, padding: 24,
          }}
          onClick={() => setRevealInfo(null)}
        >
          <div
            style={{
              background: revealInfo.color || '#1a4a52',
              borderRadius: 20, padding: '32px 28px',
              maxWidth: 340, width: '100%',
              textAlign: 'center',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 4 }}>已出局</div>
            <div style={{ color: 'white', fontSize: 28, fontWeight: 900, marginBottom: 16 }}>{revealInfo.name}</div>
            <div style={{
              background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: '20px 12px', marginBottom: 20,
            }}>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 6 }}>身份</div>
              <div style={{
                color: revealInfo.role === '卧底' ? '#f87171' : revealInfo.role === '白板' ? '#a78bfa' : '#4ade80',
                fontSize: 28, fontWeight: 800,
              }}>{revealInfo.role}</div>
            </div>
            <button
              style={{
                width: '100%', padding: '14px', background: 'rgba(255,255,255,0.15)',
                color: 'white', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700,
                cursor: 'pointer',
              }}
              onClick={() => setRevealInfo(null)}
            >关闭</button>
          </div>
        </div>
      )}
    </div>
  )
}
