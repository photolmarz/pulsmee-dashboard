'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Logo from './Logo'
import type { User } from '@supabase/supabase-js'
import type { Bracelet } from '@/types'
import { createClient } from '@/lib/supabase'

type DrawerProps = {
  user: User
  bracelets: Bracelet[]
  isOpen: boolean
  onClose: () => void
  currentPage: 'dashboard' | 'fiche'
  currentBraceletId?: string
  onToast?: (msg: string) => void
}

export default function Drawer({ user, bracelets, isOpen, onClose, currentPage, currentBraceletId }: DrawerProps) {
  const router = useRouter()
  const supabase = createClient()
  const prenom = (user.user_metadata?.prenom as string) || user.email?.split('@')[0] || 'Utilisateur'
  const initial = prenom[0].toUpperCase()

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleLogout() {
    await supabase.auth.signOut()
    onClose()
    router.push('/inscription')
  }

  function nav(to: string) {
    router.push(to)
    onClose()
  }

  return (
    <aside className={`drawer${isOpen ? ' is-open' : ''}`} aria-hidden={!isOpen}>
      <div className="drawer-top">
        <div className="drawer-logo">
          <Logo size={22} />
          <span className="drawer-logo-text">Puls<span>mee</span></span>
        </div>
        <button className="drawer-x" onClick={onClose} aria-label="Fermer le menu">✕</button>
      </div>

      <div className="drawer-user">
        <div className="d-ava">{initial}</div>
        <div>
          <div className="d-name" spellCheck={false}>{prenom}</div>
          <div className="d-email">{user.email}</div>
        </div>
      </div>

      <nav className="drawer-nav">
        <div className="d-section">Navigation</div>

        <button
          className={`d-item${currentPage === 'dashboard' ? ' is-active' : ''}`}
          onClick={() => nav('/dashboard')}
        >
          <span className="d-lbl">Dashboard</span>
        </button>

{bracelets.length > 0 && (
          <>
            <div className="d-section">Mes bracelets</div>
            {bracelets.map(br => (
              <button
                key={br.bracelet_id}
                className={`d-item${currentBraceletId === br.bracelet_id ? ' is-active' : ''}`}
                onClick={() => nav(`/fiche/${br.bracelet_id}`)}
              >
                <span className="d-lbl">{br.nom_profil}</span>
              </button>
            ))}
          </>
        )}

        <div className="d-section">Compte</div>

        <a
          className="d-item"
          href="https://pulsmee.fr"
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClose}
        >
          <span className="d-lbl">pulsmee.fr</span>
        </a>

        <button className="d-item is-danger" onClick={handleLogout}>
          <span className="d-lbl">Se déconnecter</span>
        </button>
      </nav>

      <div className="drawer-foot">
        <div className="d-version">pulsmee.fr · dashboard v1.0</div>
      </div>
    </aside>
  )
}
