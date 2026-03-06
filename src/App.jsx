import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from './lib/supabase'

// ─── constants ───
const CATEGORIES = [
  { id: 'cita', label: 'cita', icon: '❝' },
  { id: 'cultura', label: 'cultura', icon: '◈' },
  { id: 'idea', label: 'idea', icon: '⚡' },
  { id: 'dato', label: 'dato', icon: '▣' },
  { id: 'concepto', label: 'concepto', icon: '◉' },
  { id: 'link', label: 'link', icon: '⟁' },
]

const ACCENTS = [
  '#ff6b35', '#00e5a0', '#f72585', '#4cc9f0',
  '#ffd166', '#c77dff', '#ff006e', '#38b000',
  '#fb5607', '#3a86ff',
]

const AUTHOR_COLORS = {}
let colorIdx = 0
function getAuthorColor(name) {
  if (!AUTHOR_COLORS[name]) {
    AUTHOR_COLORS[name] = ACCENTS[colorIdx % ACCENTS.length]
    colorIdx++
  }
  return AUTHOR_COLORS[name]
}

function getAccent(i) { return ACCENTS[i % ACCENTS.length] }

function formatTime(ts) {
  const d = new Date(ts)
  return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
}

function formatDate(ts) {
  const d = new Date(ts)
  const m = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  return `${d.getDate()} ${m[d.getMonth()]}`
}

function isToday(ts) {
  return new Date(ts).toDateString() === new Date().toDateString()
}

// ─── styles ───
const s = {
  mono: { fontFamily: "'Space Mono', monospace" },
  jet: { fontFamily: "'JetBrains Mono', monospace" },
  serif: { fontFamily: "'Instrument Serif', serif" },
  btn: {
    background: 'none', border: '1px solid #222', color: '#666',
    fontFamily: "'JetBrains Mono', monospace", fontSize: '10px',
    padding: '5px 12px', cursor: 'pointer', letterSpacing: '1px',
    textTransform: 'lowercase', transition: 'all 0.2s',
  },
  input: {
    width: '100%', background: '#0a0a0a', border: '1px solid #1a1a1a',
    color: '#e0e0e0', fontFamily: "'Space Mono', monospace", fontSize: '13px',
    padding: '12px 14px', outline: 'none', textTransform: 'lowercase',
  },
}

// ─── login screen ───
function LoginScreen({ onLogin }) {
  const [name, setName] = useState('')

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '20px',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '360px', width: '100%' }}>
        <h1 style={{
          ...s.serif, fontSize: '42px', fontWeight: 400,
          color: '#e0e0e0', marginBottom: '8px', letterSpacing: '2px',
        }}>
          intel feed
        </h1>
        <p style={{
          ...s.jet, fontSize: '10px', color: '#444',
          letterSpacing: '2px', marginBottom: '48px',
        }}>
          dossier colectivo de conocimiento
        </p>

        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && name.trim() && onLogin(name.trim().toLowerCase())}
          placeholder="tu nombre..."
          style={{
            ...s.input, textAlign: 'center', fontSize: '16px',
            borderColor: '#222', marginBottom: '16px',
          }}
          autoFocus
        />

        <button
          onClick={() => name.trim() && onLogin(name.trim().toLowerCase())}
          disabled={!name.trim()}
          style={{
            ...s.mono, width: '100%', padding: '12px',
            background: name.trim() ? '#ff6b35' : '#1a1a1a',
            border: 'none', color: name.trim() ? '#000' : '#333',
            fontSize: '13px', fontWeight: 700, cursor: name.trim() ? 'pointer' : 'default',
            letterSpacing: '2px', textTransform: 'lowercase',
          }}
        >
          entrar
        </button>

        <p style={{ ...s.jet, fontSize: '9px', color: '#333', marginTop: '20px' }}>
          no hay contraseña. solo tu nombre. confiamos.
        </p>
      </div>
    </div>
  )
}

