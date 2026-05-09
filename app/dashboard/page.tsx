'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Logo from '@/components/Logo'
import Drawer from '@/components/Drawer'
import { createClient } from '@/lib/supabase'
import { formatRelativeTime } from '@/lib/utils'
import type { User } from '@supabase/supabase-js'
import type { Bracelet, Scan } from '@/types'

export const dynamic = 'force-dynamic'

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [bracelets, setBracelets] = useState<Bracelet[]>([])
  const [scans, setScans] = useState<Scan[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showActivation, setShowActivation] = useState(false)
  const [showScansPanel, setShowScansPanel] = useState(false)
  const [headerHidden, setHeaderHidden] = useState(false)
  const [activationCode, setActivationCode] = useState('')
  const [nomProfil, setNomProfil] = useState('')
  const [activating, setActivating] = useState(false)
  const [activationError, setActivationError] = useState('')
  const toastTimer = useRef<NodeJS.Timeout>()
  const router = useRouter()
  const supabase = createClient()

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }, [])

  useEffect(() => {
    let braceletIds: string[] = []

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/inscription'); return }
      setUser(user)

      const { data: b } = await supabase
        .from('bracelets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
      setBracelets(b ?? [])

      if (b && b.length > 0) {
        braceletIds = b.map(br => br.bracelet_id)
        await refreshScans(braceletIds)
      }

      setLoading(false)
    }

    async function refreshScans(ids: string[]) {
      if (ids.length === 0) return
      const { data: s } = await supabase
        .from('scans')
        .select('*')
        .in('bracelet_id', ids)
        .order('scanned_at', { ascending: false })
        .limit(20)
      setScans(s ?? [])
    }

    // Rafraîchit les scans quand l'utilisateur revient sur l'onglet
    function onVisible() {
      if (document.visibilityState === 'visible' && braceletIds.length > 0) {
        refreshScans(braceletIds)
      }
    }

    load()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [router, supabase])

  async function handleActivation(e: React.FormEvent) {
    e.preventDefault()
    setActivating(true)
    setActivationError('')
    try {
      const res = await fetch('/api/activate-bracelet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: activationCode, nom_profil: nomProfil }),
      })
      const data = await res.json()
      if (!res.ok) {
        setActivationError(data.error || 'Erreur lors de l\'activation')
        return
      }
      setShowActivation(false)
      setActivationCode('')
      setNomProfil('')
      showToast(`✅ Bracelet ${data.gamme} activé !`)
      const { data: b } = await supabase
        .from('bracelets')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: true })
      setBracelets(b ?? [])
    } finally {
      setActivating(false)
    }
  }

  // Cache le header au scroll vers le bas
  useEffect(() => {
    let lastY = window.scrollY
    function onScroll() {
      const y = window.scrollY
      setHeaderHidden(y > lastY && y > 60)
      lastY = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const prenom = (user?.user_metadata?.prenom as string) || user?.email?.split('@')[0] || 'vous'

  const scansCeMois = scans.filter(s => {
    const d = new Date(s.scanned_at)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  if (loading) {
    return (
      <div style={{ background: 'var(--cream)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: 32, height: 32, borderTopColor: 'var(--pulse)', borderColor: 'var(--stone)' }} />
      </div>
    )
  }

  return (
    <>
      <header className={`app-header${headerHidden ? ' app-header-hidden' : ''}`}>
        <a className="app-logo" href="https://pulsmee.fr" target="_blank" rel="noopener noreferrer">
          <Logo size={20} />
          <span className="app-logo-text">Puls<span>mee</span></span>
        </a>
        <button className={`hamburger${drawerOpen ? ' is-open' : ''}`} onClick={() => setDrawerOpen(true)} aria-label="Ouvrir le menu">
          <div className="h-line" /><div className="h-line" /><div className="h-line" />
        </button>
      </header>

      <div className="page-wrap">
        <div className="page-content">
          <div className="pg-eyebrow">Bonjour {prenom} 👋</div>
          <h1 className="pg-title">Votre espace <em>Pulsmee</em></h1>
          <p className="pg-sub">
            {bracelets.length === 0
              ? 'Activez votre premier bracelet pour commencer.'
              : `${bracelets.length} bracelet${bracelets.length > 1 ? 's' : ''} actif${bracelets.length > 1 ? 's' : ''} sur votre compte.`}
          </p>

          {/* Onboarding — affiché si aucun bracelet ou puce non programmée */}
          {(bracelets.length === 0 || !bracelets[0]?.puce_programmee) && (() => {
            const step1Done = bracelets.length > 0
            const step2Done = bracelets.length > 0
            const step3Done = bracelets[0]?.puce_programmee === true
            const steps = [
              { label: 'Activer ton bracelet', done: step1Done, action: !step1Done ? <button onClick={() => setShowActivation(true)} style={{ background: 'var(--pulse)', color: 'white', border: 'none', borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Activer →</button> : null },
              { label: 'Remplir ta fiche médicale', done: step2Done, action: step1Done && !step2Done ? <button onClick={() => bracelets[0] && router.push(`/fiche/${bracelets[0].bracelet_id}`)} style={{ background: 'var(--pulse)', color: 'white', border: 'none', borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Remplir →</button> : null },
              { label: 'Programmer ta puce NFC', done: step3Done, action: step2Done && !step3Done ? <button onClick={() => bracelets[0] && router.push(`/fiche/${bracelets[0].bracelet_id}#nfc`)} style={{ background: 'var(--pulse)', color: 'white', border: 'none', borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Programmer →</button> : null },
            ]
            const currentStep = steps.findIndex(s => !s.done)
            return (
              <div style={{ background: 'white', borderRadius: 16, padding: 16, marginBottom: 20, border: '1px solid var(--stone)' }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, color: 'var(--ink)' }}>🚀 Premiers pas</div>
                {steps.map((s, i) => {
                  const isCurrent = i === currentStep
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: i < steps.length - 1 ? 12 : 0 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700, flexShrink: 0,
                        background: s.done ? '#22C55E' : isCurrent ? '#F97316' : '#E5E7EB',
                        color: s.done || isCurrent ? 'white' : '#9CA3AF',
                      }}>
                        {s.done ? '✓' : i + 1}
                      </div>
                      <div style={{ flex: 1, fontSize: 13, color: s.done ? 'var(--ink-mid)' : 'var(--ink)', textDecoration: s.done ? 'line-through' : 'none' }}>
                        {s.label}
                      </div>
                      {s.action}
                    </div>
                  )
                })}
              </div>
            )
          })()}

          <div className="stats-row">
            <div className="stat-card">
              <div className="s-label">Bracelets</div>
              <div className="s-val" style={{ color: 'var(--pulse)' }}>{bracelets.length}</div>
              <div className="s-sub">Sur ce compte</div>
            </div>
            <div className={`stat-card stat-card-btn${showScansPanel ? ' stat-card-active' : ''}`} onClick={() => setShowScansPanel(v => !v)}>
              <div className="s-label">Scans {showScansPanel ? '▲' : '▼'}</div>
              <div className="s-val" style={{ color: '#3B82F6' }}>{scansCeMois}</div>
              <div className="s-sub">Ce mois</div>
              {showScansPanel && (
                <div className="scans-inline" onClick={e => e.stopPropagation()}>
                  {scans.length === 0 ? (
                    <div className="scans-inline-empty">Aucun scan</div>
                  ) : scans.map((scan, i) => {
                    const br = bracelets.find(b => b.bracelet_id === scan.bracelet_id)
                    const mapsUrl = (scan.latitude != null && scan.longitude != null)
                      ? `https://www.google.com/maps?q=${scan.latitude},${scan.longitude}`
                      : null
                    return (
                      <div key={scan.id} className={`scans-inline-row${i > 0 ? ' scans-inline-border' : ''}`}>
                        <div className="scans-inline-info">
                          <span className="scans-inline-date">
                            {new Date(scan.scanned_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {br && <span className="scans-inline-br">{br.nom_profil}</span>}
                        </div>
                        {mapsUrl
                          ? <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="scans-inline-loc" onClick={e => e.stopPropagation()}>📍</a>
                          : <span className="scans-inline-rel">{formatRelativeTime(scan.scanned_at)}</span>
                        }
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="stat-card">
              <div className="s-label">Dernière activité</div>
              <div className="s-val" style={{ fontSize: 13, fontFamily: 'inherit', color: 'var(--ink-mid)' }}>
                {scans[0] ? formatRelativeTime(scans[0].scanned_at) : '—'}
              </div>
              <div className="s-sub">Dernier scan</div>
            </div>
          </div>

          {/* Liste des bracelets */}
          {bracelets.length === 0 ? (
            <div className="empty-bracelets">
              <div className="eb-icon">⌚</div>
              <div className="eb-title">Aucun bracelet activé</div>
              <p className="eb-sub">Activez votre bracelet Pulsmee avec le code reçu dans votre commande.</p>
              <button className="btn-activate-big" onClick={() => setShowActivation(true)}>
                ➕ Activer mon bracelet
              </button>
            </div>
          ) : (
            <>
              <div className="bracelet-list">
                {bracelets.map(br => {
                  const brScans = scans.filter(s => s.bracelet_id === br.bracelet_id)
                  const lastScan = brScans[0]
                  return (
                    <div key={br.id} className="bracelet-card">
                      <div className="bc-header">
                        <div className="bc-icon">⌚</div>
                        <div className="bc-info">
                          <div className="bc-name">{br.nom_profil}</div>
                          <div className="bc-meta">
                            Pulsmee {br.gamme}
                            <span className="bc-id">{br.bracelet_id}</span>
                          </div>
                        </div>
                        <div className={`bc-status${br.puce_programmee ? ' active' : ''}`}>
                          <div className="bc-dot" />
                          {br.puce_programmee ? 'Actif' : 'À programmer'}
                        </div>
                      </div>
                      <div className="bc-stats">
                        <div className="bc-stat">
                          <span className="bc-stat-val">{brScans.length}</span>
                          <span className="bc-stat-lbl">scans au total</span>
                        </div>
                        <div className="bc-stat">
                          <span className="bc-stat-val">{lastScan ? formatRelativeTime(lastScan.scanned_at) : '—'}</span>
                          <span className="bc-stat-lbl">dernier scan</span>
                        </div>
                      </div>
                      <div className="bc-actions">
                        <button className="bc-btn primary" onClick={() => router.push(`/fiche/${br.bracelet_id}`)}>
                          📋 Modifier la fiche
                        </button>
                        <button className="bc-btn" onClick={() => router.push(`/p/${br.bracelet_id}`)}>
                          👁️ Voir la fiche
                        </button>
                        <button className="bc-btn" onClick={() => router.push(`/fiche/${br.bracelet_id}#nfc`)}>
                          📡 Programmer la puce
                        </button>
                        <button className="bc-btn" onClick={() => {
                          navigator.clipboard.writeText(`https://pulsmee.fr/p/${br.bracelet_id}`)
                          showToast('🔗 Lien copié !')
                        }}>
                          🔗 Copier le lien
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              <button className="btn-add-bracelet" onClick={() => setShowActivation(true)}>
                ➕ Ajouter un bracelet
              </button>
            </>
          )}

          {/* Activité récente */}
          {scans.length > 0 && (
            <div className="card" style={{ marginTop: 20 }}>
              <div className="card-head">
                <div className="card-title">⚡ Activité récente</div>
              </div>
              <div className="card-body">
                {scans.slice(0, 8).map(scan => {
                  const scanDate = new Date(scan.scanned_at)
                  const formattedTime = scanDate.toLocaleString('fr-FR', {
                    hour: '2-digit', minute: '2-digit',
                    day: '2-digit', month: '2-digit', year: 'numeric',
                  }).replace(',', ' ·')
                  const mapsUrl = (scan.latitude != null && scan.longitude != null)
                    ? `https://www.google.com/maps?q=${scan.latitude},${scan.longitude}`
                    : null
                  return (
                    <div key={scan.id} className="act-item">
                      <div className="ai-ico" style={{ background: '#FEF2F2' }}>📡</div>
                      <div className="ai-info">
                        <div className="ai-name">Bracelet scanné — {scan.bracelet_id}</div>
                        <div className="ai-detail">
                          {formattedTime}
                          {mapsUrl
                            ? <> · <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--pulse-mid)', fontWeight: 600 }}>📍 Voir la position</a></>
                            : scan.user_agent ? <> · {scan.user_agent.slice(0, 40)}</> : null}
                        </div>
                      </div>
                      <div className="ai-time">{formatRelativeTime(scan.scanned_at)}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal activation */}
      {showActivation && (
        <div className="modal-bg" onClick={() => setShowActivation(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">⌚ Activer un bracelet</div>
              <button className="modal-close" onClick={() => setShowActivation(false)}>✕</button>
            </div>
            <p className="modal-sub">Entrez le code d'activation reçu avec votre commande Pulsmee.</p>

            {activationError && <div className="error-msg">{activationError}</div>}

            <form onSubmit={handleActivation}>
              <div className="f-group">
                <label className="f-lbl" style={{ color: 'var(--stone-mid)' }}>Code d'activation</label>
                <input
                  type="text"
                  className="f-inp"
                  placeholder="ex : PULM3H2X"
                  value={activationCode}
                  onChange={e => setActivationCode(e.target.value.toUpperCase())}
                  maxLength={12}
                  required
                  autoFocus
                  style={{ fontFamily: 'var(--font-jetbrains), monospace', letterSpacing: 2, textTransform: 'uppercase' }}
                />
              </div>
              <div className="f-group">
                <label className="f-lbl" style={{ color: 'var(--stone-mid)' }}>Nom du profil (optionnel)</label>
                <input
                  type="text"
                  className="f-inp"
                  placeholder="ex : Bracelet de Papa"
                  value={nomProfil}
                  onChange={e => setNomProfil(e.target.value)}
                />
              </div>
              <button className="btn-primary" type="submit" disabled={activating || !activationCode}>
                {activating ? <><span className="spinner" /> Activation...</> : 'Activer mon bracelet →'}
              </button>
            </form>

            <div style={{ marginTop: 14, fontSize: 12, color: 'var(--stone-mid)', textAlign: 'center' }}>
              Pas encore de bracelet ?{' '}
              <a href="https://pulsmee.fr" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--pulse-mid)', fontWeight: 700 }}>
                Commander sur pulsmee.fr →
              </a>
            </div>
          </div>
        </div>
      )}

      {user && (
        <Drawer
          user={user}
          bracelets={bracelets}
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          currentPage="dashboard"
          onToast={showToast}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  )
}
