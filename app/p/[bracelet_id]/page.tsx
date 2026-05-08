'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { calcAge, GAMME_COLORS, decodeFicheFromNFC, getRelationEmoji, getRelationLabel } from '@/lib/utils'
import type { Fiche } from '@/types'

type Habilitation = { nom: string; statut: 'valid' | 'soon' | 'expired' }

// Emergency numbers by country code
const EMERGENCY_BY_COUNTRY: Record<string, string> = {
  FR: '15', GB: '999', US: '911', CA: '911',
  AU: '000', NZ: '111', JP: '119', IN: '112',
  // Reste du monde → 112 (standard international)
}

// Détection par fuseau horaire (instantané, fonctionne hors ligne)
function getEmergencyFromTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (tz === 'Europe/London' || tz === 'Europe/Belfast' || tz === 'Europe/Dublin') return '999'
    if (tz.startsWith('America/')) return '911'
    if (tz.startsWith('Australia/')) return '000'
    if (tz.startsWith('Pacific/Auckland')) return '111'
    // Toute l'Europe continentale + Afrique + Asie → 112
    return '112'
  } catch {
    return '112'
  }
}

// Upgrade via reverse geocoding si coordonnées disponibles
async function getEmergencyFromCoords(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { 'Accept-Language': 'en' }, signal: AbortSignal.timeout(3000) }
    )
    const data = await res.json()
    const cc: string = (data.address?.country_code || '').toUpperCase()
    return EMERGENCY_BY_COUNTRY[cc] ?? '112'
  } catch {
    return getEmergencyFromTimezone()
  }
}

