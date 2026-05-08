import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase-admin'
import { generateBraceletId, generateActivationCode } from '@/lib/utils'
import { transporter, buildActivationEmail } from '@/lib/mailer'

function getPulsmeeItems(lineItems: Array<{ title: string; quantity: number }>): Array<{ gamme: string; quantity: number }> {
  return lineItems
    .filter(i => i.title?.toLowerCase().includes('pulsmee'))
    .map(i => {
      const title = i.title?.toLowerCase() ?? ''
      let gamme = 'Care'
      if (title.includes('kids')) gamme = 'Kids'
      else if (title.includes('sport')) gamme = 'Sport'
      else if (title.includes('pet')) gamme = 'Pet'
      else if (title.includes('work')) gamme = 'Work'
      return { gamme, quantity: i.quantity || 1 }
    })
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  const shopifyHmac = req.headers.get('x-shopify-hmac-sha256') ?? ''
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET!
  const hmac = crypto.createHmac('sha256', secret).update(rawBody).digest('base64')

  if (hmac !== shopifyHmac) {
    return new NextResponse('Non autorisé', { status: 401 })
  }

  const order = JSON.parse(rawBody)
  const email: string = order.email || order.customer?.email
  const firstName: string = order.customer?.first_name || ''
  const lineItems: Array<{ title: string; quantity: number }> = order.line_items || []
  const shopifyOrderId = order.id?.toString() || ''
  const pulsmeeItems = getPulsmeeItems(lineItems)
  const totalQuantity = pulsmeeItems.reduce((sum, i) => sum + i.quantity, 0)

  if (!email || totalQuantity === 0) {
    return new NextResponse('OK - pas de produit Pulsmee', { status: 200 })
  }

  const supabase = createAdminClient()

  async function generateUniqueId(): Promise<string> {
    while (true) {
      const id = generateBraceletId()
      const { data } = await supabase
        .from('activation_codes')
        .select('bracelet_id')
        .eq('bracelet_id', id)
        .maybeSingle()
      if (!data) return id
    }
  }

  const generatedCodes: { code: string; gamme: string }[] = []

  for (const item of pulsmeeItems) {
    for (let i = 0; i < item.quantity; i++) {
      const code = generateActivationCode(item.gamme)
      const braceletId = await generateUniqueId()

      const { error } = await supabase.from('activation_codes').insert({
        code,
        bracelet_id: braceletId,
        gamme: item.gamme,
        shopify_order_id: shopifyOrderId,
        customer_email: email,
      })

      if (error) {
        console.error(`[webhook] Erreur création code:`, error)
      } else {
        generatedCodes.push({ code, gamme: item.gamme })
        console.log(`[webhook] ✅ Code ${code} créé pour ${email} — bracelet ${braceletId} (${item.gamme})`)
      }
    }
  }

  // Envoi email avec tous les codes
  if (generatedCodes.length > 0) {
    try {
      await transporter.sendMail({
        from: `"Pulsmee" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: `Votre code d'activation Pulsmee 🎉`,
        html: buildActivationEmail(generatedCodes, firstName),
      })
      console.log(`[webhook] ✅ Email envoyé à ${email} avec ${generatedCodes.length} code(s)`)
    } catch (err) {
      console.error(`[webhook] ❌ Erreur envoi email:`, err)
    }
  }

  return new NextResponse('OK', { status: 200 })
}
