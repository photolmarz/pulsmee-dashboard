'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Logo from '@/components/Logo'
import Drawer from '@/components/Drawer'
import { createClient } from '@/lib/supabase'
import { formatRelativeTime, GAMME_COLORS } from '@/lib/utils'
import type { User } from '@supabase/supabase-js'
import type { Bracelet, Scan } from '@/types'

export const dynamic = 'force-dynamic'

function parseUA(ua: string): string {
  if (!ua) return 'Appareil inconnu'
  if (/iPhone/.test(ua)) return '📱 iPhone'
  if (/iPad/.test(ua)) return '📱 iPad'
  if (/Android/.test(ua)) return '📱 Android'
  if (/Macintosh/.test(ua)) return '💻 Mac'
  if (/Windows/.test(ua)) return '💻 Windows'
  return '🌐 Navigateur'
}

export default function ScansPage() {
  const [user, setUser] = useState<User | null>(null)
  const [bracelets, setBracelets] = useState<Bracelet[]>([])
  const [scans, setScans] = useState<Scan[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filterBracelet, setFilterBracelet] = useState<string>('all')
  const [filterDate, setFilterDate] = useState<string>('')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 20
  const router = useRouter()
  const supabase = createClient()

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
        setScans(s ?? [])
      }
      setLoading(false)
    }
    load()
  }, [router, supabase])

  const filtered = scans.filter(s => {
    if (filterBracelet !== 'all' && s.bracelet_id !== filterBracelet) return false
    if (filterDate) {
      const scanDay = new Date(s.scanned_at).toISOString().slice(0, 10)
      if (scanDay !== filterDate) return false
    }
    return true
  })

  const paginated = filtered.slice(0, (page + 1) * PAGE_SIZE)
  const hasMore = paginated.length < filtered.length

  const getBracelet = useCallback((id: string) => bracelets.find(b => b.bracelet_id === id), [bracelets])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--warm-white)' }}>
      <div className="spinner" />
    </div>
  )

  return (
    <div className="app-shell">
      <header className="app-bar">
        <button className="back-btn" onClick={() => router.push('/dashboard')}>← Dashboard</button>
        <Logo size={24} />
        <button className="menu-btn" onClick={() => setDrawerOpen(true)}>☰</button>
      </header>

      {user && (
        <Drawer
          user={user}
          bracelets={bracelets}
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          currentPage="scans"
        />
      )}

      <main className="app-main">
        <div className="pg-header">
          <div className="pg-title">📡 Historique des scans</div>
          <div className="pg-sub">{filtered.length} scan{filtered.length > 1 ? 's' : ''} au total</div>
        </div>

        {/* Filtres */}
        <div className="scans-filters">
          <select
            className="fi-input"
            value={filterBracelet}
            onChange={e => { setFilterBracelet(e.target.value); setPage(0) }}
          >
            <option value="all">Tous les bracelets</option>
            {bracelets.map(b => (
              <option key={b.bracelet_id} value={b.bracelet_id}>
                {b.nom_profil} ({b.bracelet_id})
              </option>
            ))}
          </select>
          <input
            type="date"
            className="fi-input"
            value={filterDate}
            onChange={e => { setFilterDate(e.target.value); setPage(0) }}
            max={new Date().toISOString().slice(0, 10)}
          />
          {(filterBracelet !== 'all' || filterDate) && (
            <button className="scan-clear-btn" onClick={() => { setFilterBracelet('all'); setFilterDate(''); setPage(0) }}>
              ✕ Réinitialiser
            </button>
          )}
        </div>

        {/* Liste */}
        {filtered.length === 0 ? (
          <div className="scans-empty">
            <div className="scans-empty-ico">📡</div>
            <div className="scans-empty-txt">Aucun scan trouvé</div>
          </div>
        ) : (
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-body" style={{ padding: 0 }}>
              {paginated.map((scan, i) => {
                const br = getBracelet(scan.bracelet_id)
                const gammeColor = br ? (GAMME_COLORS[br.gamme] ?? '#E8472A') : '#E8472A'
                const mapsUrl = (scan.latitude != null && scan.longitude != null)
                  ? `https://www.google.com/maps?q=${scan.latitude},${scan.longitude}`
                  : null
                const scanDate = new Date(scan.scanned_at)
                const formattedDate = scanDate.toLocaleString('fr-FR', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })

                return (
                  <div key={scan.id} className={`scan-row${i > 0 ? ' scan-row-border' : ''}`}>
                    <div className="scan-dot" style={{ background: gammeColor }} />
                    <div className="scan-info">
                      <div className="scan-bracelet">
                        {br?.nom_profil ?? scan.bracelet_id}
                        <span className="scan-id">· {scan.bracelet_id}</span>
                      </div>
                      <div className="scan-meta">
                        <span>{parseUA(scan.user_agent)}</span>
                        {mapsUrl && (
                          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="scan-location">
                            📍 Position
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="scan-time">
                      <div className="scan-rel">{formatRelativeTime(scan.scanned_at)}</div>
                      <div className="scan-abs">{formattedDate}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {hasMore && (
          <button className="scan-load-more" onClick={() => setPage(p => p + 1)}>
            Charger plus ({filtered.length - paginated.length} restants)
          </button>
        )}
      </main>
    </div>
  )
}
