'use client'
import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { calcAge, GAMME_COLORS, decodeFicheFromNFC } from '@/lib/utils'
import type { Fiche } from '@/types'

type Habilitation = { nom: string; statut: 'valid' | 'soon' | 'expired' }

function formatTime() {
  return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function getAlertePills(fiche: Partial<Fiche>): string[] {
  const pills: string[] = []
  if (fiche.allergies) {
    fiche.allergies.split(',').forEach(a => {
      const t = a.trim()
      if (t) pills.push(`🚫 Allergie ${t}`)
    })
  }
  if (fiche.traitements?.toLowerCase().includes('anticoagulant') ||
      fiche.traitements?.toLowerCase().includes('rivaroxaban') ||
      fiche.traitements?.toLowerCase().includes('warfarine') ||
      fiche.traitements?.toLowerCase().includes('xarelto')) {
    pills.push('💊 Anticoagulants')
  }
  if (fiche.pathologies) {
    fiche.pathologies.split(/[,·]/).slice(0, 2).forEach(p => {
      const t = p.trim()
      if (t) pills.push(`⚠️ ${t}`)
    })
  }
  return pills
}

export default function PublicPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const braceletId = (params?.bracelet_id as string)?.toUpperCase()
  const encodedData = searchParams?.get('v')

  const [fiche, setFiche] = useState<Partial<Fiche> | null>(null)
  const [gamme, setGamme] = useState('Care')
  const [nomProfil, setNomProfil] = useState('')
  const [loading, setLoading] = useState(true)
  const [isOffline, setIsOffline] = useState(false)
  const [time, setTime] = useState(formatTime())

  useEffect(() => {
    const t = setInterval(() => setTime(formatTime()), 30000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    async function load() {
      // Try online first
      if (navigator.onLine) {
        try {
          const supabase = createClient()
          const [{ data: ficheData }, { data: braceletData }] = await Promise.all([
            supabase.from('fiches').select('*').eq('bracelet_id', braceletId).maybeSingle(),
            supabase.from('bracelets').select('nom_profil, gamme').eq('bracelet_id', braceletId).maybeSingle(),
          ])

          // Log scan
          void supabase.from('scans').insert({
            bracelet_id: braceletId,
            user_agent: navigator.userAgent.slice(0, 200),
          })

          if (ficheData) {
            setFiche(ficheData)
            setGamme(braceletData?.gamme || 'Care')
            setNomProfil(braceletData?.nom_profil || '')
            setLoading(false)
            return
          }
        } catch {}
      }

      // Fallback: offline data from URL
      if (encodedData) {
        const decoded = decodeFicheFromNFC(encodedData)
        if (decoded) {
          setFiche(decoded)
          setIsOffline(true)
          setLoading(false)
          return
        }
      }

      setFiche(null)
      setLoading(false)
    }
    load()
  }, [braceletId, encodedData])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#1E1A16', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '3px solid rgba(255,255,255,.2)', borderTopColor: '#E8472A', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  if (!fiche) {
    return (
      <div className="pub-not-found">
        <div>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🔍</div>
          <h1>Bracelet introuvable</h1>
          <p>L'identifiant <strong>{braceletId}</strong> ne correspond à aucun bracelet enregistré.</p>
          <p style={{ marginTop: 12 }}>
            Vérifiez l'identifiant ou rendez-vous sur{' '}
            <a href="https://pulsmee.fr" style={{ color: 'white', fontWeight: 700 }}>pulsmee.fr</a>.
          </p>
        </div>
      </div>
    )
  }

  const gammeColor = GAMME_COLORS[gamme] ?? '#E8472A'
  const isPet = gamme === 'Pet'
  const isKids = gamme === 'Kids'
  const isWork = gamme === 'Work'

  const age = calcAge(fiche.date_naissance)
  const alertes = getAlertePills(fiche)

  const contacts = [
    { nom: fiche.contact1_nom, tel: fiche.contact1_tel, role: isKids ? 'Parent prioritaire' : isPet ? 'Propriétaire' : 'Contact prioritaire', ava: '👩' },
    { nom: fiche.contact2_nom, tel: fiche.contact2_tel, role: isKids ? 'Parent 2' : isPet ? 'Propriétaire 2' : 'Contact 2', ava: '👦' },
    { nom: fiche.contact3_nom, tel: fiche.contact3_tel, role: 'Contact 3', ava: '👤' },
  ].filter(c => c.nom && c.tel)

  const mainContact = contacts[0]

  let habilitations: Habilitation[] = []
  if (isWork) {
    try { habilitations = JSON.parse((fiche as Fiche & { habilitations?: string }).habilitations || '[]') } catch {}
  }

  return (
    <div className="pub-wrap">
      {isOffline && (
        <div style={{ background: '#92400e', color: '#fef3c7', textAlign: 'center', padding: '8px 16px', fontSize: 12, fontWeight: 600 }}>
          📡 Mode hors ligne — données depuis la puce NFC
        </div>
      )}
      <div className="pub-phone">
        <div className="pub-back-bar">
          <a href="/dashboard" className="pub-back-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Retour
          </a>
        </div>
        <div className="pub-statusbar">
          <span>{time}</span>
          <span>{isOffline ? '📵' : '📶'} 🔋</span>
        </div>

        <div className="pub-hero" style={{ background: `linear-gradient(135deg, ${gammeColor}22 0%, transparent 60%)` }}>
          <div className="pub-badge" style={{ background: `${gammeColor}22`, color: gammeColor, borderColor: `${gammeColor}44` }}>
            <div className="pub-blink" style={{ background: gammeColor }} />
            {isPet ? '🐾 Fiche animale' : '🚨 Urgence médicale'}
          </div>
          {fiche.photo_url && !isPet && (
            <img src={fiche.photo_url} alt={fiche.nom_complet} className="pub-photo" style={{ borderColor: gammeColor }} />
          )}
          <div className="pub-name">{fiche.nom_complet || nomProfil || 'Porteur du bracelet'}</div>
          <div className="pub-meta">
            {isPet && fiche.espece && <span>{fiche.espece}{fiche.race ? ` · ${fiche.race}` : ''}</span>}
            {isWork && fiche.poste && <span style={{ fontSize: 12 }}>{fiche.poste}</span>}
            {age !== null && <span>{age} ans</span>}
            {age !== null && fiche.groupe_sanguin ? ' · ' : null}
            {fiche.groupe_sanguin && !isPet && (
              <span className="pub-blood" style={{ background: `${gammeColor}22`, color: gammeColor }}>{fiche.groupe_sanguin}</span>
            )}
          </div>
          {mainContact && (
            <a href={`tel:${mainContact.tel}`} className="pub-cta" style={{ background: gammeColor }}>
              📞 Appeler {mainContact.nom!.split(' ')[0]}
            </a>
          )}
        </div>

        <div className="pub-body">
          {alertes.length > 0 && (
            <div className="pub-alert" style={{ borderColor: `${gammeColor}44`, background: `${gammeColor}08` }}>
              <div className="pub-alert-title" style={{ color: gammeColor }}>⚠️ Alertes critiques</div>
              <div className="pub-pills">
                {alertes.map((a, i) => (
                  <span key={i} className="pub-pill" style={{ background: `${gammeColor}15`, color: gammeColor, borderColor: `${gammeColor}30` }}>{a}</span>
                ))}
              </div>
            </div>
          )}

          <div className="pub-card">
            {!isPet && fiche.groupe_sanguin && (
              <div className="pub-row">
                <span className="pub-rl">Groupe sanguin</span>
                <span className="pub-rv" style={{ color: gammeColor, fontWeight: 700 }}>{fiche.groupe_sanguin}</span>
              </div>
            )}
            {fiche.traitements && (
              <div className="pub-row">
                <span className="pub-rl">{isPet ? 'Traitements vétérinaires' : 'Traitement'}</span>
                <span className="pub-rv" style={{ color: '#EF4444', maxWidth: '60%' }}>
                  {fiche.traitements.slice(0, 80)}{fiche.traitements.length > 80 ? '...' : ''}
                </span>
              </div>
            )}
            {fiche.pathologies && !isPet && !isWork && (
              <div className="pub-row">
                <span className="pub-rl">Pathologies</span>
                <span className="pub-rv" style={{ maxWidth: '60%' }}>{fiche.pathologies}</span>
              </div>
            )}
            {fiche.medecin && (
              <div className="pub-row">
                <span className="pub-rl">{isPet ? 'Vétérinaire' : isWork ? 'Contact RH' : 'Médecin'}</span>
                <span className="pub-rv">{fiche.medecin}</span>
              </div>
            )}
            {fiche.medecin_tel && (
              <div className="pub-row">
                <span className="pub-rl">Téléphone</span>
                <span className="pub-rv">
                  <a href={`tel:${fiche.medecin_tel}`} style={{ color: gammeColor, fontWeight: 700 }}>{fiche.medecin_tel}</a>
                </span>
              </div>
            )}
          </div>

          {isWork && habilitations.length > 0 && (
            <div className="pub-card">
              <div className="pub-row" style={{ borderBottom: '1px solid var(--stone)', paddingBottom: 8, marginBottom: 8 }}>
                <span className="pub-rl" style={{ fontWeight: 700, color: 'var(--ink)' }}>Habilitations</span>
              </div>
              {habilitations.map((h, i) => (
                <div key={i} className="pub-row">
                  <span className="pub-rl">{h.nom}</span>
                  <span className="pub-rv">{h.statut === 'valid' ? '🟢 Valide' : h.statut === 'soon' ? '🟠 Expire bientôt' : '🔴 Expiré'}</span>
                </div>
              ))}
            </div>
          )}

          {isKids && fiche.guide_autisme && (
            <div className="pub-consignes" style={{ background: `${gammeColor}10`, borderColor: `${gammeColor}30`, color: 'var(--ink)' }}>
              <div style={{ fontWeight: 700, marginBottom: 6, color: gammeColor }}>💙 Guide d'approche</div>
              {fiche.guide_autisme}
            </div>
          )}

          {contacts.map((c, i) => (
            <div key={i} className="pub-contact">
              <div className="pub-ava" style={{ background: i === 0 ? `${gammeColor}22` : '#EDE9FE' }}>{c.ava}</div>
              <div style={{ flex: 1 }}>
                <div className="pub-cname">{c.nom}</div>
                <div className="pub-crole">{c.role}</div>
              </div>
              <a href={`tel:${c.tel}`} className="pub-call" style={{ background: gammeColor }}>📞 Appeler</a>
            </div>
          ))}

          {fiche.consignes && (
            <div className="pub-consignes">{fiche.consignes}</div>
          )}
        </div>

        <div className="pub-footer">
          <div className="pub-footer-brand" style={{ color: gammeColor }}>✦ Pulsmee {gamme} · Fiche d'urgence</div>
          <div className="pub-footer-sub">Sans app · {isOffline ? 'Hors ligne' : 'En ligne'} · pulsmee.fr/p/{braceletId}</div>
        </div>
      </div>
    </div>
  )
}