// Translations
const TRANSLATIONS = {
  fr: {
    urgence: '🚨 Urgence médicale',
    animal: '🐾 Animal perdu',
    enfant: '🧒 Enfant en danger',
    chantier: '🏗️ Accident chantier',
    alertes: 'Alertes critiques',
    groupe_sanguin: 'Groupe sanguin',
    traitement: 'Traitement',
    pathologies: 'Pathologies',
    medecin: 'Médecin',
    veterinaire: 'Vétérinaire',
    telephone: 'Téléphone',
    habilitations: 'Habilitations',
    guide: 'Guide d\'approche',
    consignes: 'Consignes',
    allergies: 'Allergies',
    prioritaire: 'Prioritaire',
    prevenir: '🚨 Prévenir les contacts',
    prevenu: '✅ Contacts prévenus !',
    hors_ligne: '📡 Mode hors ligne — données depuis la puce NFC',
    sans_app: 'Sans app',
    en_ligne: 'En ligne',
    offline: 'Hors ligne',
    donneur: 'Donneur',
    race: 'Race',
    espece: 'Espèce',
    poste: 'Poste',
    contact_rh: 'Contact RH',
    appeler: (n: string) => `🚨 Appeler le ${n}`,
  },
  en: {
    urgence: '🚨 Medical Emergency',
    animal: '🐾 Lost Animal',
    enfant: '🧒 Child in danger',
    chantier: '🏗️ Work Accident',
    alertes: 'Critical Alerts',
    groupe_sanguin: 'Blood type',
    traitement: 'Treatment',
    pathologies: 'Conditions',
    medecin: 'Doctor',
    veterinaire: 'Veterinarian',
    telephone: 'Phone',
    habilitations: 'Certifications',
    guide: 'Approach guide',
    consignes: 'Instructions',
    allergies: 'Allergies',
    prioritaire: 'Priority',
    prevenir: '🚨 Alert emergency contacts',
    prevenu: '✅ Contacts notified!',
    hors_ligne: '📡 Offline mode — data from NFC chip',
    sans_app: 'No app',
    en_ligne: 'Online',
    offline: 'Offline',
    donneur: 'Donor',
    race: 'Breed',
    espece: 'Species',
    poste: 'Position',
    contact_rh: 'HR Contact',
    appeler: (n: string) => `🚨 Call ${n}`,
  },
  es: {
    urgence: '🚨 Emergencia médica',
    animal: '🐾 Animal perdido',
    enfant: '🧒 Niño en peligro',
    chantier: '🏗️ Accidente laboral',
    alertes: 'Alertas críticas',
    groupe_sanguin: 'Grupo sanguíneo',
    traitement: 'Tratamiento',
    pathologies: 'Patologías',
    medecin: 'Médico',
    veterinaire: 'Veterinario',
    telephone: 'Teléfono',
    habilitations: 'Certificaciones',
    guide: 'Guía de acercamiento',
    consignes: 'Instrucciones',
    allergies: 'Alergias',
    prioritaire: 'Prioritario',
    prevenir: '🚨 Avisar a los contactos',
    prevenu: '✅ ¡Contactos avisados!',
    hors_ligne: '📡 Modo sin conexión — datos del chip NFC',
    sans_app: 'Sin app',
    en_ligne: 'En línea',
    offline: 'Sin conexión',
    donneur: 'Donante',
    race: 'Raza',
    espece: 'Especie',
    poste: 'Puesto',
    contact_rh: 'Contacto RR.HH.',
    appeler: (n: string) => `🚨 Llamar al ${n}`,
  },
  de: {
    urgence: '🚨 Medizinischer Notfall',
    animal: '🐾 Verlorenes Tier',
    enfant: '🧒 Kind in Gefahr',
    chantier: '🏗️ Arbeitsunfall',
    alertes: 'Kritische Warnungen',
    groupe_sanguin: 'Blutgruppe',
    traitement: 'Behandlung',
    pathologies: 'Erkrankungen',
    medecin: 'Arzt',
    veterinaire: 'Tierarzt',
    telephone: 'Telefon',
    habilitations: 'Zertifizierungen',
    guide: 'Annäherungsführer',
    consignes: 'Anweisungen',
    allergies: 'Allergien',
    prioritaire: 'Priorität',
    prevenir: '🚨 Notfallkontakte benachrichtigen',
    prevenu: '✅ Kontakte benachrichtigt!',
    hors_ligne: '📡 Offline-Modus — Daten vom NFC-Chip',
    sans_app: 'Ohne App',
    en_ligne: 'Online',
    offline: 'Offline',
    donneur: 'Spender',
    race: 'Rasse',
    espece: 'Tierart',
    poste: 'Position',
    contact_rh: 'HR-Kontakt',
    appeler: (n: string) => `🚨 Notruf ${n}`,
  },
  it: {
    urgence: '🚨 Emergenza medica',
    animal: '🐾 Animale perso',
    enfant: '🧒 Bambino in pericolo',
    chantier: '🏗️ Incidente sul lavoro',
    alertes: 'Allerta critica',
    groupe_sanguin: 'Gruppo sanguigno',
    traitement: 'Trattamento',
    pathologies: 'Patologie',
    medecin: 'Medico',
    veterinaire: 'Veterinario',
    telephone: 'Telefono',
    habilitations: 'Certificazioni',
    guide: 'Guida approccio',
    consignes: 'Istruzioni',
    allergies: 'Allergie',
    prioritaire: 'Prioritario',
    prevenir: '🚨 Avvisare i contatti',
    prevenu: '✅ Contatti avvisati!',
    hors_ligne: '📡 Modalità offline — dati dal chip NFC',
    sans_app: 'Senza app',
    en_ligne: 'Online',
    offline: 'Offline',
    donneur: 'Donatore',
    race: 'Razza',
    espece: 'Specie',
    poste: 'Posizione',
    contact_rh: 'Contatto HR',
    appeler: (n: string) => `🚨 Chiama il ${n}`,
  },
}

type LangKey = keyof typeof TRANSLATIONS

