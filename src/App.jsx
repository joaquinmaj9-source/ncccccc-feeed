import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from './lib/supabase'

// ─── constants ───
const CATEGORIES = [
  { id: 'cita', label: 'cita', icon: '☽' },
  { id: 'cultura', label: 'cultura', icon: '◈' },
  { id: 'idea', label: 'idea', icon: '✦' },
  { id: 'dato', label: 'dato', icon: '⬡' },
  { id: 'concepto', label: 'concepto', icon: '◇' },
  { id: 'link', label: 'link', icon: '∞' },
]

const ACCENTS = [
  '#e8a0ff', '#ff6b35', '#00e5a0', '#ff3366',
  '#ffd166', '#4cc9f0', '#c77dff', '#38b000',
  '#fb5607', '#3a86ff',
]

const GLYPHS = ['◯', '△', '☽', '✦', '⬡', '◇', '∞', '⊕', '⟐', '⌬', '⏣', '⎔']

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
function getGlyph(i) { return GLYPHS[i % GLYPHS.length] }

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

const NOISE_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`

const s = {
  mono: { fontFamily: "'Space Mono', monospace" },
  jet: { fontFamily: "'JetBrains Mono', monospace" },
  serif: { fontFamily: "'Instrument Serif', serif" },
  btn: {
    background: 'none', border: '1px solid #2a2a2a', color: '#777',
    fontFamily: "'JetBrains Mono', monospace", fontSize: '10px',
    padding: '5px 12px', cursor: 'pointer', letterSpacing: '1.5px',
    textTransform: 'lowercase', transition: 'all 0.3s ease',
  },
  input: {
    width: '100%', background: '#08080c', border: '1px solid #1a1a2a',
    color: '#e0e0e0', fontFamily: "'Space Mono', monospace", fontSize: '13px',
    padding: '12px 14px', outline: 'none', textTransform: 'lowercase',
    transition: 'border-color 0.3s ease',
  },
}

const GLOBAL_CSS = `
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes pulse { 0%, 100% { opacity: 0.7; } 50% { opacity: 1; } }
  @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
  .intel-card:hover { background: #0c0c14 !important; }
  .expand-btn:hover { border-color: #3a2a4a !important; color: #9a6acc !important; background: #0d0a14 !important; }
  .reexpand-btn:hover { color: #5a7a5a !important; }
  .author-img { transition: filter 0.4s ease; }
  .author-img:hover { filter: grayscale(0%) contrast(1.05) !important; }
`

// ─── glyph ring ───
function GlyphRing({ size = 120, opacity = 0.03, speed = 60 }) {
  return (
    <div style={{
      position: 'absolute', width: size, height: size,
      opacity, pointerEvents: 'none',
      animation: `spin ${speed}s linear infinite`,
    }}>
      {GLYPHS.slice(0, 8).map((g, i) => {
        const angle = (i / 8) * 360
        const rad = angle * Math.PI / 180
        const x = 50 + 42 * Math.cos(rad)
        const y = 50 + 42 * Math.sin(rad)
        return (
          <span key={i} style={{
            position: 'absolute', left: `${x}%`, top: `${y}%`,
            transform: 'translate(-50%, -50%)',
            fontSize: size * 0.12, color: '#fff', ...s.mono,
          }}>{g}</span>
        )
      })}
    </div>
  )
}

// ─── autor image desde wikipedia ───
function AuthorImage({ name, accent, size = 44, round = false }) {
  const [imgUrl, setImgUrl] = useState(null)

  useEffect(() => {
    if (!name) return
    const query = encodeURIComponent(name.trim())
    const tryFetch = async () => {
      try {
        // prueba en inglés primero, luego español
        for (const lang of ['en', 'es']) {
          const r = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${query}`)
          if (r.ok) {
            const d = await r.json()
            if (d?.thumbnail?.source) { setImgUrl(d.thumbnail.source); return }
          }
        }
      } catch {}
    }
    tryFetch()
  }, [name])

  if (!imgUrl) return null

  return (
    <img
      src={imgUrl}
      alt={name}
      className="author-img"
      style={{
        width: size, height: size, objectFit: 'cover', flexShrink: 0,
        borderRadius: round ? '50%' : '2px',
        border: `1px solid ${accent}33`,
        filter: 'grayscale(35%) contrast(1.1)',
        boxShadow: `0 0 12px ${accent}15`,
      }}
    />
  )
}

