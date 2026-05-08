'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Logo from '@/components/Logo'
import { createClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasSession, setHasSession] = useState<boolean | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession()
      setHasSession(!!session)
    }
    checkSession()
  }, [supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }

    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      router.push('/dashboard')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la mise à jour'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  if (hasSession === null) {
    return (
      <div style={{ background: 'var(--cream)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: 32, height: 32, borderTopColor: 'var(--pulse)', borderColor: 'var(--stone)' }} />
      </div>
    )
  }

  return (
    <div className="insc-wrap">
      <div className="insc-card">
        <div className="insc-logo">
          <Logo size={26} />
          <span>Puls<span style={{ color: 'var(--pulse-mid)' }}>mee</span></span>
        </div>

        <div className="insc-eyebrow">Sécurité</div>
        <h1 className="insc-title">Nouveau<br /><em>mot de passe.</em></h1>

        {!hasSession ? (
          <>
            <p style={{ color: 'var(--ink-mid)', fontSize: 14, textAlign: 'center', margin: '16px 0' }}>
              Lien expiré — demandez un nouveau lien de réinitialisation.
            </p>
            <a
              href="/inscription"
              style={{ display: 'block', textAlign: 'center', color: 'var(--pulse-mid)', fontWeight: 700, fontSize: 14 }}
            >
              ← Retour à la connexion
            </a>
          </>
        ) : (
          <>
            <p className="insc-sub">Choisissez un nouveau mot de passe sécurisé pour votre compte Pulsmee.</p>

            {error && <div className="error-msg">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="f-group">
                <label className="f-lbl" htmlFor="new-password">Nouveau mot de passe</label>
                <input
                  id="new-password"
                  type="password"
                  className="f-inp"
                  placeholder="Minimum 8 caractères"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  autoFocus
                />
              </div>
              <div className="f-group">
                <label className="f-lbl" htmlFor="confirm-password">Confirmer le mot de passe</label>
                <input
                  id="confirm-password"
                  type="password"
                  className="f-inp"
                  placeholder="Répétez le mot de passe"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? <span className="spinner" /> : null}
                {loading ? 'Mise à jour...' : 'Mettre à jour →'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
