import React, { useState, useCallback, useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import SetupPage from './components/SetupPage'
import GamePage from './components/GamePage'
import ResultPage from './components/ResultPage'
import WordLibraryPage from './components/WordLibraryPage'
import Modal from './components/Modal'
import { apiGetState } from './utils/api'

export default function App() {
  const [gameState, setGameState] = useState({
    started: false,
    players: [],
    config: { total_players: 0, undercover_count: 0, blank_count: 0 },
    status: { ended: false, winner: null, alive_counts: { undercover: 0, good: 0 } },
    first_speaker_id: null,
  })

  const [modalMsg, setModalMsg] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()

  const toast = useCallback((msg) => {
    setModalMsg(msg)
  }, [])

  const applyState = useCallback((s) => {
    setGameState({
      started: s.started,
      players: s.players,
      config: s.config,
      status: s.status,
      first_speaker_id: s.first_speaker_id ?? null,
    })
  }, [])

  // Handle ?reveal=1 query param
  useEffect(() => {
    const sp = new URLSearchParams(location.search)
    if (sp.get('reveal') === '1' && location.pathname === '/') {
      apiGetState().then((data) => {
        applyState(data.state)
        navigate('/game?reveal=1', { replace: true })
      }).catch(() => {})
    }
  }, [location.search, location.pathname, applyState, navigate])

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            <SetupPage
              toast={toast}
              applyState={applyState}
              onGameStarted={() => navigate('/game?reveal=1')}
            />
          }
        />
        <Route
          path="/game"
          element={
            <GamePage
              gameState={gameState}
              applyState={applyState}
              toast={toast}
              onReset={() => navigate('/')}
            />
          }
        />
        <Route
          path="/result"
          element={
            <ResultPage
              toast={toast}
            />
          }
        />
        <Route
          path="/words"
          element={
            <WordLibraryPage
              toast={toast}
            />
          }
        />
      </Routes>
      {modalMsg !== null && (
        <Modal message={modalMsg} onClose={() => setModalMsg(null)} />
      )}
    </>
  )
}
