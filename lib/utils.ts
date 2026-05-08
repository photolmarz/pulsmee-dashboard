import type { Fiche, Bracelet } from '@/types'

export const RELATION_OPTIONS = [
  { value: 'conjoint', label: 'Conjoint(e)', emoji: '💑' },
  { value: 'mere', label: 'Mère', emoji: '👩' },
  { value: 'pere', label: 'Père', emoji: '👨' },
  { value: 'soeur', label: 'Sœur', emoji: '👧' },
  { value: 'frere', label: 'Frère', emoji: '👦' },
  { value: 'fille', label: 'Fille', emoji: '👧' },
  { value: 'fils', label: 'Fils', emoji: '👦' },
  { value: 'grand_mere', label: 'Grand-mère', emoji: '👵' },
  { value: 'grand_pere', label: 'Grand-père', emoji: '👴' },
  { value: 'tante', label: 'Tante', emoji: '👩' },
  { value: 'oncle', label: 'Oncle', emoji: '👨' },
  { value: 'ami', label: 'Ami(e)', emoji: '🤝' },
  { value: 'tuteur', label: 'Tuteur légal', emoji: '🛡️' },
  { value: 'voisin', label: 'Voisin(e)', emoji: '🏠' },
  { value: 'medecin', label: 'Médecin traitant', emoji: '👨‍⚕️' },
  { value: 'autre', label: 'Autre', emoji: '👤' },
]

export function getRelationEmoji(relation: string): string {
  return RELATION_OPTIONS.find(r => r.value === relation)?.emoji ?? '👤'
}
export function getRelationLabel(relation: string): string {
  return RELATION_OPTIONS.find(r => r.value === relation)?.label ?? relation
}

const GAMME_PREFIXES: Record<string, string> = {
  'Care': 'PLMC',
  'Kids': 'PLMK',
  'Sport': 'PLMS',
  'Pet': 'PLMP',
  'Work': 'PLMW',
}

export const GAMME_COLORS: Record<string, string> = {
  'Care': '#E8472A',
  'Kids': '#9B6FD4',
  'Sport': '#2E8B6F',
  'Pet': '#E8922A',
  'Work': '#3A5F8A',
}

export function generateBraceletId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = ''
  for (let i = 0; i < 6; i++) result += chars[Math.floor(Math.random() * chars.length)]
  return result
}

export function generateActivationCode(gamme: string = 'Care'): string {
  const prefix = GAMME_PREFIXES[gamme] || 'PLMC'
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let suffix = ''
  for (let i = 0; i < 8; i++) suffix += chars[Math.floor(Math.random() * chars.length)]
  return `${prefix}-${suffix}`
}

export function calcAge(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  const birth = new Date(dateStr)
  if (isNaN(birth.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

export function buildVCard(fiche: Fiche, bracelet: Bracelet): string {
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:URGENCE · ${fiche.nom_complet || 'Porteur du bracelet'}`,
    `NOTE:GROUPE:${fiche.groupe_sanguin || '?'} | ALLERGIE:${fiche.allergies || 'Aucune connue'} | TRAITEMENT:${fiche.traitements || 'Aucun'} | CONTACT:${fiche.contact1_nom || ''} ${fiche.contact1_tel || ''}`,
  ]
  if (fiche.contact1_tel) lines.push(`TEL;TYPE=CELL:${fiche.contact1_tel}`)
  lines.push(`URL:https://pulsmee.fr/p/${bracelet.bracelet_id}`)
  lines.push('END:VCARD')
  return lines.join('\r\n')
}

export function downloadVCard(fiche: Fiche, bracelet: Bracelet): void {
  const vcard = buildVCard(fiche, bracelet)
  const blob = new Blob([vcard], { type: 'text/vcard' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `pulsmee-${bracelet.bracelet_id}.vcf`
  a.click()
  URL.revokeObjectURL(url)
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (minutes < 1) return "À l'instant"
  if (minutes < 60) return `Il y a ${minutes}min`
  if (hours < 24) return `Il y a ${hours}h`
  if (days < 7) return `Il y a ${days}j`
  return date.toLocaleDateString('fr-FR')
}

// Encode fiche data for NFC URL (offline support)
export function encodeFicheForNFC(fiche: Fiche): string {
  const data = {
    n: fiche.nom_complet || '',
    d: fiche.date_naissance || '',
    g: fiche.groupe_sanguin || '',
    a: fiche.allergies || '',
    t: fiche.traitements || '',
    p: fiche.pathologies || '',
    c1n: fiche.contact1_nom || '',
    c1t: fiche.contact1_tel || '',
    c1r: fiche.contact1_relation || '',
    c2n: fiche.contact2_nom || '',
    c2t: fiche.contact2_tel || '',
    c2r: fiche.contact2_relation || '',
    c3n: fiche.contact3_nom || '',
    c3t: fiche.contact3_tel || '',
    c3r: fiche.contact3_relation || '',
    m: fiche.medecin || '',
    mt: fiche.medecin_tel || '',
    con: fiche.consignes || '',
    esp: fiche.espece || '',
    rac: fiche.race || '',
    pos: fiche.poste || '',
    gau: fiche.guide_autisme || '',
  }
  return btoa(unescape(encodeURIComponent(JSON.stringify(data))))
}

export function decodeFicheFromNFC(encoded: string): Partial<Fiche> | null {
  try {
    const data = JSON.parse(decodeURIComponent(escape(atob(encoded))))
    return {
      nom_complet: data.n,
      date_naissance: data.d,
      groupe_sanguin: data.g,
      allergies: data.a,
      traitements: data.t,
      pathologies: data.p,
      contact1_nom: data.c1n,
      contact1_tel: data.c1t,
      contact1_relation: data.c1r || '',
      contact2_nom: data.c2n,
      contact2_tel: data.c2t,
      contact2_relation: data.c2r || '',
      contact3_nom: data.c3n || '',
      contact3_tel: data.c3t || '',
      contact3_relation: data.c3r || '',
      medecin: data.m,
      medecin_tel: data.mt,
      consignes: data.con,
      espece: data.esp,
      race: data.rac,
      poste: data.pos,
      guide_autisme: data.gau,
    }
  } catch {
    return null
  }
}
