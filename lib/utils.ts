import type { Fiche, Bracelet } from '@/types'

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
