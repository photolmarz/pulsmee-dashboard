import { createServerSupabaseClient } from '@/lib/supabase-server'
import { headers } from 'next/headers'
import { calcAge, GAMME_COLORS } from '@/lib/utils'
import type { Fiche } from '@/types'
import type { Metadata } from 'next'

type Props = {
  params: { bracelet_id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('fiches')
    .select('nom_complet, groupe_sanguin')
    .eq('bracelet_id', params.bracelet_id.toUpperCase())
    .maybeSingle()

  if (!data?.nom_complet) {
    return { title: 'Fiche d\'urgence · Pulsmee' }
  }

  return {
    title: `🚨 Urgence · ${data.nom_complet} · Pulsmee`,
    description: `Fiche médicale d'urgence de ${data.nom_complet} — Groupe sanguin : ${data.groupe_sanguin}`,
  }
}

function formatTime() {
  return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

type Habilitation = { nom: string; statut: 'valid' | 'soon' | 'expired' }

function getAlertePills(fiche: Fiche): string[] {
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

export default async function PublicPage({ params }: Props) {
  const supabase = await createServerSupabaseClient()
  const braceletId = params.bracelet_id.toUpperCase()

  const [{ data: fiche }, { data: bracelet }] = await Promise.all([
    supabase.from('fiches').select('*').eq('bracelet_id', braceletId).maybeSingle(),
    supabase.from('bracelets').select('nom_profil, gamme').eq('bracelet_id', braceletId).maybeSingle(),
  ])

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

  const headersList = headers()
  const userAgent = headersList.get('user-agent') || ''
  void supabase.from('scans').insert({
    bracelet_id: braceletId,
    user_agent: userAgent.slice(0, 200),
  })

  const gamme = bracelet?.gamme ?? 'Care'
  const gammeColor = GAMME_COLORS[gamme] ?? '#E8472A'
  const isPet = gamme === 'Pet'
  const isKids = gamme === 'Kids'
  const isWork = gamme === 'Work'

  const age = calcAge((fiche as Fiche & { date_naissance?: string }).date_naissance)
  const alertes = getAlertePills(fiche as Fiche)

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

  const ficheExt = fiche as Fiche & { espece?: string; race?: string; poste?: string; guide_autisme?: string }

  return (
    <div className="pub-wrap">
      <div className="pub-phone">
        <div className="pub-back-bar">
          <a href="/dashboard" className="pub-back-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Retour
          </a>
        </div>
        <div className="pub-statusbar">
          <span>{formatTime()}</span>
          <span>📶 🔋</span>
        </div>

        <div className="pub-hero" style={{ background: `linear-gradient(135deg, ${gammeColor}22 0%, transparent 60%)` }}>
          <div className="pub-badge" style={{ background: `${gammeColor}22`, color: gammeColor, borderColor: `${gammeColor}44` }}>
            <div className="pub-blink" style={{ background: gammeColor }} />
            {isPet ? '🐾 Fiche animale' : '🚨 Urgence médicale'}
          </div>
          {fiche.photo_url && !isPet && (
            <img src={fiche.photo_url} alt={fiche.nom_complet} className="pub-photo" style={{ borderColor: gammeColor }} />
          )}
          <div className="pub-name">{fiche.nom_complet || bracelet?.nom_profil || 'Porteur du bracelet'}</div>
          <div className="pub-meta">
            {isPet && ficheExt.espece && <span>{ficheExt.espece}{ficheExt.race ? ` · ${ficheExt.race}` : ''}</span>}
            {isWork && ficheExt.poste && <span style={{ fontSize: 12 }}>{ficheExt.poste}</span>}
            {age !== null && <span>{age} ans</span>}
            {age !== null && fiche.groupe_sanguin ? ' · ' : null}
            {fiche.groupe_sanguin && !isPet && (
              <span className="pub-blood" style={{ background: `${gammeColor}22`, color: gammeColor }}>{fiche.groupe_sanguin}</span>
            )}
          </div>
          {mainContact && (
            <a href={`tel:${mainContact.tel}`} className="pub-cta" style={{ background: gammeColor }}>
              📞 Appeler {mainContact.nom.split(' ')[0]}
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
                  <a href={`tel:${fiche.medecin_tel}`} style={{ color: gammeColor, fontWeight: 700 }}>
                    {fiche.medecin_tel}
                  </a>
                </span>
              </div>
            )}
          </div>

          {/* Habilitations Work */}
          {isWork && habilitations.length > 0 && (
            <div className="pub-card">
              <div className="pub-row" style={{ borderBottom: `1px solid var(--stone)`, paddingBottom: 8, marginBottom: 8 }}>
                <span className="pub-rl" style={{ fontWeight: 700, color: 'var(--ink)' }}>Habilitations</span>
              </div>
              {habilitations.map((h, i) => (
                <div key={i} className="pub-row">
                  <span className="pub-rl">{h.nom}</span>
                  <span className="pub-rv">
                    {h.statut === 'valid' ? '🟢 Valide' : h.statut === 'soon' ? '🟠 Expire bientôt' : '🔴 Expiré'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Guide autisme Kids */}
          {isKids && ficheExt.guide_autisme && (
            <div className="pub-consignes" style={{ background: `${gammeColor}10`, borderColor: `${gammeColor}30`, color: 'var(--ink)' }}>
              <div style={{ fontWeight: 700, marginBottom: 6, color: gammeColor }}>💙 Guide d'approche</div>
              {ficheExt.guide_autisme}
            </div>
          )}

          {contacts.map((c, i) => (
            <div key={i} className="pub-contact">
              <div className="pub-ava" style={{ background: i === 0 ? `${gammeColor}22` : '#EDE9FE' }}>
                {c.ava}
              </div>
              <div style={{ flex: 1 }}>
                <div className="pub-cname">{c.nom}</div>
                <div className="pub-crole">{c.role}</div>
              </div>
              <a href={`tel:${c.tel}`} className="pub-call" style={{ background: gammeColor }}>📞 Appeler</a>
            </div>
          ))}

          {fiche.consignes && (
            <div className="pub-consignes">
              {fiche.consignes}
            </div>
          )}
        </div>

        <div className="pub-footer">
          <div className="pub-footer-brand" style={{ color: gammeColor }}>✦ Pulsmee {gamme} · Fiche d'urgence</div>
          <div className="pub-footer-sub">Sans app · Sans réseau · pulsmee.fr/p/{braceletId}</div>
        </div>
      </div>
    </div>
  )
}
