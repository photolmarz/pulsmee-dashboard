import nodemailer from 'nodemailer'

export const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER!,
    pass: process.env.GMAIL_APP_PASSWORD!,
  },
})

export function buildActivationEmail(codes: { code: string; gamme: string }[], customerName?: string): string {
  const prenom = customerName || 'cher client'
  const plural = codes.length > 1

  const codesHtml = codes.map(({ code, gamme }) => `
    <div style="margin: 12px 0; background: #1E1A16; border-radius: 12px; padding: 20px 24px; text-align: center;">
      <div style="font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #8C7B6B; margin-bottom: 8px;">
        Pulsmee ${gamme}
      </div>
      <div style="font-family: 'Courier New', monospace; font-size: 28px; font-weight: 900; letter-spacing: 6px; color: #F2724F;">
        ${code}
      </div>
    </div>
  `).join('')

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Votre code d'activation Pulsmee</title>
</head>
<body style="margin:0;padding:0;background:#F7F3EE;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F3EE;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

          <!-- Logo -->
          <tr>
            <td style="padding-bottom:32px;text-align:center;">
              <span style="font-size:22px;font-weight:900;color:#1E1A16;letter-spacing:-0.5px;">
                Puls<span style="color:#F2724F;">mee</span>
              </span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#FDFAF7;border-radius:20px;padding:36px 32px;border:1px solid #E8E0D5;">

              <h1 style="margin:0 0 8px;font-size:26px;font-weight:900;color:#1E1A16;letter-spacing:-0.5px;">
                Votre ${plural ? 'codes' : 'code'} d'activation 🎉
              </h1>
              <p style="margin:0 0 28px;font-size:15px;color:#7A6A5A;line-height:1.6;">
                Bonjour ${prenom},<br/>
                Merci pour votre commande ! Voici votre ${plural ? 'codes d\'activation' : 'code d\'activation'} Pulsmee.
              </p>

              ${codesHtml}

              <p style="margin:24px 0 8px;font-size:13px;color:#7A6A5A;line-height:1.6;">
                <strong style="color:#1E1A16;">Comment activer votre bracelet :</strong>
              </p>
              <ol style="margin:0 0 28px;padding-left:20px;font-size:13px;color:#7A6A5A;line-height:2;">
                <li>Créez votre espace sur <strong>dashboard.pulsmee.fr</strong></li>
                <li>Cliquez sur <strong>« Activer mon bracelet »</strong></li>
                <li>Entrez le code ci-dessus</li>
                <li>Remplissez votre fiche médicale</li>
              </ol>

              <a href="https://dashboard.pulsmee.fr" style="display:block;background:#E8472A;color:#FDFAF7;text-decoration:none;text-align:center;padding:14px;border-radius:100px;font-size:15px;font-weight:700;">
                Activer mon bracelet →
              </a>

              ${plural ? `<p style="margin:20px 0 0;font-size:12px;color:#8C7B6B;text-align:center;">Vous avez commandé ${codes.length} bracelets — chaque code correspond à un bracelet.<br/>Vous pouvez transférer un code à la personne à qui vous offrez le bracelet.</p>` : ''}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="font-size:11px;color:#C4B8A8;margin:0;">
                Pulsmee · Le bracelet médical NFC · <a href="https://pulsmee.fr" style="color:#F2724F;text-decoration:none;">pulsmee.fr</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}
