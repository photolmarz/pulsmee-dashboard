'use client'
import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { calcAge, GAMME_COLORS, decodeFicheFromNFC } from '@/lib/utils'
import type { Fiche } from '@/types'

type Habilitation = { nom: string; statut: 'valid' | 'soon' | 'expired' }

type LangKey = 'fr' | 'en' | 'es' | 'de' | 'it'

const TRANSLATIONS: Record<LangKey, Record<string, string>> = {
  fr: {
    urgence_medicale: '🚨 Urgence médicale',
    fiche_animale: '🐾 Fiche animale',
    alertes_critiques: '⚠️ Alertes critiques',
    groupe_sanguin: 'Groupe sanguin',
    traitement: 'Traitement',
    traitement_vet: 'Traitements vétérinaires',
    pathologies: 'Pathologies',
    medecin: 'Médecin',
    medecin_vet: 'Vétérinaire',
    medecin_rh: 'Contact RH',
    telephone: 'Téléphone',
    contacts: 'Contact prioritaire',
    contacts2: 'Contact 2',
    contacts3: 'Contact 3',
    contacts_parent1: 'Parent prioritaire',
    contacts_parent2: 'Parent 2',
    contacts_proprio: 'Propriétaire',
    contacts_proprio2: 'Propriétaire 2',
    habilitations: 'Habilitations',
    guide_approche: '💙 Guide d\'approche',
    consignes: 'Consignes',
    sans_app: 'Sans app',
    en_ligne: 'En ligne',
    hors_ligne: 'Hors ligne',
    prevenir_contacts: '🚨 Prévenir les contacts d\'urgence',
    contacts_prevenus: '✅ Contacts prévenus !',
    mode_hors_ligne: '📡 Mode hors ligne — données depuis la puce NFC',
    bracelet_introuvable: 'Bracelet introuvable',
    appeler: 'Appeler',
  },
  en: {
    urgence_medicale: '🚨 Medical Emergency',
    fiche_animale: '🐾 Pet Profile',
    alertes_critiques: '⚠️ Critical Alerts',
    groupe_sanguin: 'Blood type',
    traitement: 'Treatment',
    traitement_vet: 'Veterinary treatments',
    pathologies: 'Conditions',
    medecin: 'Doctor',
    medecin_vet: 'Veterinarian',
    medecin_rh: 'HR Contact',
    telephone: 'Phone',
    contacts: 'Priority contact',
    contacts2: 'Contact 2',
    contacts3: 'Contact 3',
    contacts_parent1: 'Primary parent',
    contacts_parent2: 'Parent 2',
    contacts_proprio: 'Owner',
    contacts_proprio2: 'Owner 2',
    habilitations: 'Certifications',
    guide_approche: '💙 Approach guide',
    consignes: 'Instructions',
    sans_app: 'No app needed',
    en_ligne: 'Online',
    hors_ligne: 'Offline',
    prevenir_contacts: '🚨 Alert emergency contacts',
    contacts_prevenus: '✅ Contacts notified!',
    mode_hors_ligne: '📡 Offline mode — data from NFC chip',
    bracelet_introuvable: 'Bracelet not found',
    appeler: 'Call',
  },
  es: {
    urgence_medicale: '🚨 Emergencia médica',
    fiche_animale: '🐾 Ficha animal',
    alertes_critiques: '⚠️ Alertas críticas',
    groupe_sanguin: 'Grupo sanguíneo',
    traitement: 'Tratamiento',
    traitement_vet: 'Tratamientos veterinarios',
    pathologies: 'Patologías',
    medecin: 'Médico',
    medecin_vet: 'Veterinario',
    medecin_rh: 'Contacto RRHH',
    telephone: 'Teléfono',
    contacts: 'Contacto prioritario',
    contacts2: 'Contacto 2',
    contacts3: 'Contacto 3',
    contacts_parent1: 'Padre/Madre principal',
    contacts_parent2: 'Padre/Madre 2',
    contacts_proprio: 'Propietario',
    contacts_proprio2: 'Propietario 2',
    habilitations: 'Habilitaciones',
    guide_approche: '💙 Guía de aproximación',
    consignes: 'Instrucciones',
    sans_app: 'Sin aplicación',
    en_ligne: 'En línea',
    hors_ligne: 'Sin conexión',
    prevenir_contacts: '🚨 Avisar contactos de emergencia',
    contacts_prevenus: '✅ ¡Contactos avisados!',
    mode_hors_ligne: '📡 Modo sin conexión — datos desde el chip NFC',
    bracelet_introuvable: 'Pulsera no encontrada',
    appeler: 'Llamar',
  },
  de: {
    urgence_medicale: '🚨 Medizinischer Notfall',
    fiche_animale: '🐾 Tierakte',
    alertes_critiques: '⚠️ Kritische Warnungen',
    groupe_sanguin: 'Blutgruppe',
    traitement: 'Behandlung',
    traitement_vet: 'Tierärztliche Behandlungen',
    pathologies: 'Erkrankungen',
    medecin: 'Arzt',
    medecin_vet: 'Tierarzt',
    medecin_rh: 'HR-Kontakt',
    telephone: 'Telefon',
    contacts: 'Hauptkontakt',
    contacts2: 'Kontakt 2',
    contacts3: 'Kontakt 3',
    contacts_parent1: 'Hauptelternteil',
    contacts_parent2: 'Elternteil 2',
    contacts_proprio: 'Eigentümer',
    contacts_proprio2: 'Eigentümer 2',
    habilitations: 'Qualifikationen',
    guide_approche: '💙 Annäherungsleitfaden',
    consignes: 'Anweisungen',
    sans_app: 'Ohne App',
    en_ligne: 'Online',
    hors_ligne: 'Offline',
    prevenir_contacts: '🚨 Notfallkontakte benachrichtigen',
    contacts_prevenus: '✅ Kontakte benachrichtigt!',
    mode_hors_ligne: '📡 Offline-Modus — Daten vom NFC-Chip',
    bracelet_introuvable: 'Armband nicht gefunden',
    appeler: 'Anrufen',
  },
  it: {
    urgence_medicale: '🚨 Emergenza medica',
    fiche_animale: '🐾 Scheda animale',
    alertes_critiques: '⚠️ Avvisi critici',
    groupe_sanguin: 'Gruppo sanguigno',
    traitement: 'Trattamento',
    traitement_vet: 'Trattamenti veterinari',
    pathologies: 'Patologie',
    medecin: 'Medico',
    medecin_vet: 'Veterinario',
    medecin_rh: 'Contatto HR',
    telephone: 'Telefono',
    contacts: 'Contatto prioritario',
    contacts2: 'Contatto 2',
    contacts3: 'Contatto 3',
    contacts_parent1: 'Genitore principale',
    contacts_parent2: 'Genitore 2',
    contacts_proprio: 'Proprietario',
    contacts_proprio2: 'Proprietario 2',
    habilitations: 'Abilitazioni',
    guide_approche: '💙 Guida all\'approccio',
    consignes: 'Istruzioni',
    sans_app: 'Senza app',
    en_ligne: 'Online',
    hors_ligne: 'Offline',
    prevenir_contacts: '🚨 Avvisare i contatti di emergenza',
    contacts_prevenus: '✅ Contatti avvisati!',
    mode_hors_ligne: '📡 Modalità offline — dati dal chip NFC',
    bracelet_introuvable: 'Braccialetto non trovato',
    appeler: 'Chiama',
  },
}

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
  const [geoCoords, setGeoCoords] = useState<{ lat: number; lon: number } | null>(null)
  const [alertSent, setAlertSent] = useState(false)
  const [alertSending, setAlertSending] = useState(false)
  const [lang, setLang] = useState<LangKey>('fr')

  useEffect(() => {
    // Detect language from browser
    const navLang = (navigator.language || 'fr').slice(0, 2).toLowerCase() as LangKey
    if (TRANSLATIONS[navLang]) setLang(navLang)
  }, [])

  const t = TRANSLATIONS[lang]

  useEffect(() => {
    const timer = setInterval(() => setTime(formatTime()), 30000)
    return () => clearInterval(timer)
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

          // Log scan with geolocation (attempt with 3s timeout)
          const logScanWithGeo = async () => {
            let lat: number | null = null
            let lon: number | null = null

            try {
              const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                const timer = setTimeout(() => reject(new Error('timeout')), 3000)
                navigator.geolocation.getCurrentPosition(
                  p => { clearTimeout(timer); resolve(p) },
                  err => { clearTimeout(timer); reject(err) },
                  { timeout: 3000, maximumAge: 60000 }
                )
              })
              lat = pos.coords.latitude
              lon = pos.coords.longitude
              setGeoCoords({ lat, lon })
            } catch {
              // géoloc échouée ou refusée — on insère quand même
            }

            void supabase.from('scans').insert({
              bracelet_id: braceletId,
              user_agent: navigator.userAgent.slice(0, 200),
              ...(lat !== null && lon !== null ? { latitude: lat, longitude: lon } : {}),
            })
          }

          void logScanWithGeo()

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

  async function handleAlertContacts() {
    setAlertSending(true)
    try {
      await fetch('/api/alert-contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bracelet_id: braceletId,
          latitude: geoCoords?.lat ?? null,
          longitude: geoCoords?.lon ?? null,
        }),
      })
      setAlertSent(true)
    } catch {
      setAlertSent(true)
    } finally {
      setAlertSending(false)
    }
  }

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
          <h1>{t.bracelet_introuvable}</h1>
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
    { nom: fiche.contact1_nom, tel: fiche.contact1_tel, role: isKids ? t.contacts_parent1 : isPet ? t.contacts_proprio : t.contacts, ava: '👩' },
    { nom: fiche.contact2_nom, tel: fiche.contact2_tel, role: isKids ? t.contacts_parent2 : isPet ? t.contacts_proprio2 : t.contacts2, ava: '👦' },
    { nom: fiche.contact3_nom, tel: fiche.contact3_tel, role: t.contacts3, ava: '👤' },
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
          {t.mode_hors_ligne}
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
            {isPet ? t.fiche_animale : t.urgence_medicale}
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
              📞 {t.appeler} {mainContact.nom!.split(' ')[0]}
            </a>
          )}
        </div>

        <div className="pub-body">
          {alertes.length > 0 && (
            <div className="pub-alert" style={{ borderColor: `${gammeColor}44`, background: `${gammeColor}08` }}>
              <div className="pub-alert-title" style={{ color: gammeColor }}>{t.alertes_critiques}</div>
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
                <span className="pub-rl">{t.groupe_sanguin}</span>
                <span className="pub-rv" style={{ color: gammeColor, fontWeight: 700 }}>{fiche.groupe_sanguin}</span>
              </div>
            )}
            {fiche.traitements && (
              <div className="pub-row">
                <span className="pub-rl">{isPet ? t.traitement_vet : t.traitement}</span>
                <span className="pub-rv" style={{ color: '#EF4444', maxWidth: '60%' }}>
                  {fiche.traitements.slice(0, 80)}{fiche.traitements.length > 80 ? '...' : ''}
                </span>
              </div>
            )}
            {fiche.pathologies && !isPet && !isWork && (
              <div className="pub-row">
                <span className="pub-rl">{t.pathologies}</span>
                <span className="pub-rv" style={{ maxWidth: '60%' }}>{fiche.pathologies}</span>
              </div>
            )}
            {fiche.medecin && (
              <div className="pub-row">
                <span className="pub-rl">{isPet ? t.medecin_vet : isWork ? t.medecin_rh : t.medecin}</span>
                <span className="pub-rv">{fiche.medecin}</span>
              </div>
            )}
            {fiche.medecin_tel && (
              <div className="pub-row">
                <span className="pub-rl">{t.telephone}</span>
                <span className="pub-rv">
                  <a href={`tel:${fiche.medecin_tel}`} style={{ color: gammeColor, fontWeight: 700 }}>{fiche.medecin_tel}</a>
                </span>
              </div>
            )}
          </div>

          {isWork && habilitations.length > 0 && (
            <div className="pub-card">
              <div className="pub-row" style={{ borderBottom: '1px solid var(--stone)', paddingBottom: 8, marginBottom: 8 }}>
                <span className="pub-rl" style={{ fontWeight: 700, color: 'var(--ink)' }}>{t.habilitations}</span>
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
              <div style={{ fontWeight: 700, marginBottom: 6, color: gammeColor }}>{t.guide_approche}</div>
              {fiche.guide_autisme}
            </div>
          )}

          {contacts.length > 0 && (
            <button
              onClick={handleAlertContacts}
              disabled={alertSent || alertSending}
              style={{
                background: alertSent ? '#6B7280' : gammeColor,
                color: 'white',
                borderRadius: 12,
                padding: 14,
                width: '100%',
                fontSize: 15,
                fontWeight: 700,
                border: 'none',
                cursor: alertSent ? 'default' : 'pointer',
                marginBottom: 12,
              }}
            >
              {alertSending ? '...' : alertSent ? t.contacts_prevenus : t.prevenir_contacts}
            </button>
          )}

          {contacts.map((c, i) => (
            <div key={i} className="pub-contact">
              <div className="pub-ava" style={{ background: i === 0 ? `${gammeColor}22` : '#EDE9FE' }}>{c.ava}</div>
              <div style={{ flex: 1 }}>
                <div className="pub-cname">{c.nom}</div>
                <div className="pub-crole">{c.role}</div>
              </div>
              <a href={`tel:${c.tel}`} className="pub-call" style={{ background: gammeColor }}>📞 {t.appeler}</a>
            </div>
          ))}

          {fiche.consignes && (
            <div className="pub-consignes">{fiche.consignes}</div>
          )}
        </div>

        <div className="pub-footer">
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 8 }}>
            {(['fr', 'en', 'es', 'de', 'it'] as LangKey[]).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 18,
                  fontWeight: lang === l ? 700 : 400,
                  color: lang === l ? gammeColor : 'var(--ink-mid)',
                  padding: '2px 4px',
                  borderRadius: 4,
                }}
                aria-label={l}
              >
                {l === 'fr' ? '🇫🇷' : l === 'en' ? '🇬🇧' : l === 'es' ? '🇪🇸' : l === 'de' ? '🇩🇪' : '🇮🇹'}
              </button>
            ))}
          </div>
          <div className="pub-footer-brand" style={{ color: gammeColor }}>✦ Pulsmee {gamme} · Fiche d'urgence</div>
          <div className="pub-footer-sub">{t.sans_app} · {isOffline ? t.hors_ligne : t.en_ligne} · pulsmee.fr/p/{braceletId}</div>
        </div>
      </div>
    </div>
  )
}