// ─── intel card ───
function IntelCard({ entry, index, onDelete, onExpand, expanding, currentUser }) {
  const accent = getAccent(index)
  const authorColor = getAuthorColor(entry.author)
  const cat = CATEGORIES.find(c => c.id === entry.category) || CATEGORIES[3]
  const [showExp, setShowExp] = useState(false)

  return (
    <div style={{
      background: '#0a0a0a', borderLeft: `3px solid ${accent}`,
      border: `1px solid ${accent}11`, borderLeftWidth: '3px',
      borderLeftColor: accent, padding: '22px 20px',
      marginBottom: '2px', position: 'relative',
      transition: 'background 0.2s',
    }}>
      {/* header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '6px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{
            ...s.jet, fontSize: '10px', color: authorColor,
            background: `${authorColor}11`, padding: '2px 8px',
            border: `1px solid ${authorColor}33`,
          }}>
            {entry.author}
          </span>
          <span style={{
            ...s.jet, fontSize: '10px', color: accent,
            background: `${accent}11`, padding: '2px 8px',
            border: `1px solid ${accent}33`,
          }}>
            {cat.icon} {cat.label}
          </span>
          <span style={{ ...s.jet, fontSize: '9px', color: '#444' }}>
            {isToday(entry.created_at) ? formatTime(entry.created_at) : formatDate(entry.created_at)}
          </span>
        </div>
        {entry.author === currentUser && (
          <button
            onClick={() => onDelete(entry.id)}
            style={{
              background: 'none', border: 'none', color: '#222',
              cursor: 'pointer', fontSize: '14px', ...s.mono, padding: '2px 6px',
            }}
            title="eliminar"
          >×</button>
        )}
      </div>

      {/* source */}
      {entry.source && (
        <div style={{ ...s.jet, fontSize: '9px', color: '#555', marginBottom: '10px', letterSpacing: '0.5px' }}>
          fuente: {entry.source}
        </div>
      )}

      {/* content */}
      <div style={{
        fontFamily: entry.category === 'cita' ? "'Instrument Serif', serif" : "'Space Mono', monospace",
        fontSize: entry.category === 'cita' ? '18px' : '13px',
        fontStyle: entry.category === 'cita' ? 'italic' : 'normal',
        color: '#ddd', lineHeight: '1.7', textTransform: 'lowercase',
      }}>
        {entry.category === 'cita' && (
          <span style={{ color: accent, fontSize: '24px', marginRight: '4px' }}>„</span>
        )}
        {entry.content}
      </div>

      {/* expansion */}
      {entry.expansion && (
        <div style={{ marginTop: '14px' }}>
          <button onClick={() => setShowExp(!showExp)} style={{
            ...s.btn, borderColor: `${accent}33`, color: accent,
          }}>
            {showExp ? '▲ colapsar' : '▼ expansión'}
          </button>
          {showExp && (
            <div style={{
              marginTop: '12px', padding: '14px', background: '#050505',
              borderLeft: `2px solid ${accent}22`, ...s.mono,
              fontSize: '12px', color: '#999', lineHeight: '1.8',
              textTransform: 'lowercase', whiteSpace: 'pre-wrap',
            }}>
              {entry.expansion}
            </div>
          )}
        </div>
      )}

      {/* expand button */}
      {!entry.expansion && (
        <button
          onClick={() => onExpand(entry.id)}
          disabled={expanding === entry.id}
          style={{
            ...s.btn, marginTop: '12px',
            borderStyle: 'dashed', borderColor: '#222', color: '#444',
          }}
        >
          {expanding === entry.id ? '⏳ expandiendo...' : '⚡ expandir info'}
        </button>
      )}

      {/* index watermark */}
      <div style={{
        position: 'absolute', top: '18px', right: '16px',
        ...s.serif, fontSize: '40px', color: `${accent}06`,
        lineHeight: 1, pointerEvents: 'none',
      }}>
        {String(index + 1).padStart(2, '0')}
      </div>
    </div>
  )
}