// ─── enrichment badge ───
function EnrichmentBadge({ enrichment }) {
  if (!enrichment) return null
  let data
  try { data = JSON.parse(enrichment) } catch { return null }
  if (!data.found) return null

  return (
    <div style={{
      display: 'flex', gap: '12px', alignItems: 'flex-start',
      padding: '12px', background: '#0c0c14', border: '1px solid #1a1a2e',
      marginTop: '12px',
    }}>
      {data.image && (
        <img src={data.image} alt={data.title} className="author-img"
          style={{ width: '48px', height: '48px', objectFit: 'cover',
            border: '1px solid #2a2a3a', flexShrink: 0,
            filter: 'grayscale(30%) contrast(1.1)' }} />
      )}
      <div style={{ minWidth: 0 }}>
        {data.title && (
          <div style={{ ...s.jet, fontSize: '10px', color: '#c77dff', letterSpacing: '1px', marginBottom: '4px' }}>
            {data.title.toLowerCase()}
          </div>
        )}
        {data.extract && (
          <div style={{ ...s.mono, fontSize: '10px', color: '#666', lineHeight: '1.6',
            overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
            {data.extract}
          </div>
        )}
        {data.url && (
          <a href={data.url} target="_blank" rel="noopener noreferrer"
            style={{ ...s.jet, fontSize: '8px', color: '#555', letterSpacing: '1px',
              marginTop: '4px', display: 'inline-block', textDecoration: 'none' }}>
            ∞ wikipedia →
          </a>
        )}
      </div>
    </div>
  )
}

// ─── expansion panel ───
function ExpansionPanel({ expansion, accent, onReExpand, expanding, entryId }) {
  const [show, setShow] = useState(false)

  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          onClick={() => setShow(v => !v)}
          style={{
            ...s.btn, fontSize: '9px',
            borderColor: show ? `${accent}55` : `${accent}22`,
            color: show ? `${accent}dd` : `${accent}66`,
            background: show ? `${accent}0a` : 'transparent',
          }}
        >
          {show ? '△ colapsar' : '▽ expansión claude'}
        </button>
        <button
          className="reexpand-btn"
          onClick={() => onReExpand(entryId)}
          disabled={expanding === entryId}
          title="regenerar"
          style={{ ...s.btn, fontSize: '8px', padding: '3px 7px', borderColor: '#1a1a1a', color: '#2a3a2a' }}
        >
          {expanding === entryId ? '⟐' : '↺'}
        </button>
      </div>

      {show && (
        <div style={{
          marginTop: '12px', padding: '18px 20px',
          background: '#060610',
          borderLeft: `2px solid ${accent}1a`,
          animation: 'fadeSlideIn 0.25s ease',
        }}>
          <div style={{ ...s.jet, fontSize: '7.5px', color: `${accent}44`, letterSpacing: '2.5px', marginBottom: '12px' }}>
            ✦ intel · expandido
          </div>
          <div style={{
            ...s.mono, fontSize: '12px', color: '#8a8aaa',
            lineHeight: '2.1', textTransform: 'lowercase', whiteSpace: 'pre-wrap',
          }}>
            {expansion}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── intel card ───
function IntelCard({ entry, index, onDelete, onExpand, expanding, currentUser }) {
  const accent = getAccent(index)
  const authorColor = getAuthorColor(entry.author)
  const cat = CATEGORIES.find(c => c.id === entry.category) || CATEGORIES[3]
  const glyph = getGlyph(index)
  const isCita = entry.category === 'cita'

  return (
    <div className="intel-card" style={{
      background: '#0a0a10',
      borderLeft: `2px solid ${accent}44`,
      padding: '24px 20px 20px',
      marginBottom: '1px', position: 'relative',
      transition: 'background 0.3s ease',
      borderBottom: '1px solid #0f0f18',
    }}>
      {/* header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ ...s.jet, fontSize: '9px', color: authorColor, background: `${authorColor}0a`, padding: '2px 8px', border: `1px solid ${authorColor}22`, letterSpacing: '1.5px' }}>
            {entry.author}
          </span>
          <span style={{ ...s.jet, fontSize: '9px', color: `${accent}aa`, letterSpacing: '1.5px' }}>
            {cat.icon} {cat.label}
          </span>
          <span style={{ ...s.jet, fontSize: '8px', color: '#333', letterSpacing: '1px' }}>
            {isToday(entry.created_at) ? formatTime(entry.created_at) : formatDate(entry.created_at)}
          </span>
        </div>
        {entry.author === currentUser && (
          <button onClick={() => onDelete(entry.id)}
            style={{ background: 'none', border: 'none', color: '#1a1a1a', cursor: 'pointer', fontSize: '14px', ...s.mono, padding: '2px 6px', transition: 'color 0.2s' }}
            onMouseEnter={e => e.target.style.color = '#ff3366'}
            onMouseLeave={e => e.target.style.color = '#1a1a1a'}
            title="eliminar">×</button>
        )}
      </div>

      {/* fuente + imagen wikipedia */}
      {entry.source && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <AuthorImage name={entry.source} accent={accent} size={36} round={isCita} />
          <div style={{ ...s.jet, fontSize: '9px', color: '#4a4a5a', letterSpacing: '1px' }}>
            ↳ {entry.source}
          </div>
        </div>
      )}

      {/* content */}
      <div style={{
        fontFamily: isCita ? "'Instrument Serif', serif" : "'Space Mono', monospace",
        fontSize: isCita ? '18px' : '13px',
        fontStyle: isCita ? 'italic' : 'normal',
        color: '#d0d0d8', lineHeight: '1.85', textTransform: 'lowercase',
        letterSpacing: isCita ? '0.5px' : '0px',
      }}>
        {isCita && <span style={{ color: accent, fontSize: '22px', marginRight: '6px', textShadow: `0 0 20px ${accent}33` }}>☽</span>}
        {entry.content}
      </div>

      <EnrichmentBadge enrichment={entry.enrichment} />

      {/* expansion existente */}
      {entry.expansion && (
        <ExpansionPanel expansion={entry.expansion} accent={accent} onReExpand={onExpand} expanding={expanding} entryId={entry.id} />
      )}

      {/* botón expandir (si no hay expansion todavía) */}
      {!entry.expansion && (
        <button
          className="expand-btn"
          onClick={() => onExpand(entry.id)}
          disabled={expanding === entry.id}
          style={{
            ...s.btn, marginTop: '16px', fontSize: '9px',
            borderStyle: 'dashed', padding: '6px 16px', letterSpacing: '2px',
            borderColor: expanding === entry.id ? `${accent}44` : '#1e1e2e',
            color: expanding === entry.id ? `${accent}99` : '#3a3a5a',
          }}
        >
          {expanding === entry.id
            ? <span style={{ animation: 'blink 1.2s infinite' }}>⟐ expandiendo...</span>
            : '✦ expandir con ia'}
        </button>
      )}

      {/* glyph watermark */}
      <div style={{ position: 'absolute', top: '18px', right: '18px', fontSize: '30px', color: `${accent}06`, lineHeight: 1, pointerEvents: 'none' }}>
        {glyph}
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
  const glyph = getGlyph(idx)
  const isCita = entry.category === 'cita'

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
    <div style={{ position: 'fixed', inset: 0, background: '#05050a', zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: NOISE_SVG, backgroundRepeat: 'repeat', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
        <GlyphRing size={400} opacity={0.02} speed={120} />
      </div>

      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: '#111', zIndex: 2 }}>
        <div style={{ height: '100%', background: `linear-gradient(90deg, ${accent}, ${accent}44)`, transition: 'width 0.4s ease', width: `${((idx + 1) / entries.length) * 100}%`, boxShadow: `0 0 10px ${accent}44` }} />
      </div>

      <button onClick={onClose} style={{ position: 'absolute', top: '14px', right: '14px', ...s.btn, zIndex: 10 }}>✕</button>

      <div style={{ position: 'absolute', top: '14px', left: '14px', display: 'flex', gap: '8px', alignItems: 'center', zIndex: 2 }}>
        <span style={{ ...s.jet, fontSize: '9px', color: authorColor, letterSpacing: '1.5px' }}>{entry.author}</span>
        <span style={{ ...s.jet, fontSize: '9px', color: `${accent}88`, letterSpacing: '1.5px' }}>{cat.icon} {cat.label}</span>
        <span style={{ ...s.jet, fontSize: '9px', color: '#2a2a2a' }}>{idx + 1}/{entries.length}</span>
      </div>

      <div style={{ maxWidth: '560px', textAlign: 'center', zIndex: 2 }}>
        {entry.source && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px', gap: '8px' }}>
            <AuthorImage name={entry.source} accent={accent} size={64} round={isCita} />
            <div style={{ ...s.jet, fontSize: '9px', color: '#555', letterSpacing: '1px' }}>— {entry.source} —</div>
          </div>
        )}

        <div style={{
          fontFamily: isCita ? "'Instrument Serif', serif" : "'Space Mono', monospace",
          fontSize: isCita ? '24px' : '16px',
          fontStyle: isCita ? 'italic' : 'normal',
          color: '#e0e0e8', lineHeight: '1.9', textTransform: 'lowercase', letterSpacing: '0.5px',
        }}>
          {entry.content}
        </div>

        {entry.expansion && (
          <div style={{ marginTop: '28px' }}>
            <button onClick={() => setShowExp(!showExp)} style={{ ...s.btn, borderColor: `${accent}22`, color: `${accent}88` }}>
              {showExp ? 'ocultar' : '✦ ver expansión'}
            </button>
            {showExp && (
              <div style={{ marginTop: '16px', ...s.mono, fontSize: '11px', color: '#777', lineHeight: '1.9', textAlign: 'left', textTransform: 'lowercase', whiteSpace: 'pre-wrap', animation: 'fadeSlideIn 0.25s ease' }}>
                {entry.expansion}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ position: 'absolute', bottom: '24px', display: 'flex', gap: '16px', zIndex: 2 }}>
        <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}
          style={{ ...s.btn, width: '44px', height: '44px', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, opacity: idx === 0 ? 0.15 : 0.7, borderColor: `${accent}33` }}>←</button>
        <button onClick={() => setIdx(i => Math.min(entries.length - 1, i + 1))} disabled={idx === entries.length - 1}
          style={{ ...s.btn, width: '44px', height: '44px', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, opacity: idx === entries.length - 1 ? 0.15 : 0.7, borderColor: `${accent}33` }}>→</button>
      </div>

      <div style={{ position: 'absolute', bottom: '60px', right: '30px', fontSize: '80px', color: `${accent}04`, lineHeight: 1, pointerEvents: 'none', zIndex: 1 }}>
        {glyph}
      </div>
    </div>
  )
}

// ─── main app ───
export default function App() {
  const [user, setUser] = useState(() => localStorage.getItem('intel-user') || '')
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('feed')
  const [content, setContent] = useState('')
  const [source, setSource] = useState('')
  const [category, setCategory] = useState('dato')
  const [filterCat, setFilterCat] = useState('all')
  const [filterAuthor, setFilterAuthor] = useState('all')
  const [expanding, setExpanding] = useState(null)
  const [expandError, setExpandError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const inputRef = useRef(null)

  const handleLogin = (name) => {
    setUser(name)
    localStorage.setItem('intel-user', name)
  }

  const handleLogout = () => {
    setUser('')
    localStorage.removeItem('intel-user')
  }

  const fetchEntries = useCallback(async () => {
    const { data, error } = await supabase
      .from('entries')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) setEntries(data)
    setLoading(false)
  }, [])

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

  const enrichEntry = async (id, query) => {
    try {
      const res = await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })
      const data = await res.json()
      if (data.found) {
        await supabase.from('entries').update({ enrichment: JSON.stringify(data) }).eq('id', id)
        await fetchEntries()
      }
    } catch (err) {
      console.error('enrich error:', err)
    }
  }

  // ─── publicar entrada ───
  const addEntry = async () => {
    if (!content.trim()) return
    setSaving(true)
    setSaveError(null)

    const { data: inserted, error } = await supabase
      .from('entries')
      .insert({
        content: content.trim().toLowerCase(),
        source: source.trim().toLowerCase() || null,
        category,
        author: user,
      })
      .select()

    if (error) {
      // mostrar el error real para poder debuggear
      console.error('supabase error:', error)
      setSaveError(error.message || 'no se pudo publicar')
      setSaving(false)
      return
    }

    if (inserted && inserted[0]) {
      if (source.trim()) enrichEntry(inserted[0].id, source.trim())
      setContent('')
      setSource('')
      setSaveError(null)
      setView('feed')
      await fetchEntries()
    }

    setSaving(false)
  }

  const deleteEntry = async (id) => {
    await supabase.from('entries').delete().eq('id', id)
    await fetchEntries()
  }

  // ─── expandir / re-expandir ───
  const expandEntry = async (id) => {
    setExpanding(id)
    setExpandError(null)
    const entry = entries.find(e => e.id === id)
    if (!entry) { setExpanding(null); return }

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
      } else {
        setExpandError(id)
        setTimeout(() => setExpandError(null), 5000)
      }
    } catch (err) {
      console.error('expand error:', err)
      setExpandError(id)
      setTimeout(() => setExpandError(null), 5000)
    }

    setExpanding(null)
  }

  if (!user) return <LoginScreen onLogin={handleLogin} />

  const authors = [...new Set(entries.map(e => e.author))]
  let filtered = entries
  if (filterCat !== 'all') filtered = filtered.filter(e => e.category === filterCat)
  if (filterAuthor !== 'all') filtered = filtered.filter(e => e.author === filterAuthor)
  const todayCount = entries.filter(e => isToday(e.created_at)).length

  if (view === 'slides' && filtered.length > 0) {
    return <SlideView entries={filtered} onClose={() => setView('feed')} />
  }

  return (
    <div style={{ minHeight: '100vh', maxWidth: '640px', margin: '0 auto', background: '#07070c', position: 'relative' }}>
      <style>{GLOBAL_CSS}</style>

      <div style={{ position: 'fixed', inset: 0, backgroundImage: NOISE_SVG, backgroundRepeat: 'repeat', pointerEvents: 'none', zIndex: 0 }} />

      {/* ─── header ─── */}
      <div style={{ padding: '20px 16px 0', borderBottom: '1px solid #0f0f18', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px', color: '#e8a0ff', textShadow: '0 0 15px #e8a0ff33' }}>◇</span>
              <h1 style={{ ...s.serif, fontSize: '24px', fontWeight: 400, color: '#d0d0d8', letterSpacing: '2px', margin: 0 }}>intel feed</h1>
            </div>
            <div style={{ ...s.jet, fontSize: '8px', color: '#3a3a4a', marginTop: '4px', letterSpacing: '2px' }}>
              {todayCount} hoy · {entries.length} total · {authors.length} agente{authors.length !== 1 ? 's' : ''}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {filtered.length > 0 && (
              <button onClick={() => setView('slides')} style={{ ...s.btn, fontSize: '9px' }}>▶ slides</button>
            )}
            <button
              onClick={() => { setView('input'); setTimeout(() => inputRef.current?.focus(), 100) }}
              style={{ ...s.mono, background: 'linear-gradient(135deg, #e8a0ff 0%, #ff6b35 100%)', border: 'none', color: '#000', fontSize: '10px', fontWeight: 700, padding: '6px 14px', cursor: 'pointer', letterSpacing: '2px', textTransform: 'lowercase' }}
            >+ nueva</button>
          </div>
        </div>

        {/* user bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ ...s.jet, fontSize: '9px', color: getAuthorColor(user), letterSpacing: '1.5px' }}>⊕ {user}</span>
          <button onClick={handleLogout} style={{ ...s.btn, fontSize: '8px', padding: '2px 8px', border: 'none', color: '#2a2a2a' }}>salir</button>
        </div>

        {/* filtros categoría */}
        <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '8px' }}>
          <button onClick={() => setFilterCat('all')} style={{ ...s.btn, fontSize: '8px', padding: '3px 8px', background: filterCat === 'all' ? '#12121a' : 'transparent', color: filterCat === 'all' ? '#aaa' : '#3a3a4a', borderColor: filterCat === 'all' ? '#2a2a3a' : '#12121a', flexShrink: 0 }}>todo</button>
          {CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setFilterCat(cat.id)} style={{ ...s.btn, fontSize: '8px', padding: '3px 8px', background: filterCat === cat.id ? '#12121a' : 'transparent', color: filterCat === cat.id ? '#aaa' : '#3a3a4a', borderColor: filterCat === cat.id ? '#2a2a3a' : '#12121a', flexShrink: 0, whiteSpace: 'nowrap' }}>{cat.icon} {cat.label}</button>
          ))}
        </div>

        {/* filtros autor */}
        {authors.length > 1 && (
          <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '10px' }}>
            <button onClick={() => setFilterAuthor('all')} style={{ ...s.btn, fontSize: '8px', padding: '3px 8px', background: filterAuthor === 'all' ? '#12121a' : 'transparent', color: filterAuthor === 'all' ? '#aaa' : '#3a3a4a', borderColor: filterAuthor === 'all' ? '#2a2a3a' : '#12121a', flexShrink: 0 }}>todos</button>
            {authors.map(a => (
              <button key={a} onClick={() => setFilterAuthor(a)} style={{ ...s.btn, fontSize: '8px', padding: '3px 8px', background: filterAuthor === a ? `${getAuthorColor(a)}0a` : 'transparent', color: filterAuthor === a ? getAuthorColor(a) : '#3a3a4a', borderColor: filterAuthor === a ? `${getAuthorColor(a)}33` : '#12121a', flexShrink: 0 }}>{a}</button>
            ))}
          </div>
        )}
      </div>

      {/* ─── panel de nueva entrada ─── */}
      {view === 'input' && (
        <div style={{ padding: '18px 16px', background: '#08080e', borderBottom: '1px solid #12121a', position: 'relative', zIndex: 1 }}>
          <div style={{ ...s.mono, fontSize: '10px', color: '#4a4a5a', marginBottom: '12px', letterSpacing: '2px' }}>
            ⟐ nueva entrada de intel
          </div>

          <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', flexWrap: 'wrap' }}>
            {CATEGORIES.map((cat, ci) => (
              <button key={cat.id} onClick={() => setCategory(cat.id)} style={{ ...s.btn, fontSize: '9px', padding: '4px 10px', background: category === cat.id ? `${getAccent(ci)}11` : '#0a0a12', borderColor: category === cat.id ? `${getAccent(ci)}44` : '#1a1a2a', color: category === cat.id ? getAccent(ci) : '#4a4a5a' }}>{cat.icon} {cat.label}</button>
            ))}
          </div>

          <textarea
            ref={inputRef}
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="tirá la data acá..."
            style={{ ...s.input, minHeight: '90px', resize: 'vertical', lineHeight: '1.7', marginBottom: '6px' }}
            onFocus={e => e.target.style.borderColor = '#2a2a4a'}
            onBlur={e => e.target.style.borderColor = '#1a1a2a'}
          />

          <input
            value={source}
            onChange={e => setSource(e.target.value)}
            placeholder="fuente / autor (se busca imagen automáticamente)..."
            style={{ ...s.input, ...s.jet, fontSize: '11px', color: '#888', marginBottom: '14px' }}
            onFocus={e => e.target.style.borderColor = '#2a2a4a'}
            onBlur={e => e.target.style.borderColor = '#1a1a2a'}
          />

          {/* error de guardado */}
          {saveError && (
            <div style={{ ...s.jet, fontSize: '9px', color: '#ff4466', background: '#1a0810', border: '1px solid #ff336622', padding: '8px 12px', marginBottom: '12px', letterSpacing: '0.5px', lineHeight: '1.5' }}>
              ✕ {saveError}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={() => { setView('feed'); setSaveError(null) }} style={s.btn}>cancelar</button>
            <button
              onClick={addEntry}
              disabled={!content.trim() || saving}
              style={{ ...s.mono, padding: '7px 20px', background: content.trim() ? 'linear-gradient(135deg, #e8a0ff 0%, #ff6b35 100%)' : '#1a1a1a', border: 'none', color: content.trim() ? '#000' : '#333', fontSize: '10px', fontWeight: 700, cursor: content.trim() ? 'pointer' : 'default', letterSpacing: '2px' }}
            >
              {saving ? '⟐ publicando...' : '✦ publicar'}
            </button>
          </div>
        </div>
      )}

      {/* ─── feed ─── */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', ...s.jet, fontSize: '10px', color: '#2a2a3a', letterSpacing: '2px' }}>
            ⟐ cargando intel...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', color: '#1a1a2a', marginBottom: '12px' }}>◇</div>
            <div style={{ ...s.serif, fontSize: '20px', color: '#1a1a2a', marginBottom: '8px' }}>
              {entries.length === 0 ? 'feed vacío' : 'nada acá'}
            </div>
            <div style={{ ...s.jet, fontSize: '9px', color: '#2a2a3a', lineHeight: '2', letterSpacing: '1px' }}>
              {entries.length === 0 ? 'empezá a cargar data que te cope.' : 'probá otro filtro.'}
            </div>
          </div>
        ) : (
          <div>
            {/* toast de error al expandir */}
            {expandError && (
              <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', background: '#120810', border: '1px solid #ff336633', ...s.jet, fontSize: '9px', color: '#ff4466', padding: '8px 18px', letterSpacing: '1px', zIndex: 50, animation: 'fadeSlideIn 0.2s ease', whiteSpace: 'nowrap' }}>
                ✕ no se pudo expandir — revisá la api key en vercel
              </div>
            )}
            {filtered.map((entry, i) => (
              <IntelCard key={entry.id} entry={entry} index={i} onDelete={deleteEntry} onExpand={expandEntry} expanding={expanding} currentUser={user} />
            ))}
          </div>
        )}
      </div>

      <div style={{ height: '60px' }} />
    </div>
  )
}

