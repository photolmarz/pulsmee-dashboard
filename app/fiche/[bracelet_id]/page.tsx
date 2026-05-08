'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Logo from '@/components/Logo'
import Drawer from '@/components/Drawer'
import { createClient } from '@/lib/supabase'
import { downloadVCard, calcAge, GAMME_COLORS } from '@/lib/utils'
import type { User } from '@supabase/supabase-js'
import type { Bracelet, Fiche } from '@/types'

const GROUPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

type Habilitation = { nom: string; statut: 'valid' | 'soon' | 'expired' }

const STATUT_LABELS = {
  valid: '🟢 Valide',
  soon: '🟠 Expire bientôt',
  expired: '🔴 Expiré',
}

type NFCStatus = 'idle' | 'waiting' | 'success' | 'error' | 'unsupported'

function defaultFiche(braceletId: string, gamme: string): Fiche {
  return {
    id: '', bracelet_id: braceletId,
    nom_complet: '', date_naissance: null, groupe_sanguin: '',
    allergies: '', traitements: '', pathologies: '',
    contact1_nom: '', contact1_tel: '',
    contact2_nom: '', contact2_tel: '',
    contact3_nom: '', contact3_tel: '',
    medecin: '', medecin_tel: '', consignes: '',
    photo_url: null,
    poste: '',
    habilitations: '[]',
    guide_autisme: gamme === 'Kids' ? "Cet enfant est autiste. Approchez-vous calmement, parlez doucement, évitez les gestes brusques. Ne le forcez pas à vous regarder dans les yeux. Appelez immédiatement ses parents." : '',
    espece: '',
    race: '',
    updated_at: '',
  }
}

