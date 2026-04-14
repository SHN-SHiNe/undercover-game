import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { CATEGORY_KEYS, CATEGORY_NAMES } from '../utils/helpers'
import { apiGetWords, apiAddWord, apiDeleteWord, apiBatchImport, apiGetWordStats } from '../utils/api'

export default function WordLibraryPage({ toast }) {
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState('general')
  const [pairs, setPairs] = useState([])
  const [wordCounts, setWordCounts] = useState({})
  const [loading, setLoading] = useState(false)
  const [word1, setWord1] = useState('')
  const [word2, setWord2] = useState('')
  const [batchText, setBatchText] = useState('')
  const [mode, setMode] = useState('list') // list | add | batch
  const [searchText, setSearchText] = useState('')
  const fileInputRef = useRef(null)

  const loadPairs = useCallback(async (cat) => {
    setLoading(true)
    const data = await apiGetWords(cat)
    setPairs(data)
    setLoading(false)
  }, [])

  const loadStats = useCallback(async () => {
    const stats = await apiGetWordStats()
    setWordCounts(stats)
  }, [])

  useEffect(() => {
    loadPairs(activeCategory)
    loadStats()
  }, [activeCategory, loadPairs, loadStats])

  const handleAdd = useCallback(async () => {
    if (!word1.trim() || !word2.trim()) {
      toast('两个词语都不能为空')
      return
    }
    try {
      await apiAddWord(activeCategory, word1.trim(), word2.trim())
      setWord1('')
      setWord2('')
      toast('添加成功')
      loadPairs(activeCategory)
      loadStats()
    } catch (err) {
      toast(err.message)
    }
  }, [word1, word2, activeCategory, toast, loadPairs, loadStats])

  const handleDelete = useCallback(async (index) => {
    const pair = pairs[index]
    if (!confirm(`确认删除「${pair.civilian} / ${pair.undercover}」？`)) return
    try {
      await apiDeleteWord(activeCategory, index)
      toast('已删除')
      loadPairs(activeCategory)
      loadStats()
    } catch (err) {
      toast(err.message)
    }
  }, [activeCategory, pairs, toast, loadPairs, loadStats])

  const handleBatchImport = useCallback(async () => {
    if (!batchText.trim()) {
      toast('内容不能为空')
      return
    }
    try {
      const result = await apiBatchImport(activeCategory, batchText.trim())
      let msg = `成功导入 ${result.added} 条`
      if (result.errors && result.errors.length > 0) {
        msg += `，${result.errors.length} 条失败`
      }
      toast(msg)
      setBatchText('')
      setMode('list')
      loadPairs(activeCategory)
      loadStats()
    } catch (err) {
      toast(err.message)
    }
  }, [batchText, activeCategory, toast, loadPairs, loadStats])

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setBatchText(ev.target.result)
      setMode('batch')
    }
    reader.readAsText(file, 'utf-8')
    e.target.value = ''
  }, [])

  const filteredPairs = searchText.trim()
    ? pairs.filter(p =>
        p.civilian.includes(searchText.trim()) ||
        p.undercover.includes(searchText.trim())
      )
    : pairs

  return (
    <div className="app-wrapper">
      {/* Header */}
      <div className="app-header">
        <span className="title" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, verticalAlign: -3 }}>
            <path d="M15 19l-7-7 7-7"/>
          </svg>
          词库管理
        </span>
      </div>

      <div className="setup-content" style={{ paddingBottom: 100 }}>
        {/* Category tabs */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {CATEGORY_KEYS.map((key, idx) => (
            <button
              key={key}
              onClick={() => { setActiveCategory(key); setMode('list'); setSearchText('') }}
              style={{
                padding: '8px 16px',
                borderRadius: 20,
                border: 'none',
                background: activeCategory === key ? '#22C55E' : 'rgba(255,255,255,0.1)',
                color: activeCategory === key ? '#052e16' : 'rgba(255,255,255,0.7)',
                fontWeight: activeCategory === key ? 700 : 500,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              {CATEGORY_NAMES[idx]} ({wordCounts[key] || 0})
            </button>
          ))}
        </div>

        {/* Action bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button
            onClick={() => setMode('list')}
            style={{
              flex: 1, padding: '12px', borderRadius: 10, border: 'none',
              background: mode === 'list' ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
              color: 'white', fontWeight: 600, fontSize: 14, cursor: 'pointer',
            }}
          >词语列表</button>
          <button
            onClick={() => setMode('add')}
            style={{
              flex: 1, padding: '12px', borderRadius: 10, border: 'none',
              background: mode === 'add' ? '#22C55E' : 'rgba(255,255,255,0.05)',
              color: mode === 'add' ? '#052e16' : 'white', fontWeight: 600, fontSize: 14, cursor: 'pointer',
            }}
          >手动添加</button>
          <button
            onClick={() => setMode('batch')}
            style={{
              flex: 1, padding: '12px', borderRadius: 10, border: 'none',
              background: mode === 'batch' ? '#3B82F6' : 'rgba(255,255,255,0.05)',
              color: mode === 'batch' ? 'white' : 'white', fontWeight: 600, fontSize: 14, cursor: 'pointer',
            }}
          >批量导入</button>
        </div>

        {/* Manual add */}
        {mode === 'add' && (
          <div style={{
            background: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 20, marginBottom: 16,
          }}>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 12 }}>
              输入一对词语（两个词语的地位相同，游戏时随机分配给平民和卧底）
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 12, overflow: 'hidden' }}>
              <input
                type="text"
                placeholder="词语 A"
                value={word1}
                onChange={(e) => setWord1(e.target.value)}
                style={{
                  flex: 1, minWidth: 0, padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(0,0,0,0.3)', color: 'white', fontSize: 16, outline: 'none', boxSizing: 'border-box',
                }}
              />
              <input
                type="text"
                placeholder="词语 B"
                value={word2}
                onChange={(e) => setWord2(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                style={{
                  flex: 1, minWidth: 0, padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(0,0,0,0.3)', color: 'white', fontSize: 16, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            <button
              onClick={handleAdd}
              style={{
                width: '100%', padding: 14, borderRadius: 12, border: 'none',
                background: '#22C55E', color: '#052e16', fontWeight: 700, fontSize: 16, cursor: 'pointer',
              }}
            >添加词对</button>
          </div>
        )}

        {/* Batch import */}
        {mode === 'batch' && (
          <div style={{
            background: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 20, marginBottom: 16,
          }}>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 8 }}>
              格式：每对词语用逗号分隔，每条用分号或换行结尾
            </div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginBottom: 12 }}>
              示例：苹果,香蕉;手机,座机;牛奶,豆浆
            </div>
            <textarea
              placeholder="苹果,香蕉;手机,座机;牛奶,豆浆"
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
              rows={6}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(0,0,0,0.3)', color: 'white', fontSize: 15, outline: 'none',
                resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6,
              }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  flex: 1, padding: 14, borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)',
                  background: 'transparent', color: 'white', fontWeight: 600, fontSize: 15, cursor: 'pointer',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: -3, marginRight: 4 }}>
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                </svg>
                上传TXT文件
              </button>
              <button
                onClick={handleBatchImport}
                style={{
                  flex: 1, padding: 14, borderRadius: 12, border: 'none',
                  background: '#3B82F6', color: 'white', fontWeight: 700, fontSize: 15, cursor: 'pointer',
                }}
              >导入</button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
          </div>
        )}

        {/* Word list */}
        {mode === 'list' && (
          <>
            {/* Search */}
            <div style={{ marginBottom: 12 }}>
              <input
                type="text"
                placeholder="搜索词语..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(0,0,0,0.2)', color: 'white', fontSize: 14, outline: 'none',
                }}
              />
            </div>

            {loading ? (
              <div style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: 40 }}>加载中...</div>
            ) : filteredPairs.length === 0 ? (
              <div style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: 40 }}>
                {searchText ? '没有匹配的词语' : '该分类暂无词语，去添加一些吧'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {filteredPairs.map((pair, idx) => {
                  const realIdx = searchText ? pairs.indexOf(pair) : idx
                  return (
                    <div
                      key={realIdx}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '12px 16px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, minWidth: 28 }}>
                          {realIdx + 1}
                        </span>
                        <span style={{ color: '#4ade80', fontWeight: 600, fontSize: 15 }}>{pair.civilian}</span>
                        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>/</span>
                        <span style={{ color: '#f87171', fontWeight: 600, fontSize: 15 }}>{pair.undercover}</span>
                      </div>
                      <button
                        onClick={() => handleDelete(realIdx)}
                        style={{
                          background: 'rgba(239,68,68,0.15)', border: 'none', borderRadius: 8,
                          padding: '6px 10px', cursor: 'pointer', flexShrink: 0,
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
                          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                        </svg>
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
