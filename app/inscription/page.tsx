'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Logo from '@/components/Logo'
import { createClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type Tab = 'register' | 'login'

export default function InscriptionPage() {
  const [tab, setTab] = useState<Tab>('register')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [prenom, setPrenom] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [forgotMode, setForgotMode] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { prenom } },
      })
      if (signUpError) throw signUpError
      if (!data.user) throw new Error('Erreur lors de la création du compte')
      router.push('/dashboard')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Une erreur est survenue'
      if (msg.includes('already registered')) setError('Cet email est déjà utilisé. Connectez-vous.')
      else setError(msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
      if (loginError) throw loginError
      router.push('/dashboard')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur de connexion'
      if (msg.includes('Invalid login')) setError('Email ou mot de passe incorrect.')
      else setError(msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    setForgotLoading(true)
    try {
      await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: 'https://dashboard.pulsmee.fr/reset-password',
      })
      setForgotSent(true)
    } finally {
      setForgotLoading(false)
    }
  }

  function switchTab(t: Tab) {
    setTab(t)
    setError('')
    setEmail('')
    setPassword('')
    setPrenom('')
    setForgotMode(false)
    setForgotSent(false)
    setForgotEmail('')
  }

  return (
    <div className="insc-wrap">
      <div className="insc-card">
        <div className="insc-logo">
          <Logo size={26} />
          <span>Puls<span style={{ color: 'var(--pulse-mid)' }}>mee</span></span>
        </div>

        <div className="insc-tabs">
          <button className={`insc-tab${tab === 'register' ? ' active' : ''}`} onClick={() => switchTab('register')} type="button">
            Créer un compte
          </button>
          <button className={`insc-tab${tab === 'login' ? ' active' : ''}`} onClick={() => switchTab('login')} type="button">
            Se connecter
          </button>
        </div>

        {tab === 'register' ? (
          <>
            <div className="insc-eyebrow">Espace personnel</div>
            <h1 className="insc-title">Créez votre<br /><em>espace.</em></h1>
            <p className="insc-sub">Gérez vos bracelets Pulsmee et mettez à jour vos fiches médicales à tout moment.</p>

            {error && <div className="error-msg">{error}</div>}

            <form onSubmit={handleRegister}>
              <div className="f-group">
                <label className="f-lbl" htmlFor="prenom">Prénom</label>
                <input id="prenom" type="text" className="f-inp" placeholder="Jean" value={prenom} onChange={e => setPrenom(e.target.value)} required autoComplete="given-name" />
              </div>
              <div className="f-group">
                <label className="f-lbl" htmlFor="email-reg">Email</label>
                <input id="email-reg" type="email" className="f-inp" placeholder="jean@exemple.fr" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
              </div>
              <div className="f-group">
                <label className="f-lbl" htmlFor="password-reg">Mot de passe</label>
                <input id="password-reg" type="password" className="f-inp" placeholder="Minimum 8 caractères" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
              </div>
              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? <span className="spinner" /> : null}
                {loading ? 'Création...' : 'Créer mon espace →'}
              </button>
            </form>
            <div className="insc-link">
              Déjà un compte ? <button type="button" onClick={() => switchTab('login')}>Se connecter</button>
            </div>
          </>
        ) : forgotMode ? (
          <>
            <div className="insc-eyebrow">Réinitialisation</div>
            <h1 className="insc-title">Mot de passe<br /><em>oublié ?</em></h1>

            {forgotSent ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
                <p style={{ color: 'var(--ink)', fontWeight: 600 }}>Email envoyé ! Vérifiez votre boîte mail.</p>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword}>
                <div className="f-group">
                  <label className="f-lbl" htmlFor="email-forgot">Email</label>
                  <input id="email-forgot" type="email" className="f-inp" placeholder="jean@exemple.fr" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required autoComplete="email" />
                </div>
                <button className="btn-primary" type="submit" disabled={forgotLoading}>
                  {forgotLoading ? <span className="spinner" /> : null}
                  {forgotLoading ? 'Envoi...' : 'Envoyer le lien →'}
                </button>
              </form>
            )}
            <div className="insc-link">
              <button type="button" onClick={() => { setForgotMode(false); setForgotSent(false); setForgotEmail('') }}>
                ← Retour à la connexion
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="insc-eyebrow">Connexion</div>
            <h1 className="insc-title">Bon retour<br /><em>chez vous.</em></h1>
            <p className="insc-sub">Connectez-vous pour accéder à votre espace Pulsmee.</p>

            {error && <div className="error-msg">{error}</div>}

            <form onSubmit={handleLogin}>
              <div className="f-group">
                <label className="f-lbl" htmlFor="email-login">Email</label>
                <input id="email-login" type="email" className="f-inp" placeholder="jean@exemple.fr" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
              </div>
              <div className="f-group">
                <label className="f-lbl" htmlFor="password-login">Mot de passe</label>
                <input id="password-login" type="password" className="f-inp" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
              </div>
              <a
                href="#"
                onClick={e => { e.preventDefault(); setForgotMode(true); setForgotEmail(email) }}
                style={{ display: 'block', textAlign: 'right', fontSize: 12, color: 'var(--pulse-mid)', marginBottom: 12, textDecoration: 'none' }}
              >
                Mot de passe oublié ?
              </a>
              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? <span className="spinner" /> : null}
                {loading ? 'Connexion...' : 'Se connecter →'}
              </button>
            </form>
            <div className="insc-link">
              Pas encore de compte ? <button type="button" onClick={() => switchTab('register')}>Créer mon espace</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