// ─── slide view ───
function SlideView({ entries, onClose }) {
  const [idx, setIdx] = useState(0)
  const [showExp, setShowExp] = useState(false)
  const entry = entries[idx]
  if (!entry) return null
  const accent = getAccent(idx)
  const cat = CATEGORIES.find(c => c.id === entry.category) || CATEGORIES[3]
  const authorColor = getAuthorColor(entry.author)

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') setIdx(i => Math.min(entries.length - 1, i + 1))
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') setIdx(i => Math.max(0, i - 1))
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [entries.length, onClose])

  useEffect(() => { setShowExp(false) }, [idx])

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#050505',
      zIndex: 100, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '50px 24px',
    }}>
      {/* progress */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: '#111',
      }}>
        <div style={{
          height: '100%', background: accent, transition: 'width 0.3s',
          width: `${((idx + 1) / entries.length) * 100}%`,
        }} />
      </div>

      {/* close */}
      <button onClick={onClose} style={{
        position: 'absolute', top: '14px', right: '14px',
        ...s.btn, zIndex: 10,
      }}>✕</button>

      {/* top info */}
      <div style={{
        position: 'absolute', top: '14px', left: '14px',
        display: 'flex', gap: '8px', alignItems: 'center',
      }}>
        <span style={{
          ...s.jet, fontSize: '10px', color: authorColor,
          border: `1px solid ${authorColor}44`, padding: '2px 8px',
        }}>{entry.author}</span>
        <span style={{
          ...s.jet, fontSize: '10px', color: accent,
          border: `1px solid ${accent}44`, padding: '2px 8px',
        }}>{cat.icon} {cat.label}</span>
        <span style={{ ...s.jet, fontSize: '10px', color: '#333' }}>
          {idx + 1}/{entries.length}
        </span>
      </div>

      {/* content */}
      <div style={{ maxWidth: '600px', textAlign: 'center' }}>
        {entry.source && (
          <div style={{
            ...s.jet, fontSize: '10px', color: '#555',
            marginBottom: '20px', letterSpacing: '1px',
          }}>— {entry.source} —</div>
        )}
        <div style={{
          fontFamily: entry.category === 'cita' ? "'Instrument Serif', serif" : "'Space Mono', monospace",
          fontSize: entry.category === 'cita' ? '24px' : '16px',
          fontStyle: entry.category === 'cita' ? 'italic' : 'normal',
          color: '#e8e8e8', lineHeight: '1.8', textTransform: 'lowercase',
        }}>
          {entry.content}
        </div>

        {entry.expansion && (
          <div style={{ marginTop: '24px' }}>
            <button onClick={() => setShowExp(!showExp)} style={{
              ...s.btn, borderColor: `${accent}33`, color: accent,
            }}>
              {showExp ? 'ocultar' : 'ver expansión'}
            </button>
            {showExp && (
              <div style={{
                marginTop: '16px', ...s.mono, fontSize: '12px',
                color: '#888', lineHeight: '1.9', textAlign: 'left',
                textTransform: 'lowercase', whiteSpace: 'pre-wrap',
              }}>
                {entry.expansion}
              </div>
            )}
          </div>
        )}
      </div>

      {/* nav arrows */}
      <div style={{
        position: 'absolute', bottom: '20px', display: 'flex', gap: '12px',
      }}>
        <button
          onClick={() => setIdx(i => Math.max(0, i - 1))}
          disabled={idx === 0}
          style={{
            ...s.btn, width: '40px', height: '40px', fontSize: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 0, opacity: idx === 0 ? 0.2 : 1,
          }}
        >←</button>
        <button
          onClick={() => setIdx(i => Math.min(entries.length - 1, i + 1))}
          disabled={idx === entries.length - 1}
          style={{
            ...s.btn, width: '40px', height: '40px', fontSize: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 0, opacity: idx === entries.length - 1 ? 0.2 : 1,
          }}
        >→</button>
      </div>

      {/* timestamp */}
      <div style={{
        position: 'absolute', bottom: '24px', right: '20px',
        ...s.jet, fontSize: '9px', color: '#222',
      }}>
        {isToday(entry.created_at) ? `hoy ${formatTime(entry.created_at)}` : formatDate(entry.created_at)}
      </div>

      {/* watermark */}
      <div style={{
        position: 'absolute', bottom: '50px', right: '24px',
        ...s.serif, fontSize: '72px', color: `${accent}05`,
        lineHeight: 1, pointerEvents: 'none',
      }}>
        {String(idx + 1).padStart(2, '0')}
      </div>
    </div>
  )
}