function formatTime() {
  return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function getAlertePills(fiche: Partial<Fiche>): string[] {
  const pills: string[] = []
  if (fiche.allergies) {
    fiche.allergies.split(',').forEach(a => {
      const t = a.trim()
      if (t) pills.push(`🚫 ${t}`)
    })
  }
  const traits = fiche.traitements?.toLowerCase() || ''
  if (traits.includes('anticoagulant') || traits.includes('rivaroxaban') || traits.includes('warfarine') || traits.includes('xarelto')) {
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
  const [lang, setLang] = useState<LangKey>('fr')
  const [emergencyNumber, setEmergencyNumber] = useState<string>(() => getEmergencyFromTimezone())
  const [time, setTime] = useState(formatTime())
  const [alertSent, setAlertSent] = useState(false)
  const [alertSending, setAlertSending] = useState(false)
  const geoRef = useRef<{ lat: number; lon: number } | null>(null)

  useEffect(() => {
    // Detect language
    const navLang = navigator.language?.substring(0, 2).toLowerCase() as LangKey
    if (navLang && TRANSLATIONS[navLang]) setLang(navLang)
  }, [])

  useEffect(() => {
    const t = setInterval(() => setTime(formatTime()), 30000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    async function load() {
      // Try geolocation
      if (navigator.geolocation) {
        const geoPromise = new Promise<void>(resolve => {
          const timer = setTimeout(resolve, 3000)
          navigator.geolocation.getCurrentPosition(
            pos => { clearTimeout(timer); geoRef.current = { lat: pos.coords.latitude, lon: pos.coords.longitude }; resolve() },
            () => { clearTimeout(timer); resolve() },
            { timeout: 3000, maximumAge: 60000 }
          )
        })
        await geoPromise
        // Upgrade numéro d'urgence avec géoloc précise
        if (geoRef.current) {
          getEmergencyFromCoords(geoRef.current.lat, geoRef.current.lon)
            .then(n => setEmergencyNumber(n))
        }
      }

      if (navigator.onLine) {
        try {
          const supabase = createClient()
          const [{ data: ficheData }, { data: braceletData }] = await Promise.all([
            supabase.from('fiches').select('*').eq('bracelet_id', braceletId).maybeSingle(),
            supabase.from('bracelets').select('nom_profil, gamme').eq('bracelet_id', braceletId).maybeSingle(),
          ])

          void supabase.from('scans').insert({
            bracelet_id: braceletId,
            user_agent: navigator.userAgent.slice(0, 200),
            latitude: geoRef.current?.lat ?? null,
            longitude: geoRef.current?.lon ?? null,
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
          latitude: geoRef.current?.lat,
          longitude: geoRef.current?.lon,
        }),
      })
      setAlertSent(true)
    } catch {}
    setAlertSending(false)
  }

  const t = TRANSLATIONS[lang]

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0E0E0E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '3px solid rgba(255,255,255,.15)', borderTopColor: '#E8472A', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  if (!fiche) {
    return (
      <div className="pub-not-found">
        <div>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🔍</div>
          <h1 style={{ marginBottom: 8 }}>Bracelet introuvable</h1>
          <p>L&apos;identifiant <strong>{braceletId}</strong> ne correspond à aucun bracelet.</p>
          <p style={{ marginTop: 12 }}>
            <a href="https://pulsmee.fr" style={{ color: '#E8472A', fontWeight: 700 }}>pulsmee.fr</a>
          </p>
        </div>
      </div>
    )
  }

  const gammeColor = GAMME_COLORS[gamme] ?? '#E8472A'
  const gammeColorDark = gamme === 'Care' ? '#C73518' : gamme === 'Kids' ? '#7A52B0' : gamme === 'Sport' ? '#1F6B52' : gamme === 'Pet' ? '#C77318' : '#2A4568'
  const isPet = gamme === 'Pet'
  const isKids = gamme === 'Kids'
  const isWork = gamme === 'Work'
  const age = calcAge(fiche.date_naissance)
  const alertes = getAlertePills(fiche)

  const contacts = [
    { nom: fiche.contact1_nom, tel: fiche.contact1_tel, relation: (fiche as Fiche & { contact1_relation?: string }).contact1_relation || '' },
    { nom: fiche.contact2_nom, tel: fiche.contact2_tel, relation: (fiche as Fiche & { contact2_relation?: string }).contact2_relation || '' },
    { nom: fiche.contact3_nom, tel: fiche.contact3_tel, relation: (fiche as Fiche & { contact3_relation?: string }).contact3_relation || '' },
  ].filter(c => c.nom && c.tel)

  let habilitations: Habilitation[] = []
  if (isWork) {
    try { habilitations = JSON.parse((fiche as Fiche & { habilitations?: string }).habilitations || '[]') } catch {}
  }

  const badgeText = isPet ? t.animal : isKids ? t.enfant : isWork ? t.chantier : t.urgence
  const initial = isPet ? '🐾' : (fiche.nom_complet || nomProfil || '?').charAt(0).toUpperCase()
  const bodyBg = gamme === 'Care' ? '#FFF5F5' : gamme === 'Kids' ? '#F5F0FF' : gamme === 'Sport' ? '#F0FDF4' : gamme === 'Pet' ? '#FFF7ED' : '#EFF6FF'

  return (
    <div className="pub-wrap">
      {isOffline && (
        <div className="pub-offline-banner">{t.hors_ligne}</div>
      )}
      <div className="pub-phone">

        {/* Lang bar */}
        <div className="pub-langbar" style={{ background: `linear-gradient(160deg, ${gammeColorDark}, ${gammeColor})` }}>
          <span className="pub-globe">🌐</span>
          {(['fr','en','es','de','it'] as LangKey[]).map(l => (
            <button key={l} className={`pub-langbtn${lang === l ? ' active' : ''}`} onClick={() => setLang(l)}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Hero */}
        <div className="pub-hero" style={{ background: `linear-gradient(160deg, ${gammeColorDark}, ${gammeColor})` }}>
          <div className="pub-avatar-initial">
            {fiche.photo_url && !isPet
              ? <img src={fiche.photo_url} alt={fiche.nom_complet || ''} />
              : <span style={{ fontSize: isPet ? 22 : 20 }}>{initial}</span>
            }
          </div>

          <div className="pub-badge">
            <div className="pub-blink" />
            {badgeText}
          </div>

          <div className="pub-name">{fiche.nom_complet || nomProfil || 'Porteur du bracelet'}</div>

          <div className="pub-meta">
            {isPet && fiche.espece && <span>{fiche.espece}{fiche.race ? ` · ${fiche.race}` : ''}</span>}
            {isWork && fiche.poste && <span>{fiche.poste}</span>}
            {age !== null && <span>{age} ans</span>}
            {fiche.groupe_sanguin && !isPet && (
              <span className="pub-blood-tag" style={{ color: gammeColor }}>{fiche.groupe_sanguin}</span>
            )}
          </div>

          {/* Emergency button — label changes with language */}
          <a href={`tel:${emergencyNumber}`} className="pub-emergency-btn" style={{ color: gammeColor }}>
            {t.appeler(emergencyNumber)}
          </a>
        </div>

        {/* Body */}
        <div className="pub-body" style={{ background: bodyBg }}>

          {/* Alertes */}
          {alertes.length > 0 && (
            <div className="pub-alert" style={{ background: `${gammeColor}15`, borderColor: `${gammeColor}40` }}>
              <div className="pub-alert-title" style={{ color: gammeColorDark }}>⚠️ {t.alertes}</div>
              <div className="pub-pills">
                {alertes.map((a, i) => (
                  <span key={i} className="pub-pill" style={{ background: i === 0 ? '#EF4444' : i === 1 ? '#DC2626' : '#B91C1C' }}>{a}</span>
                ))}
              </div>
            </div>
          )}

          {/* Allergies (toujours visible si présent) */}
          {fiche.allergies && alertes.filter(a => a.startsWith('🚫')).length === 0 && (
            <div className="pub-card">
              <div className="pub-row">
                <span className="pub-rl">{t.allergies}</span>
                <span className="pub-rv danger">{fiche.allergies}</span>
              </div>
            </div>
          )}

          {/* Infos médicales */}
          {(!isPet) && (fiche.groupe_sanguin || fiche.traitements || fiche.pathologies) && (
            <div className="pub-card">
              {fiche.groupe_sanguin && (
                <div className="pub-row">
                  <span className="pub-rl">{t.groupe_sanguin}</span>
                  <span className="pub-rv" style={{ color: gammeColor, fontWeight: 800 }}>{fiche.groupe_sanguin}</span>
                </div>
              )}
              {fiche.traitements && (
                <div className="pub-row">
                  <span className="pub-rl">{t.traitement}</span>
                  <span className="pub-rv danger">{fiche.traitements.slice(0, 80)}{fiche.traitements.length > 80 ? '…' : ''}</span>
                </div>
              )}
              {fiche.pathologies && !isWork && (
                <div className="pub-row">
                  <span className="pub-rl">{t.pathologies}</span>
                  <span className="pub-rv">{fiche.pathologies}</span>
                </div>
              )}
            </div>
          )}

          {/* Infos Pet */}
          {isPet && (fiche.espece || fiche.race || fiche.traitements) && (
            <div className="pub-card">
              {fiche.espece && <div className="pub-row"><span className="pub-rl">{t.espece}</span><span className="pub-rv">{fiche.espece}</span></div>}
              {fiche.race && <div className="pub-row"><span className="pub-rl">{t.race}</span><span className="pub-rv">{fiche.race}</span></div>}
              {fiche.traitements && <div className="pub-row"><span className="pub-rl">{t.traitement}</span><span className="pub-rv danger">{fiche.traitements}</span></div>}
            </div>
          )}

          {/* Habilitations Work */}
          {isWork && habilitations.length > 0 && (
            <div className="pub-card">
              <div className="pub-row" style={{ background: '#F9FAFB' }}>
                <span className="pub-rl" style={{ color: '#374151' }}>📜 {t.habilitations}</span>
              </div>
              {habilitations.map((h, i) => (
                <div key={i} className="pub-hab-row">
                  <span className="pub-hab-name">{h.nom}</span>
                  <span className={`pub-hab-pill ${h.statut}`}>
                    {h.statut === 'valid' ? '✅ Valide' : h.statut === 'soon' ? '⚠️ Bientôt' : '❌ Expiré'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Guide autisme Kids */}
          {isKids && fiche.guide_autisme && (
            <div className="pub-consignes" style={{ background: `${gammeColor}10`, borderLeft: `3px solid ${gammeColor}` }}>
              <div className="pub-consignes-title" style={{ color: gammeColor }}>💙 {t.guide}</div>
              {fiche.guide_autisme}
            </div>
          )}

          {/* Médecin — carte séparée */}
          {(fiche.medecin || fiche.medecin_tel) && (
            <div className="pub-doctor-card">
              <div className="pub-doctor-header">
                🩺 {isPet ? t.veterinaire : isWork ? t.contact_rh : t.medecin}
              </div>
              {fiche.medecin && (
                <div className="pub-row">
                  <span className="pub-rl">{t.medecin}</span>
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
          )}

          {/* Bouton prévenir contacts */}
          {contacts.length > 0 && (
            <button
              className="pub-alert-btn"
              style={{ background: alertSent ? '#16A34A' : gammeColor }}
              onClick={handleAlertContacts}
              disabled={alertSent || alertSending}
            >
              {alertSending ? '⏳ Envoi...' : alertSent ? t.prevenu : t.prevenir}
            </button>
          )}

          {/* Contacts */}
          {contacts.map((c, i) => (
            <div key={i} className="pub-contact">
              <div className="pub-ava" style={{ background: i === 0 ? `${gammeColor}20` : '#F3F4F6' }}>
                {getRelationEmoji(c.relation)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="pub-cname">{c.nom}</div>
                <div className="pub-crole">
                  {c.relation ? getRelationLabel(c.relation) : (i === 0 ? t.prioritaire : `Contact ${i + 1}`)}
                </div>
              </div>
              <a href={`tel:${c.tel}`} className="pub-call" style={{ background: gammeColor }}>📞</a>
            </div>
          ))}

          {/* Consignes */}
          {fiche.consignes && (
            <div className="pub-consignes">
              <div className="pub-consignes-title">{t.consignes}</div>
              {fiche.consignes}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="pub-footer">
          <div className="pub-footer-brand" style={{ color: gammeColor }}>✦ Pulsmee {gamme} · Fiche d&apos;urgence</div>
          <div className="pub-footer-sub">{t.sans_app} · {isOffline ? t.offline : t.en_ligne} · pulsmee.fr/p/{braceletId}</div>
        </div>
      </div>
    </div>
  )
}
