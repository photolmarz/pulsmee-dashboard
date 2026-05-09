import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Normalise un numéro de téléphone vers le format international
function normalizePhone(tel: string, defaultCountry = 'FR'): string | null {
  const cleaned = tel.replace(/[\s\-\.()]/g, '')
  if (cleaned.startsWith('+')) return cleaned
  if (cleaned.startsWith('00')) return '+' + cleaned.slice(2)
  if (defaultCountry === 'FR') {
    if (cleaned.startsWith('0') && cleaned.length === 10) return '+33' + cleaned.slice(1)
  }
  return null
}

async function sendSMS(to: string, content: string): Promise<boolean> {
  try {
    const phone = normalizePhone(to)
    if (!phone) return false

    const res = await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: 'Pulsmee',
        recipient: phone,
        content,
        type: 'transactional',
      }),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { bracelet_id: string; latitude?: number | null; longitude?: number | null }
    const { bracelet_id, latitude, longitude } = body

    if (!bracelet_id) {
      return NextResponse.json({ error: 'bracelet_id requis' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: fiche, error: ficheError } = await supabase
      .from('fiches')
      .select('*')
      .eq('bracelet_id', bracelet_id)
      .maybeSingle()

    if (ficheError || !fiche) {
      return NextResponse.json({ error: 'Fiche introuvable' }, { status: 404 })
    }

    const contacts = [
      fiche.contact1_nom && fiche.contact1_tel ? { nom: fiche.contact1_nom, tel: fiche.contact1_tel } : null,
      fiche.contact2_nom && fiche.contact2_tel ? { nom: fiche.contact2_nom, tel: fiche.contact2_tel } : null,
      fiche.contact3_nom && fiche.contact3_tel ? { nom: fiche.contact3_nom, tel: fiche.contact3_tel } : null,
    ].filter(Boolean) as { nom: string; tel: string }[]

    if (contacts.length === 0) {
      return NextResponse.json({ error: 'Aucun contact d\'urgence défini' }, { status: 400 })
    }

    const mapsLink = (latitude != null && longitude != null)
      ? `https://maps.google.com/?q=${latitude},${longitude}`
      : null

    const nom = fiche.nom_complet || 'votre proche'

    const message = mapsLink
      ? `🚨 URGENT — ${nom} a besoin d'aide. Son bracelet Pulsmee vient d'être scanné. Position : ${mapsLink} Fiche : pulsmee.fr/p/${bracelet_id}`
      : `🚨 URGENT — ${nom} a besoin d'aide. Son bracelet Pulsmee vient d'être scanné. Fiche : pulsmee.fr/p/${bracelet_id}`

    // Envoi SMS à tous les contacts
    const results = await Promise.all(contacts.map(c => sendSMS(c.tel, message)))
    const sent = results.filter(Boolean).length

    if (sent === 0) {
      return NextResponse.json({ error: 'Échec envoi SMS — vérifiez les numéros' }, { status: 500 })
    }

    return NextResponse.json({ success: true, sent })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
