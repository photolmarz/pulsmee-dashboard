import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

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

    // We need email addresses — the contacts have phone only. We'll send to the bracelet owner's email.
    // Get bracelet owner email
    const { data: bracelet } = await supabase
      .from('bracelets')
      .select('user_id')
      .eq('bracelet_id', bracelet_id)
      .maybeSingle()

    const recipientEmails: string[] = []

    if (bracelet?.user_id) {
      const { data: { user } } = await supabase.auth.admin.getUserById(bracelet.user_id)
      if (user?.email) recipientEmails.push(user.email)
    }

    // Also check for contact emails stored as tel (some may be email)
    for (const c of contacts) {
      if (c.tel.includes('@')) recipientEmails.push(c.tel)
    }

    if (recipientEmails.length === 0) {
      return NextResponse.json({ error: 'Aucun destinataire email trouvé' }, { status: 400 })
    }

    const scanTime = new Date().toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })

    const mapsLink = (latitude != null && longitude != null)
      ? `https://www.google.com/maps?q=${latitude},${longitude}`
      : null

    const contactsHtml = contacts.length > 0
      ? `<p><strong>Contacts d'urgence :</strong><br/>${contacts.map(c => `${c.nom} — ${c.tel}`).join('<br/>')}</p>`
      : ''

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #E8472A; color: white; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 22px;">🚨 Alerte Pulsmee</h1>
  </div>
  <div style="background: #fff8f6; border: 1px solid #f0c0b0; border-top: none; border-radius: 0 0 12px 12px; padding: 24px;">
    <p style="font-size: 16px; color: #333;">
      Le bracelet Pulsmee de <strong>${fiche.nom_complet || 'un porteur'}</strong> vient d'être scanné.<br/>
      <strong>Quelqu'un a besoin d'aide.</strong>
    </p>
    <p><strong>Heure du scan :</strong> ${scanTime}</p>
    ${mapsLink ? `<p><a href="${mapsLink}" style="background: #E8472A; color: white; padding: 10px 18px; border-radius: 8px; text-decoration: none; font-weight: bold;">📍 Voir la position sur Google Maps</a></p>` : ''}
    ${contactsHtml}
    <p style="margin-top: 20px;">
      <a href="https://pulsmee.fr/p/${bracelet_id}" style="background: #1E1A16; color: white; padding: 10px 18px; border-radius: 8px; text-decoration: none; font-weight: bold;">
        Voir la fiche médicale →
      </a>
    </p>
    <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;"/>
    <p style="font-size: 12px; color: #888;">Cet email a été envoyé automatiquement par Pulsmee suite au scan du bracelet ${bracelet_id}.</p>
  </div>
</body>
</html>`

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })

    await transporter.sendMail({
      from: `"Pulsmee Alertes" <${process.env.EMAIL_USER}>`,
      to: recipientEmails.join(', '),
      subject: `🚨 Alerte : ${fiche.nom_complet || 'un porteur'} a besoin d'aide`,
      html,
    })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