// ─── main app ───
export default function App() {
  const [user, setUser] = useState(() => localStorage.getItem('intel-user') || '')
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('feed') // feed | input | slides
  const [content, setContent] = useState('')
  const [source, setSource] = useState('')
  const [category, setCategory] = useState('dato')
  const [filterCat, setFilterCat] = useState('all')
  const [filterAuthor, setFilterAuthor] = useState('all')
  const [expanding, setExpanding] = useState(null)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef(null)

  // login
  const handleLogin = (name) => {
    setUser(name)
    localStorage.setItem('intel-user', name)
  }

  const handleLogout = () => {
    setUser('')
    localStorage.removeItem('intel-user')
  }

  // fetch entries
  const fetchEntries = useCallback(async () => {
    const { data, error } = await supabase
      .from('entries')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) setEntries(data)
    setLoading(false)
  }, [])

  // initial load + realtime subscription
  useEffect(() => {
    if (!user) return
    fetchEntries()

    const channel = supabase
      .channel('entries-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entries' }, () => {
        fetchEntries()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user, fetchEntries])

  // add entry
  const addEntry = async () => {
    if (!content.trim()) return
    setSaving(true)
    const { error } = await supabase.from('entries').insert({
      content: content.trim().toLowerCase(),
      source: source.trim().toLowerCase() || null,
      category,
      author: user,
    })
    if (!error) {
      setContent('')
      setSource('')
      setView('feed')
      await fetchEntries()
    }
    setSaving(false)
  }

  // delete entry
  const deleteEntry = async (id) => {
    await supabase.from('entries').delete().eq('id', id)
    await fetchEntries()
  }

  // expand entry
  const expandEntry = async (id) => {
    setExpanding(id)
    const entry = entries.find(e => e.id === id)
    if (!entry) return

    try {
      const res = await fetch('/api/expand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: entry.content,
          category: entry.category,
          source: entry.source,
        }),
      })
      const data = await res.json()
      if (data.expansion) {
        await supabase.from('entries').update({ expansion: data.expansion }).eq('id', id)
        await fetchEntries()
      }
    } catch (err) {
      console.error('expand error:', err)
    }
    setExpanding(null)
  }

  // ─── login screen ───
  if (!user) return <LoginScreen onLogin={handleLogin} />

  // ─── filters ───
  const authors = [...new Set(entries.map(e => e.author))]
  let filtered = entries
  if (filterCat !== 'all') filtered = filtered.filter(e => e.category === filterCat)
  if (filterAuthor !== 'all') filtered = filtered.filter(e => e.author === filterAuthor)
  const todayCount = entries.filter(e => isToday(e.created_at)).length

  // ─── slides ───
  if (view === 'slides' && filtered.length > 0) {
    return <SlideView entries={filtered} onClose={() => setView('feed')} />
  }

  return (
    <div style={{ minHeight: '100vh', maxWidth: '640px', margin: '0 auto' }}>

      {/* ─── header ─── */}
      <div style={{ padding: '20px 16px 0', borderBottom: '1px solid #111' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'flex-start', marginBottom: '14px',
        }}>
          <div>
            <h1 style={{
              ...s.serif, fontSize: '26px', fontWeight: 400,
              color: '#e0e0e0', letterSpacing: '1px', margin: 0,
            }}>intel feed</h1>
            <div style={{ ...s.jet, fontSize: '9px', color: '#444', marginTop: '4px', letterSpacing: '1px' }}>
              {todayCount} hoy · {entries.length} total · {authors.length} agente{authors.length !== 1 ? 's' : ''}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {filtered.length > 0 && (
              <button onClick={() => setView('slides')} style={s.btn}>▶ slides</button>
            )}
            <button
              onClick={() => { setView('input'); setTimeout(() => inputRef.current?.focus(), 100) }}
              style={{
                ...s.mono, background: '#ff6b35', border: 'none',
                color: '#000', fontSize: '11px', fontWeight: 700,
                padding: '6px 14px', cursor: 'pointer', letterSpacing: '1px',
              }}
            >+ nueva</button>
          </div>
        </div>

        {/* user bar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: '10px',
        }}>
          <span style={{
            ...s.jet, fontSize: '10px',
            color: getAuthorColor(user),
          }}>
            ● {user}
          </span>
          <button onClick={handleLogout} style={{
            ...s.btn, fontSize: '9px', padding: '2px 8px', border: 'none', color: '#333',
          }}>salir</button>
        </div>

        {/* category filters */}
        <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '8px' }}>
          <button onClick={() => setFilterCat('all')} style={{
            ...s.btn, fontSize: '9px', padding: '3px 8px',
            background: filterCat === 'all' ? '#1a1a1a' : 'transparent',
            color: filterCat === 'all' ? '#ccc' : '#444',
            borderColor: filterCat === 'all' ? '#333' : '#111',
            flexShrink: 0,
          }}>todo</button>
          {CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setFilterCat(cat.id)} style={{
              ...s.btn, fontSize: '9px', padding: '3px 8px',
              background: filterCat === cat.id ? '#1a1a1a' : 'transparent',
              color: filterCat === cat.id ? '#ccc' : '#444',
              borderColor: filterCat === cat.id ? '#333' : '#111',
              flexShrink: 0, whiteSpace: 'nowrap',
            }}>{cat.icon} {cat.label}</button>
          ))}
        </div>

        {/* author filters */}
        {authors.length > 1 && (
          <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '10px' }}>
            <button onClick={() => setFilterAuthor('all')} style={{
              ...s.btn, fontSize: '9px', padding: '3px 8px',
              background: filterAuthor === 'all' ? '#1a1a1a' : 'transparent',
              color: filterAuthor === 'all' ? '#ccc' : '#444',
              borderColor: filterAuthor === 'all' ? '#333' : '#111',
              flexShrink: 0,
            }}>todos</button>
            {authors.map(a => (
              <button key={a} onClick={() => setFilterAuthor(a)} style={{
                ...s.btn, fontSize: '9px', padding: '3px 8px',
                background: filterAuthor === a ? `${getAuthorColor(a)}11` : 'transparent',
                color: filterAuthor === a ? getAuthorColor(a) : '#444',
                borderColor: filterAuthor === a ? `${getAuthorColor(a)}44` : '#111',
                flexShrink: 0,
              }}>{a}</button>
            ))}
          </div>
        )}
      </div>

      {/* ─── input panel ─── */}
      {view === 'input' && (
        <div style={{ padding: '18px 16px', background: '#080808', borderBottom: '1px solid #1a1a1a' }}>
          <div style={{ ...s.mono, fontSize: '11px', color: '#555', marginBottom: '12px', letterSpacing: '1px' }}>
            nueva entrada de intel
          </div>

          {/* categories */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', flexWrap: 'wrap' }}>
            {CATEGORIES.map((cat, ci) => (
              <button key={cat.id} onClick={() => setCategory(cat.id)} style={{
                ...s.btn, fontSize: '9px', padding: '4px 10px',
                background: category === cat.id ? `${getAccent(ci)}22` : '#0a0a0a',
                borderColor: category === cat.id ? `${getAccent(ci)}66` : '#1a1a1a',
                color: category === cat.id ? getAccent(ci) : '#555',
              }}>{cat.icon} {cat.label}</button>
            ))}
          </div>

          <textarea
            ref={inputRef}
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="tirá la data acá..."
            style={{
              ...s.input, minHeight: '90px', resize: 'vertical',
              lineHeight: '1.7', marginBottom: '6px',
            }}
          />

          <input
            value={source}
            onChange={e => setSource(e.target.value)}
            placeholder="fuente (libro, podcast, persona...)"
            style={{
              ...s.input, ...s.jet, fontSize: '11px', color: '#999', marginBottom: '14px',
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setView('feed')} style={s.btn}>cancelar</button>
            <button
              onClick={addEntry}
              disabled={!content.trim() || saving}
              style={{
                ...s.mono, padding: '6px 18px',
                background: content.trim() ? '#ff6b35' : '#1a1a1a',
                border: 'none', color: content.trim() ? '#000' : '#333',
                fontSize: '11px', fontWeight: 700, cursor: content.trim() ? 'pointer' : 'default',
                letterSpacing: '1px',
              }}
            >
              {saving ? 'guardando...' : 'guardar'}
            </button>
          </div>
        </div>
      )}

      {/* ─── feed ─── */}
      {loading ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', ...s.jet, fontSize: '11px', color: '#333' }}>
          cargando intel...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ ...s.serif, fontSize: '22px', color: '#222', marginBottom: '10px' }}>
            {entries.length === 0 ? 'feed vacío' : 'nada acá'}
          </div>
          <div style={{ ...s.jet, fontSize: '10px', color: '#333', lineHeight: '1.8' }}>
            {entries.length === 0 ? 'empezá a cargar data que te cope.' : 'probá otro filtro.'}
          </div>
        </div>
      ) : (
        <div>
          {filtered.map((entry, i) => (
            <IntelCard
              key={entry.id}
              entry={entry}
              index={i}
              onDelete={deleteEntry}
              onExpand={expandEntry}
              expanding={expanding}
              currentUser={user}
            />
          ))}
        </div>
      )}

      {/* footer spacer */}
      <div style={{ height: '60px' }} />
    </div>
  )
}