// ─── login screen ───
function LoginScreen({ onLogin }) {
  const [name, setName] = useState('')

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', background: '#05050a', position: 'relative', overflow: 'hidden' }}>
      <style>{GLOBAL_CSS}</style>
      <div style={{ position: 'absolute', top: '10%', left: '15%' }}><GlyphRing size={200} opacity={0.04} speed={80} /></div>
      <div style={{ position: 'absolute', bottom: '5%', right: '10%' }}><GlyphRing size={150} opacity={0.03} speed={120} /></div>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: NOISE_SVG, backgroundRepeat: 'repeat', pointerEvents: 'none', zIndex: 1 }} />

      <div style={{ textAlign: 'center', maxWidth: '360px', width: '100%', zIndex: 2 }}>
        <div style={{ fontSize: '48px', color: '#e8a0ff', marginBottom: '16px', textShadow: '0 0 30px #e8a0ff44, 0 0 60px #e8a0ff22', animation: 'pulse 4s ease-in-out infinite' }}>◇</div>
        <h1 style={{ ...s.serif, fontSize: '38px', fontWeight: 400, color: '#e0e0e0', marginBottom: '4px', letterSpacing: '3px' }}>intel feed</h1>
        <p style={{ ...s.jet, fontSize: '9px', color: '#555', letterSpacing: '3px', marginBottom: '48px' }}>⟐ dossier colectivo de conocimiento ⟐</p>

        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && name.trim() && onLogin(name.trim().toLowerCase())}
          placeholder="identificate..."
          style={{ ...s.input, textAlign: 'center', fontSize: '15px', borderColor: '#2a2a3a', marginBottom: '16px', background: '#0a0a12' }}
          autoFocus
        />

        <button
          onClick={() => name.trim() && onLogin(name.trim().toLowerCase())}
          disabled={!name.trim()}
          style={{ ...s.mono, width: '100%', padding: '13px', background: name.trim() ? 'linear-gradient(135deg, #e8a0ff 0%, #ff6b35 100%)' : '#1a1a1a', border: 'none', color: name.trim() ? '#000' : '#333', fontSize: '12px', fontWeight: 700, cursor: name.trim() ? 'pointer' : 'default', letterSpacing: '3px', textTransform: 'lowercase' }}
        >
          entrar al feed
        </button>

        <p style={{ ...s.jet, fontSize: '8px', color: '#333', marginTop: '24px', letterSpacing: '2px' }}>sin contraseña · solo tu nombre · confiamos</p>
      </div>
    </div>
  )
}