export default function FichePage() {
  const params = useParams()
  const braceletIdParam = (params?.bracelet_id as string)?.toUpperCase()

  const [user, setUser] = useState<User | null>(null)
  const [bracelet, setBracelet] = useState<Bracelet | null>(null)
  const [bracelets, setBracelets] = useState<Bracelet[]>([])
  const [fiche, setFiche] = useState<Fiche | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [nfcStatus, setNfcStatus] = useState<NFCStatus>('idle')
  const [showNFCModal, setShowNFCModal] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)
  const toastTimer = useRef<NodeJS.Timeout>()
  const photoInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3500)
  }, [])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/inscription'); return }
      setUser(user)

      const { data: br } = await supabase
        .from('bracelets')
        .select('*')
        .eq('bracelet_id', braceletIdParam)
        .eq('user_id', user.id)
        .maybeSingle()

      if (!br) { setNotFound(true); setLoading(false); return }
      setBracelet(br)

      const { data: allBr } = await supabase.from('bracelets').select('*').eq('user_id', user.id).order('created_at')
      setBracelets(allBr ?? [])

      const { data: f } = await supabase
        .from('fiches')
        .select('*')
        .eq('bracelet_id', braceletIdParam)
        .maybeSingle()

      setFiche(f ?? defaultFiche(braceletIdParam, br.gamme))
      setLoading(false)
    }
    load()
  }, [braceletIdParam, router, supabase])

  function update(field: keyof Fiche, value: string | number | null) {
    setFiche(prev => prev ? { ...prev, [field]: value } : prev)
    setDirty(true)
  }

  const gamme = bracelet?.gamme ?? 'Care'
  const gammeColor = GAMME_COLORS[gamme] ?? '#E8472A'

  // Habilitations helpers (Work)
  function getHabilitations(): Habilitation[] {
    try { return JSON.parse(fiche?.habilitations || '[]') } catch { return [] }
  }
  function setHabilitations(list: Habilitation[]) {
    update('habilitations', JSON.stringify(list))
  }
  function addHabilitation() {
    setHabilitations([...getHabilitations(), { nom: '', statut: 'valid' }])
  }
  function updateHabilitation(i: number, field: keyof Habilitation, value: string) {
    const list = getHabilitations()
    list[i] = { ...list[i], [field]: value }
    setHabilitations(list)
  }
  function removeHabilitation(i: number) {
    setHabilitations(getHabilitations().filter((_, idx) => idx !== i))
  }

  async function handleSave() {
    if (!fiche || !user) return
    setSaving(true)
    try {
      const { error } = await supabase.from('fiches').upsert({
        bracelet_id: braceletIdParam,
        nom_complet: fiche.nom_complet,
        date_naissance: fiche.date_naissance,
        groupe_sanguin: fiche.groupe_sanguin,
        allergies: fiche.allergies,
        traitements: fiche.traitements,
        pathologies: fiche.pathologies,
        contact1_nom: fiche.contact1_nom, contact1_tel: fiche.contact1_tel,
        contact2_nom: fiche.contact2_nom, contact2_tel: fiche.contact2_tel,
        contact3_nom: fiche.contact3_nom, contact3_tel: fiche.contact3_tel,
        medecin: fiche.medecin, medecin_tel: fiche.medecin_tel,
        consignes: fiche.consignes,
        poste: fiche.poste,
        habilitations: fiche.habilitations,
        guide_autisme: fiche.guide_autisme,
        espece: fiche.espece,
        race: fiche.race,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'bracelet_id' })
      if (error) throw error
      setDirty(false)
      showToast('✅ Fiche sauvegardée !')
    } catch {
      showToast('❌ Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setPhotoUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${braceletIdParam}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(path, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(path)
      const { error: updateError } = await supabase.from('fiches')
        .upsert({ bracelet_id: braceletIdParam, photo_url: publicUrl }, { onConflict: 'bracelet_id' })
      if (updateError) throw updateError
      setFiche(prev => prev ? { ...prev, photo_url: publicUrl } : prev)
      showToast('📸 Photo mise à jour !')
    } catch (err) {
      console.error('[photo upload]', err)
      showToast('❌ Erreur upload photo — vérifiez le bucket Supabase')
    } finally {
      setPhotoUploading(false)
      if (photoInputRef.current) photoInputRef.current.value = ''
    }
  }

  async function programNFC() {
    if (!bracelet) return
    if (!('NDEFReader' in window)) {
      showToast('📱 Utilisez l\'app NFC Tools sur iPhone')
      return
    }
    setShowNFCModal(true)
    setNfcStatus('waiting')
    try {
      // @ts-expect-error — Web NFC API
      const ndef = new NDEFReader()
      await ndef.write({ records: [{ recordType: 'url', data: `https://pulsmee.fr/p/${bracelet.bracelet_id}` }] })
      await supabase.from('bracelets').update({ puce_programmee: true, derniere_programmation: new Date().toISOString() }).eq('bracelet_id', bracelet.bracelet_id)
      setBracelet(prev => prev ? { ...prev, puce_programmee: true, derniere_programmation: new Date().toISOString() } : prev)
      setNfcStatus('success')
      setTimeout(() => { setShowNFCModal(false); showToast('✅ Puce programmée !'); setNfcStatus('idle') }, 1500)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('permission')) showToast('⚠️ Activez le NFC dans vos paramètres')
      else showToast('❌ Erreur NFC')
      setNfcStatus('error')
      setShowNFCModal(false)
    }
  }

  function handleDownloadVCard() {
    if (!fiche || !bracelet) return
    downloadVCard(fiche, bracelet)
    showToast('⬇️ Fiche vCard téléchargée !')
  }

  if (loading) {
    return <div style={{ background: 'var(--cream)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" style={{ width: 32, height: 32, borderTopColor: 'var(--pulse)', borderColor: 'var(--stone)' }} /></div>
  }

  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 48 }}>🔒</div>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)' }}>Bracelet introuvable</h1>
        <p style={{ color: 'var(--ink-light)', fontSize: 14 }}>Ce bracelet n'est pas associé à votre compte.</p>
        <button onClick={() => router.push('/dashboard')} className="back-btn">← Retour au dashboard</button>
      </div>
    )
  }

  const age = calcAge(fiche?.date_naissance)
  const ficheRemplie = !!(fiche?.nom_complet)

  const isPet = gamme === 'Pet'
  const isKids = gamme === 'Kids'
  const isWork = gamme === 'Work'
  const isHuman = !isPet

  const habilitations = getHabilitations()

  return (
    <>
      <header className="app-header" style={{ '--gamme-color': gammeColor } as React.CSSProperties}>
        <button className="back-btn" onClick={() => router.push('/dashboard')} aria-label="Retour">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          {bracelet?.nom_profil || 'Ma fiche'}
        </button>
        <button className={`hamburger${drawerOpen ? ' is-open' : ''}`} onClick={() => setDrawerOpen(true)} aria-label="Ouvrir le menu">
          <div className="h-line" /><div className="h-line" /><div className="h-line" />
        </button>
      </header>

      <div className="page-wrap">
        <div className="page-content">
          <div className="pg-eyebrow" style={{ color: gammeColor }}>Pulsmee {gamme} · {bracelet?.bracelet_id}</div>
          <h1 className="pg-title" style={{ '--gamme-color': gammeColor } as React.CSSProperties}>
            {isPet ? <>Ma fiche <em style={{ color: gammeColor }}>animale</em></> : <>Ma fiche <em style={{ color: gammeColor }}>médicale</em></>}
          </h1>
          <p className="pg-sub">Ces informations s'affichent quand votre bracelet est scanné.</p>

          {/* ── IDENTITÉ ── */}
          <div className="fiche-section">
            <div className="fs-header">
              <div className="fs-icon" style={{ background: `${gammeColor}18` }}>{isPet ? '🐾' : '👤'}</div>
              <div className="fs-title">Identité</div>
            </div>
            <div className="fs-body">
              {/* Photo (humains uniquement) */}
              {isHuman && (
                <div className="photo-upload-row">
                  <div className="photo-circle" onClick={() => photoInputRef.current?.click()} style={{ borderColor: gammeColor }}>
                    {fiche?.photo_url
                      ? <img src={fiche.photo_url} alt="Photo" className="photo-img" />
                      : <span className="photo-initials">{fiche?.nom_complet?.[0]?.toUpperCase() || '?'}</span>
                    }
                    <div className="photo-overlay" style={{ background: `${gammeColor}cc` }}>
                      {photoUploading
                        ? <div className="spinner" />
                        : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                      }
                    </div>
                  </div>
                  <div>
                    <div className="photo-hint-title">Photo de profil</div>
                    <div className="photo-hint-sub">Visible sur la fiche d'urgence</div>
                  </div>
                  <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
                </div>
              )}

              <div className="fi-row">
                <div className="fi-field">
                  <label className="fi-label" htmlFor="nom">{isPet ? 'Nom de l\'animal' : 'Nom complet'}</label>
                  <input id="nom" type="text" className="fi-input" value={fiche?.nom_complet ?? ''} onChange={e => update('nom_complet', e.target.value)} placeholder={isPet ? 'Max' : 'Jean Moreau'} />
                </div>
                <div className="fi-field">
                  <label className="fi-label" htmlFor="dob">Date de naissance{age !== null ? ` — ${age} ans` : ''}</label>
                  <input id="dob" type="date" className="fi-input" value={fiche?.date_naissance ?? ''} onChange={e => update('date_naissance', e.target.value || null)} max={new Date().toISOString().split('T')[0]} />
                </div>
              </div>

              {isPet && (
                <div className="fi-row">
                  <div className="fi-field">
                    <label className="fi-label">Espèce</label>
                    <input type="text" className="fi-input" value={fiche?.espece ?? ''} onChange={e => update('espece', e.target.value)} placeholder="Chien" />
                  </div>
                  <div className="fi-field">
                    <label className="fi-label">Race</label>
                    <input type="text" className="fi-input" value={fiche?.race ?? ''} onChange={e => update('race', e.target.value)} placeholder="Labrador" />
                  </div>
                </div>
              )}

              {isWork && (
                <div className="fi-field">
                  <label className="fi-label">Poste / Fonction</label>
                  <input type="text" className="fi-input" value={fiche?.poste ?? ''} onChange={e => update('poste', e.target.value)} placeholder="Électricien · Zone haute tension" />
                </div>
              )}

              {!isPet && (
                <div className="fi-field">
                  <label className="fi-label" htmlFor="groupe">Groupe sanguin</label>
                  <select id="groupe" className="fi-select" value={fiche?.groupe_sanguin ?? ''} onChange={e => update('groupe_sanguin', e.target.value)}>
                    <option value="">— Sélectionner —</option>
                    {GROUPES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* ── HABILITATIONS (Work uniquement) ── */}
          {isWork && (
            <div className="fiche-section">
              <div className="fs-header">
                <div className="fs-icon" style={{ background: `${gammeColor}18` }}>📋</div>
                <div className="fs-title">Habilitations</div>
              </div>
              <div className="fs-body">
                {habilitations.map((h, i) => (
                  <div key={i} className="fi-row" style={{ alignItems: 'center' }}>
                    <div className="fi-field" style={{ flex: 2 }}>
                      <input type="text" className="fi-input" value={h.nom} onChange={e => updateHabilitation(i, 'nom', e.target.value)} placeholder="Habilitation électrique B2V..." />
                    </div>
                    <div className="fi-field" style={{ flex: 1 }}>
                      <select className="fi-select" value={h.statut} onChange={e => updateHabilitation(i, 'statut', e.target.value)}>
                        <option value="valid">🟢 Valide</option>
                        <option value="soon">🟠 Expire bientôt</option>
                        <option value="expired">🔴 Expiré</option>
                      </select>
                    </div>
                    <button onClick={() => removeHabilitation(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-light)', fontSize: 18, padding: '0 4px', flexShrink: 0 }} aria-label="Supprimer">×</button>
                  </div>
                ))}
                <button onClick={addHabilitation} className="fi-add-btn" style={{ borderColor: gammeColor, color: gammeColor }}>
                  + Ajouter une habilitation
                </button>
              </div>
            </div>
          )}

          {/* ── MÉDICAL / VÉTÉRINAIRE ── */}
          <div className="fiche-section">
            <div className="fs-header">
              <div className="fs-icon" style={{ background: `${gammeColor}18` }}>{isPet ? '🏥' : '🏥'}</div>
              <div className="fs-title">{isPet ? 'Informations vétérinaires' : 'Informations médicales'}</div>
            </div>
            <div className="fs-body">
              <div className="fi-field">
                <label className="fi-label">⚠️ Allergies</label>
                <input type="text" className="fi-input" value={fiche?.allergies ?? ''} onChange={e => update('allergies', e.target.value)} placeholder={isPet ? 'Produits, médicaments...' : 'Pénicilline, Aspirine...'} />
              </div>
              <div className="fi-field">
                <label className="fi-label">{isPet ? 'Traitements vétérinaires en cours' : 'Traitements en cours'}</label>
                <textarea className="fi-textarea" value={fiche?.traitements ?? ''} onChange={e => update('traitements', e.target.value)} placeholder={isPet ? 'Antiparasitaires, vaccins...' : 'Rivaroxaban 20mg/j...'} />
              </div>
              {!isPet && !isWork && (
                <div className="fi-field">
                  <label className="fi-label">{isKids ? 'Pathologies / TSA / Autisme' : 'Pathologies chroniques'}</label>
                  <input type="text" className="fi-input" value={fiche?.pathologies ?? ''} onChange={e => update('pathologies', e.target.value)} placeholder={isKids ? 'Autisme, Épilepsie...' : 'Diabète, Insuffisance cardiaque...'} />
                </div>
              )}
              <div className="fi-row">
                <div className="fi-field">
                  <label className="fi-label">{isPet ? 'Vétérinaire' : isWork ? 'Contact RH / Responsable' : 'Médecin traitant'}</label>
                  <input type="text" className="fi-input" value={fiche?.medecin ?? ''} onChange={e => update('medecin', e.target.value)} placeholder={isPet ? 'Dr. Martin, Clinique Véto...' : isWork ? 'Marie Dupont — RH' : 'Dr. Sophie Laurent'} />
                </div>
                <div className="fi-field">
                  <label className="fi-label">Téléphone</label>
                  <input type="tel" className="fi-input" value={fiche?.medecin_tel ?? ''} onChange={e => update('medecin_tel', e.target.value)} placeholder="01 23 45 67 89" />
                </div>
              </div>
            </div>
          </div>

          {/* ── GUIDE AUTISME (Kids uniquement) ── */}
          {isKids && (
            <div className="fiche-section">
              <div className="fs-header">
                <div className="fs-icon" style={{ background: `${gammeColor}18` }}>💙</div>
                <div className="fs-title">Guide d'approche</div>
              </div>
              <div className="fs-body">
                <div className="fi-field">
                  <label className="fi-label">Instructions pour les secours / témoins</label>
                  <textarea className="fi-textarea" style={{ minHeight: 120 }} value={fiche?.guide_autisme ?? ''} onChange={e => update('guide_autisme', e.target.value)} placeholder="Cet enfant est autiste..." />
                </div>
              </div>
            </div>
          )}

          {/* ── CONTACTS ── */}
          <div className="fiche-section">
            <div className="fs-header">
              <div className="fs-icon" style={{ background: `${gammeColor}18` }}>📞</div>
              <div className="fs-title">{isKids ? 'Parents' : isPet ? 'Propriétaires' : 'Contacts d\'urgence'}</div>
            </div>
            <div className="fs-body">
              {([
                {
                  label: isKids ? 'Parent 1 — Prioritaire' : isPet ? 'Propriétaire 1 — Prioritaire' : 'Contact 1 — Prioritaire',
                  nomKey: 'contact1_nom' as const,
                  telKey: 'contact1_tel' as const,
                },
                {
                  label: isKids ? 'Parent 2' : isPet ? 'Propriétaire 2' : 'Contact 2',
                  nomKey: 'contact2_nom' as const,
                  telKey: 'contact2_tel' as const,
                },
                ...(!isPet && !isKids ? [{
                  label: 'Contact 3',
                  nomKey: 'contact3_nom' as const,
                  telKey: 'contact3_tel' as const,
                }] : []),
              ]).map(({ label, nomKey, telKey }) => (
                <div key={nomKey} className="contact-block">
                  <div className="cb-label">{label}</div>
                  <div className="fi-row">
                    <input type="text" className="fi-input" value={fiche?.[nomKey] ?? ''} onChange={e => update(nomKey, e.target.value)} placeholder="Nom du contact" />
                    <input type="tel" className="fi-input" value={fiche?.[telKey] ?? ''} onChange={e => update(telKey, e.target.value)} placeholder="06 XX XX XX XX" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── CONSIGNES ── */}
          <div className="fiche-section">
            <div className="fs-header">
              <div className="fs-icon" style={{ background: `${gammeColor}18` }}>📋</div>
              <div className="fs-title">{isWork ? 'Consignes d\'urgence' : 'Consignes pour les secours'}</div>
            </div>
            <div className="fs-body">
              <div className="fi-field">
                <label className="fi-label">Message libre</label>
                <textarea className="fi-textarea" style={{ minHeight: 90 }} value={fiche?.consignes ?? ''} onChange={e => update('consignes', e.target.value)} placeholder={isPet ? 'Animal craintif, ne pas approcher brutalement...' : isWork ? 'En cas d\'accident sur chantier, contacter immédiatement...' : 'Ne pas laisser seul. Contacter l\'épouse avant toute décision médicale...'} />
              </div>
            </div>
          </div>

          {/* ── NFC ── */}
          {ficheRemplie && bracelet?.bracelet_id && (
            <div className="nfc-block" style={{ borderColor: `${gammeColor}30` }}>
              <div className="nfc-title">📡 Programmer mon bracelet hors ligne</div>
              <p className="nfc-desc">Pour que votre bracelet fonctionne <strong>sans réseau</strong>, programmez la puce NFC.</p>
              <div className="nfc-step">
                <div className="nfc-step-num" style={{ background: gammeColor }}>1</div>
                <div><div className="nfc-step-title">Sauvegardez votre fiche</div><div className="nfc-step-sub">Vos données sont enregistrées en ligne</div></div>
              </div>
              <div className="nfc-step">
                <div className="nfc-step-num" style={{ background: gammeColor }}>2</div>
                <div><div className="nfc-step-title">Approchez votre bracelet du téléphone</div><div className="nfc-step-sub">Les données sont écrites dans la puce en 2 secondes</div></div>
              </div>
              <button className="btn-nfc" style={{ background: gammeColor }} onClick={programNFC} disabled={nfcStatus === 'waiting'}>
                {nfcStatus === 'waiting' ? <><span className="spinner" /> En attente...</> : <>📡 Programmer ma puce maintenant</>}
              </button>
              <div className="iphone-block">
                <span className="iphone-ico">🍎</span>
                <div>
                  <div className="iphone-title">Utilisateurs iPhone</div>
                  <p className="iphone-desc">Téléchargez votre fiche et programmez avec <strong>NFC Tools</strong>.</p>
                  <div className="iphone-btns">
                    <button className="btn-iphone" onClick={handleDownloadVCard}>⬇️ Télécharger ma fiche (.vcf)</button>
                    <a href="nfctools://" className="btn-iphone">📲 Ouvrir NFC Tools</a>
                  </div>
                </div>
              </div>
              {bracelet.puce_programmee && bracelet.derniere_programmation && (
                <div style={{ textAlign: 'center', marginTop: 12, fontSize: 11, color: 'var(--stone-dark)' }}>
                  ✅ Dernière programmation : {new Date(bracelet.derniere_programmation).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              )}
            </div>
          )}

          {!ficheRemplie && (
            <div className="nfc-block" style={{ opacity: 0.5 }}>
              <div className="nfc-title">📡 Programmer mon bracelet hors ligne</div>
              <p className="nfc-desc">Remplissez et sauvegardez votre fiche pour accéder à la programmation NFC.</p>
            </div>
          )}
        </div>
      </div>

      {dirty && (
        <div className="save-bar">
          <span>⚠️ Modifications non sauvegardées</span>
          <button className="save-btn" style={{ background: gammeColor }} onClick={handleSave} disabled={saving}>
            {saving ? <><span className="spinner" /> Sauvegarde...</> : 'Sauvegarder'}
          </button>
          <button className="save-dismiss" onClick={() => setDirty(false)}>×</button>
        </div>
      )}

      {showNFCModal && (
        <div className="nfc-modal-bg">
          <div className="nfc-modal">
            <span className="nfc-modal-icon">{nfcStatus === 'success' ? '✅' : '📡'}</span>
            <div className="nfc-modal-title">{nfcStatus === 'success' ? 'Puce programmée !' : 'Prêt à programmer'}</div>
            <p className="nfc-modal-desc">{nfcStatus === 'success' ? 'Votre bracelet fonctionne maintenant hors ligne.' : 'Approchez votre bracelet Pulsmee de votre téléphone.'}</p>
            {nfcStatus !== 'success' && (
              <>
                <div className="nfc-ring">⌚</div>
                <div className="nfc-modal-status">En attente du bracelet...</div>
                <button className="btn-nfc-cancel" onClick={() => { setShowNFCModal(false); setNfcStatus('idle') }}>Annuler</button>
              </>
            )}
          </div>
        </div>
      )}

      {user && (
        <Drawer
          user={user}
          bracelets={bracelets}
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          currentPage="fiche"
          currentBraceletId={braceletIdParam}
          onToast={showToast}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  )
}
