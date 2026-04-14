import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { pastelizeColor, pickTextColor } from '../utils/helpers'
import { apiGetState, apiRedeal } from '../utils/api'

export default function ResultPage({ toast }) {
  const [title, setTitle] = useState('对局结果')
  const [civilianWord, setCivilianWord] = useState('')
  const [undercoverWord, setUndercoverWord] = useState('')
  const [cards, setCards] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    async function loadResult() {
      try {
        const data = await apiGetState()
        const s = data.state.status
        if (!s.ended) {
          setTitle('本局尚未结束')
          return
        }
        const winnerMap = {
          civilians: '平民阵营胜利',
          undercover: '卧底阵营胜利',
          blank: '白板胜利',
        }
        setTitle(winnerMap[s.winner] || '对局结果')
        setCivilianWord(s.reveal?.words?.civilian || '')
        setUndercoverWord(s.reveal?.words?.undercover || '')

        const undercoverSet = new Set(s.reveal?.undercover_ids || [])
        const blankSet = new Set(s.reveal?.blank_ids || [])

        const players = data.state.players || []
        const resultCards = players.map((p) => {
          const role = undercoverSet.has(p.id) ? 'undercover' : (blankSet.has(p.id) ? 'blank' : 'civilian')
          const word = role === 'undercover'
            ? (s.reveal?.words?.undercover || '')
            : (role === 'civilian' ? (s.reveal?.words?.civilian || '') : '（无）')
          const roleText = role === 'undercover' ? '卧底' : (role === 'blank' ? '白板' : '平民')
          return { ...p, role, word, roleText }
        })
        setCards(resultCards)
      } catch (err) {
        setTitle('结果加载失败')
      }
    }
    loadResult()
  }, [])

  const handleRedeal = useCallback(async () => {
    try {
      await apiRedeal()
      navigate('/?reveal=1')
    } catch (err) {
      toast(err.message || '再来一局失败')
    }
  }, [navigate, toast])

  return (
    <div className="result-wrapper" style={{ maxWidth: 480, margin: '0 auto' }}>
      <div className="result-header">
        <h1>{title}</h1>
        <div className="result-sub">胜利阵营与全部玩家信息</div>
      </div>

      <div className="result-words">
        <div>平民词：<strong>{civilianWord}</strong></div>
        <div>卧底词：<strong>{undercoverWord}</strong></div>
      </div>

      <div className="result-grid">
        {cards.map((card) => {
          const bg = card.color || '#222222'
          return (
            <div
              key={card.id}
              className="result-card"
              style={{ background: bg }}
            >
              <header>
                <span className="name">{card.name}</span>
              </header>
              <div className="result-word">{card.word}</div>
              <div className="role-banner">{card.roleText}</div>
            </div>
          )
        })}
      </div>

      <div className="result-actions">
        <button className="btn-redeal" onClick={handleRedeal}>再来一局</button>
        <a href="/" className="btn-home" onClick={(e) => { e.preventDefault(); navigate('/') }}>返回主页</a>
      </div>
    </div>
  )
}
