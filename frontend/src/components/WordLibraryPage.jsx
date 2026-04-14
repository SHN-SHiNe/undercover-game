import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
// categories are now loaded dynamically from backend
import { apiGetWords, apiAddWord, apiEditWord, apiDeleteWord, apiBatchImport, apiGetCategories, apiRenameCategory, apiAddCategory, apiDeleteCategory } from '../utils/api'
import { pullFromRemote, pushToRemote } from '../utils/wordStore'

export default function WordLibraryPage({ toast }) {
  const navigate = useNavigate()
  const [categories, setCategories] = useState([])
  const [activeCategory, setActiveCategory] = useState('')
  const [pairs, setPairs] = useState([])
  const [loading, setLoading] = useState(false)
  const [word1, setWord1] = useState('')
  const [word2, setWord2] = useState('')
  const [batchText, setBatchText] = useState('')
  const [mode, setMode] = useState('list') // list | add | batch
  const [searchText, setSearchText] = useState('')
  const fileInputRef = useRef(null)
  // Edit overlay state
  const [editIdx, setEditIdx] = useState(null)
  const [editW1, setEditW1] = useState('')
  const [editW2, setEditW2] = useState('')
  // Category edit overlay
  const [editCatKey, setEditCatKey] = useState(null)
  const [editCatName, setEditCatName] = useState('')
  // New category overlay
  const [showNewCat, setShowNewCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')

  const loadCategories = useCallback(async () => {
    const cats = await apiGetCategories()
    setCategories(cats)
    return cats
  }, [])

  const loadPairs = useCallback(async (cat) => {
    if (!cat) return
    setLoading(true)
    const data = await apiGetWords(cat)
    setPairs(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadCategories().then(cats => {
      if (cats.length > 0 && !activeCategory) setActiveCategory(cats[0].key)
    })
  }, [loadCategories])

  useEffect(() => {
    if (activeCategory) loadPairs(activeCategory)
  }, [activeCategory, loadPairs])

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
      loadCategories()
    } catch (err) {
      toast(err.message)
    }
  }, [word1, word2, activeCategory, toast, loadPairs, loadCategories])

  const openEdit = useCallback((index) => {
    const pair = pairs[index]
    setEditIdx(index)
    setEditW1(pair.civilian)
    setEditW2(pair.undercover)
  }, [pairs])

  const handleEdit = useCallback(async () => {
    if (editIdx === null) return
    if (!editW1.trim() || !editW2.trim()) { toast('两个词语都不能为空'); return }
    try {
      await apiEditWord(activeCategory, editIdx, editW1.trim(), editW2.trim())
      toast('修改成功')
      setEditIdx(null)
      loadPairs(activeCategory)
    } catch (err) { toast(err.message) }
  }, [editIdx, editW1, editW2, activeCategory, toast, loadPairs])

  const handleDelete = useCallback(async (index) => {
    try {
      await apiDeleteWord(activeCategory, index)
      toast('已删除')
      setEditIdx(null)
      loadPairs(activeCategory)
      loadCategories()
    } catch (err) { toast(err.message) }
  }, [activeCategory, toast, loadPairs, loadCategories])

  const handleBatchImport = useCallback(async () => {
    if (!batchText.trim()) {
      toast('内容不能为空')
      return
    }
    try {
      const result = await apiBatchImport(activeCategory, batchText.trim())
      const parts = [`成功 ${result.added} 条`]
      if (result.duplicated > 0) parts.push(`重复 ${result.duplicated} 条`)
      if (result.errors && result.errors.length > 0) parts.push(`失败 ${result.errors.length} 条`)
      toast(parts.join('，'))
      setBatchText('')
      setMode('list')
      loadPairs(activeCategory)
      loadCategories()
    } catch (err) {
      toast(err.message)
    }
  }, [batchText, activeCategory, toast, loadPairs, loadCategories])

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
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => { setActiveCategory(cat.key); setMode('list'); setSearchText('') }}
              onContextMenu={(e) => { e.preventDefault(); setEditCatKey(cat.key); setEditCatName(cat.name) }}
              style={{
                padding: '8px 16px',
                borderRadius: 20,
                border: 'none',
                background: activeCategory === cat.key ? '#22C55E' : 'rgba(255,255,255,0.1)',
                color: activeCategory === cat.key ? '#052e16' : 'rgba(255,255,255,0.7)',
                fontWeight: activeCategory === cat.key ? 700 : 500,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              {cat.name} ({cat.count})
            </button>
          ))}
          <button
            onClick={() => { setShowNewCat(true); setNewCatName('') }}
            style={{
              padding: '8px 14px', borderRadius: 20,
              border: '1px dashed rgba(255,255,255,0.3)', background: 'transparent',
              color: 'rgba(255,255,255,0.5)', fontSize: 14, cursor: 'pointer',
            }}
          >+ 新分类</button>
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

        {/* Sync buttons */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button
            onClick={() => {
              toast('正在从服务器拉取...')
              pullFromRemote().then(() => {
                loadCategories()
                loadPairs(activeCategory)
                toast('词库已更新')
              }).catch(() => toast('同步失败，请检查网络'))
            }}
            style={{
              flex: 1, padding: '10px', borderRadius: 10, border: '1px solid rgba(59,130,246,0.4)',
              background: 'rgba(59,130,246,0.1)', color: '#60A5FA', fontWeight: 600, fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.66 0 3-4.03 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4.03-3-9s1.34-9 3-9"/>
            </svg>
            更新词库
          </button>
          <button
            onClick={() => {
              toast('正在上传到服务器...')
              pushToRemote().then(() => {
                toast('上传成功')
              }).catch(() => toast('上传失败，请检查网络'))
            }}
            style={{
              flex: 1, padding: '10px', borderRadius: 10, border: '1px solid rgba(34,197,94,0.4)',
              background: 'rgba(34,197,94,0.1)', color: '#4ADE80', fontWeight: 600, fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            上传词库
          </button>
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
              格式：每对词语用逗号分隔，每条用分号或换行结尾（支持中英文标点）
            </div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginBottom: 12 }}>
              示例：苹果,香蕉;手机,座机 或 苹果，香蕉；手机，座机
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
                      onClick={() => openEdit(realIdx)}
                      style={{
                        display: 'flex', alignItems: 'center',
                        background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '12px 16px',
                        cursor: 'pointer', transition: 'background 0.15s',
                      }}
                      onPointerDown={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
                      onPointerUp={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                      onPointerLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                    >
                      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, minWidth: 28 }}>
                        {realIdx + 1}
                      </span>
                      <span style={{ color: '#4ade80', fontWeight: 600, fontSize: 15 }}>{pair.civilian}</span>
                      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, margin: '0 6px' }}>/</span>
                      <span style={{ color: '#f87171', fontWeight: 600, fontSize: 15 }}>{pair.undercover}</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" style={{ marginLeft: 'auto', flexShrink: 0 }}>
                        <path d="M9 18l6-6-6-6"/>
                      </svg>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Category rename overlay */}
      {editCatKey !== null && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 999,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setEditCatKey(null) }}
        >
          <div style={{
            width: '100%', maxWidth: 500, background: '#1a3a40', borderRadius: '20px 20px 0 0',
            padding: '24px 20px', paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ color: 'white', fontSize: 18, fontWeight: 700 }}>编辑分类</span>
              <button onClick={() => setEditCatKey(null)}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 24, cursor: 'pointer', padding: '0 4px' }}
              >&times;</button>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 8 }}>分类标识: {editCatKey}</div>
            <input
              type="text" value={editCatName} onChange={(e) => setEditCatName(e.target.value)}
              placeholder="分类名称"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  apiRenameCategory(editCatKey, editCatName.trim()).then(() => {
                    toast('已重命名'); setEditCatKey(null); loadCategories()
                  }).catch(err => toast(err.message))
                }
              }}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(0,0,0,0.3)', color: 'white', fontSize: 16, outline: 'none', boxSizing: 'border-box', marginBottom: 16,
              }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => {
                  const cat = categories.find(c => c.key === editCatKey)
                  if (cat && cat.count > 0 && !confirm(`该分类有 ${cat.count} 条词语，确认删除？`)) return
                  apiDeleteCategory(editCatKey).then(() => {
                    toast('已删除分类'); setEditCatKey(null); loadCategories()
                    if (activeCategory === editCatKey) setActiveCategory(categories[0]?.key || '')
                  }).catch(err => toast(err.message))
                }}
                style={{
                  flex: 1, padding: 14, borderRadius: 12, border: '1px solid rgba(239,68,68,0.4)',
                  background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontWeight: 600, fontSize: 15, cursor: 'pointer',
                }}
              >删除分类</button>
              <button
                onClick={() => {
                  apiRenameCategory(editCatKey, editCatName.trim()).then(() => {
                    toast('已重命名'); setEditCatKey(null); loadCategories()
                  }).catch(err => toast(err.message))
                }}
                style={{
                  flex: 2, padding: 14, borderRadius: 12, border: 'none',
                  background: '#22C55E', color: '#052e16', fontWeight: 700, fontSize: 15, cursor: 'pointer',
                }}
              >保存</button>
            </div>
          </div>
        </div>
      )}

      {/* New category overlay */}
      {showNewCat && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 999,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowNewCat(false) }}
        >
          <div style={{
            width: '100%', maxWidth: 500, background: '#1a3a40', borderRadius: '20px 20px 0 0',
            padding: '24px 20px', paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ color: 'white', fontSize: 18, fontWeight: 700 }}>新建分类</span>
              <button onClick={() => setShowNewCat(false)}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 24, cursor: 'pointer', padding: '0 4px' }}
              >&times;</button>
            </div>
            <input
              type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
              placeholder="分类名称（如：影视、音乐）"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newCatName.trim()) {
                  const key = 'custom_' + Date.now()
                  apiAddCategory(key, newCatName.trim()).then(() => {
                    toast('已创建'); setShowNewCat(false); loadCategories().then(() => setActiveCategory(key))
                  }).catch(err => toast(err.message))
                }
              }}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(0,0,0,0.3)', color: 'white', fontSize: 16, outline: 'none', boxSizing: 'border-box', marginBottom: 16,
              }}
            />
            <button
              onClick={() => {
                if (!newCatName.trim()) { toast('名称不能为空'); return }
                const key = 'custom_' + Date.now()
                apiAddCategory(key, newCatName.trim()).then(() => {
                  toast('已创建'); setShowNewCat(false); loadCategories().then(() => setActiveCategory(key))
                }).catch(err => toast(err.message))
              }}
              style={{
                width: '100%', padding: 14, borderRadius: 12, border: 'none',
                background: '#22C55E', color: '#052e16', fontWeight: 700, fontSize: 15, cursor: 'pointer',
              }}
            >创建</button>
          </div>
        </div>
      )}

      {/* Edit overlay */}
      {editIdx !== null && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 999,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setEditIdx(null) }}
        >
          <div style={{
            width: '100%', maxWidth: 500, background: '#1a3a40', borderRadius: '20px 20px 0 0',
            padding: '24px 20px', paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ color: 'white', fontSize: 18, fontWeight: 700 }}>编辑词对</span>
              <button
                onClick={() => setEditIdx(null)}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 24, cursor: 'pointer', padding: '0 4px' }}
              >&times;</button>
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, overflow: 'hidden' }}>
              <input
                type="text" value={editW1} onChange={(e) => setEditW1(e.target.value)}
                placeholder="词语 A"
                style={{
                  flex: 1, minWidth: 0, padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(0,0,0,0.3)', color: '#4ade80', fontSize: 16, fontWeight: 600, outline: 'none', boxSizing: 'border-box',
                }}
              />
              <input
                type="text" value={editW2} onChange={(e) => setEditW2(e.target.value)}
                placeholder="词语 B"
                onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
                style={{
                  flex: 1, minWidth: 0, padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(0,0,0,0.3)', color: '#f87171', fontSize: 16, fontWeight: 600, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => { if (confirm('确认删除该词对？')) handleDelete(editIdx) }}
                style={{
                  flex: 1, padding: 14, borderRadius: 12, border: '1px solid rgba(239,68,68,0.4)',
                  background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontWeight: 600, fontSize: 15, cursor: 'pointer',
                }}
              >删除</button>
              <button
                onClick={handleEdit}
                style={{
                  flex: 2, padding: 14, borderRadius: 12, border: 'none',
                  background: '#22C55E', color: '#052e16', fontWeight: 700, fontSize: 15, cursor: 'pointer',
                }}
              >保存修改</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
