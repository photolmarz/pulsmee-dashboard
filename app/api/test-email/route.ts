import { NextRequest, NextResponse } from 'next/server'
import { transporter, buildActivationEmail } from '@/lib/mailer'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const to = searchParams.get('to')

  if (!to) {
    return NextResponse.json({ error: 'Paramètre ?to=email requis' }, { status: 400 })
  }

  try {
    await transporter.sendMail({
      from: `"Pulsmee" <${process.env.GMAIL_USER}>`,
      to,
      subject: `Test — Votre code d'activation Pulsmee 🎉`,
      html: buildActivationEmail(
        [{ code: 'TEST1234', gamme: 'Care' }],
        'Jean'
      ),
    })
    return NextResponse.json({ success: true, message: `Email envoyé à ${to}` })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
