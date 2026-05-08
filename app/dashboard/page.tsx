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
        const ids = b.map(br => br.bracelet_id)
        const { data: s } = await supabase
          .from('scans')
          .select('*')
          .in('bracelet_id', ids)
          .order('scanned_at', { ascending: false })
          .limit(20)
        setScans(s ?? [])
      }

      setLoading(false)
    }
    load()
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
      <header className="app-header">
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

          <div className="stats-row">
            <div className="stat-card">
              <div className="s-label">Bracelets</div>
              <div className="s-val" style={{ color: 'var(--pulse)' }}>{bracelets.length}</div>
              <div className="s-sub">Sur ce compte</div>
            </div>
            <div className="stat-card">
              <div className="s-label">Scans</div>
              <div className="s-val" style={{ color: '#3B82F6' }}>{scansCeMois}</div>
              <div className="s-sub">Ce mois</div>
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
                {scans.slice(0, 8).map(scan => (
                  <div key={scan.id} className="act-item">
                    <div className="ai-ico" style={{ background: '#FEF2F2' }}>📡</div>
                    <div className="ai-info">
                      <div className="ai-name">Bracelet scanné — {scan.bracelet_id}</div>
                      <div className="ai-detail">{scan.user_agent ? scan.user_agent.slice(0, 60) : 'Appareil inconnu'}</div>
                    </div>
                    <div className="ai-time">{formatRelativeTime(scan.scanned_at)}</div>
                  </div>
                ))}
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
