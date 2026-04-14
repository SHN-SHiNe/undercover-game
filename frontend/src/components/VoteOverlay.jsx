import React, { useState, useCallback, useRef, useEffect } from 'react'
import { apiVote, apiGetPlayerWord } from '../utils/api'

export default function VoteOverlay({ pid, player, onClose, onVoteDone, toast }) {
  const [wordText, setWordText] = useState('')
  const [timerText, setTimerText] = useState('')
  const timerRef = useRef(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setTimerText('')
  }, [])

  useEffect(() => {
    return () => clearTimer()
  }, [clearTimer])

  const handleEliminate = useCallback(async () => {
    try {
      const data = await apiVote(pid)
      clearTimer()
      onVoteDone(data)
    } catch (err) {
      toast(err.message)
    }
  }, [pid, clearTimer, onVoteDone, toast])

  const handleViewWord = useCallback(async () => {
    try {
      const { word, role } = await apiGetPlayerWord(pid)
      const text = role === 'blank' ? '你是白板（无词）' : (word || '（无）')
      setWordText(text)

      clearTimer()
      let left = 2
      setTimerText(`${left}s`)
      timerRef.current = setInterval(() => {
        left -= 1
        if (left > 0) {
          setTimerText(`${left}s`)
        } else {
          clearInterval(timerRef.current)
          timerRef.current = null
          setTimerText('')
          setWordText('')
        }
      }, 1000)
    } catch (err) {
      toast(err.message || '获取词失败')
    }
  }, [pid, clearTimer, toast])

  const handleOverlayClick = useCallback((e) => {
    if (e.target === e.currentTarget) onClose()
  }, [onClose])

  if (!player) return null

  const bg = player.color || '#0C3238'

  return (
    <div className="vote-overlay" onClick={handleOverlayClick}>
      <div className="vote-card" style={{ background: bg }}>
        <button className="vote-close" onClick={onClose}>×</button>
        <div className="vote-name">{player.name}</div>
        <div className="vote-word">{wordText}</div>
        <div className="vote-timer">{timerText}</div>
        <button className="btn-eliminate" onClick={handleEliminate}>投票出局</button>
        <button className="btn-view-word" onClick={handleViewWord}>忘词查看</button>
      </div>
    </div>
  )
}
